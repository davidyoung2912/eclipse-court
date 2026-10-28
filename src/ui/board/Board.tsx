import { memo, useEffect, useState } from 'react'
import { ROLE_NAMES } from '../../engine/data/roster'
import { allSquares, centerOf, chebyshev, isBeacon, isBlocked, isCycling, samePos, sizeOf } from '../../engine/rules/board'
import { safeRadius } from '../../engine/rules/events'
import { squareLuminance } from '../../engine/rules/luminance'
import type { Court, GameState, Piece, Pos } from '../../engine/rules/types'
import { visibleTo } from '../../engine/data/modifiers'
import { PieceArt } from '../../art/PieceArt'
import { PALETTE, WEDGES } from '../../art/pieceGeometry'
import { BoardDefs } from '../../art/Tile'
import { getSettings } from '../../settings'
import { cellAt } from '../../engine/rules/cells'
import { CellMark } from './CellMark'
import { lumColor } from './lumColor'
import { IconShape } from '../menus/icons'
import { CAPTURE_FX } from '../../engine/data/cosmetics'
import { equippedId } from '../../shop'
import { stepCursor } from './cursor'
import { describeSquare } from '../../narrate'
import { cascadeDelay, lungeOffset, turnGlow } from '../../boardMotion'
import { rayDelay, slashEnds } from '../../boardDrama'
import { BLOOM_MS, CHARGE_MS, impactDelayMs, SPELL_FX, toScreen, TRAVEL_MS, type CastFx } from '../../spellFx'

interface Props {
  state: GameState
  selected: Piece | null
  moves: Pos[]
  /** Squares an inspected enemy piece could reach: shown in red, with any of the player's pieces there ringed. */
  threats?: Pos[]
  /** Own pieces an enemy could attack next turn: ringed in red. */
  endangered?: string[]
  /** For enemy pieces the selected piece could attack, its chance (0 to 100) of winning the duel. */
  odds?: Record<string, number>
  /** The same attack odds once the light has turned, shown under the current ones (Light forecast). */
  nextOdds?: Record<string, number>
  /** The state as the next round will find the light; squares that change are marked (Light forecast). */
  nextLight?: GameState
  /** Pieces a chosen spell may target. */
  targetIds?: string[]
  onSquare: (p: Pos) => void
  /** Pieces to spotlight: an AI piece about to move, or the two sides of an attack under review. */
  focus?: { mover?: string; target?: string }
  /** A recommended move to loop: the piece glows, a ghost of it travels from `from` to `to`, and `square` is marked. */
  hint?: { from?: Pos; to?: Pos; square?: Pos; pieceId?: string }
  /** The squares the latest move left and reached, marked when the Last move trail setting is on. */
  trail?: { from: Pos; to: Pos }
  /** Beacons the player could take this turn, ringed when the Reminders setting is on. */
  reach?: Pos[]
  /** Turn the board half a turn so the Umbral edge is at the bottom. */
  flip?: boolean
  /** Hide the enemy pieces this court cannot see under fog of war. */
  fogFor?: Court
  /** Empty squares the player could step onto to win at once: they shimmer gold. */
  winAt?: Pos[]
  /** The latest spell cast: it charges at the caster, crosses the board and blooms where it lands. */
  cast?: CastFx | null
}

/** Pause on the start square, then the same slide a real move makes, then a pause on arrival. */
const HINT_START_MS = 700
const HINT_END_MS = 1100

/** A translucent copy of a piece that slides from start to end and snaps back, in a loop. */
function HintGhost({ piece, from, to, flip, size }: { piece: Piece; from: Pos; to: Pos; flip: boolean; size: number }) {
  const [atEnd, setAtEnd] = useState(false)
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>
    const step = (end: boolean) => {
      setAtEnd(end)
      timer = setTimeout(() => step(!end), end ? HINT_END_MS : HINT_START_MS)
    }
    step(false)
    return () => clearTimeout(timer)
  }, [from.x, from.y, to.x, to.y])
  const { cx, cy } = toScreen(atEnd ? to : from, flip, size)
  return (
    <g className={`piece ${piece.court} hint-ghost${atEnd ? '' : ' snap'}`} style={{ transform: `translate(${cx}px, ${cy}px)` }}>
      <circle className="ring" r={0.4} />
      <PieceArt role={piece.role} court={piece.court} hp={piece.hp} maxHp={piece.maxHp} />
    </g>
  )
}

export const Board = memo(function Board({ state, selected, moves, threats = [], endangered = [], odds, nextOdds, nextLight, targetIds = [], onSquare, focus, hint, trail, reach, flip = false, fogFor, winAt = [], cast }: Props) {
  const isMove = (p: Pos) => moves.some((m) => samePos(m, p))
  const isThreat = (p: Pos) => threats.some((m) => samePos(m, p))
  // A new key replays the ripple each time the day steps or the Hour turns.
  const radius = safeRadius(state)
  const size = sizeOf(state.config)
  const center = centerOf(size)
  const marks = getSettings().marks
  const activeId = selected?.id ?? focus?.mover
  const active = activeId ? state.pieces.find((pc) => pc.id === activeId)?.pos : undefined
  // A piece that vanishes between two states leaves the equipped capture effect on its square.
  const [seen, setSeen] = useState(state.pieces)
  const [falls, setFalls] = useState<{ key: string; pos: Pos; role: Piece['role']; court: Court }[]>([])
  // A piece that changed square settles on arrival; the counter restarts the animation on each landing.
  const [landings, setLandings] = useState<Record<string, number>>({})
  // The latest moves, each with a comet trail from its start, an arrival puff and, on a capture, a lunge past the landing.
  const [moves_, setMoves_] = useState<{ key: string; id: string; court: Court; from: Pos; to: Pos }[]>([])
  // A capture leaves a slash across the square it took, along the way the attacker came.
  const [slashes, setSlashes] = useState<{ key: string; at: Pos; dx: number; dy: number; leader: boolean }[]>([])
  const [lunges, setLunges] = useState<Record<string, { dx: number; dy: number }>>({})
  if (seen !== state.pieces) {
    setSeen(state.pieces)
    const moved = state.pieces.filter((q) => { const old = seen.find((p) => p.id === q.id); return old && !samePos(old.pos, q.pos) })
    if (moved.length > 0) setLandings((l) => Object.fromEntries([...Object.entries(l), ...moved.map((q) => [q.id, (l[q.id] ?? 0) + 1] as const)]))
    const gone = seen.filter((p) => !state.pieces.some((q) => q.id === p.id))
    setMoves_(moved.map((q) => ({ key: `${q.id}-${seen.length}-${state.pieces.length}`, id: q.id, court: q.court, from: seen.find((p) => p.id === q.id)!.pos, to: q.pos })))
    setLunges(gone.length > 0 ? Object.fromEntries(moved.map((q) => [q.id, lungeOffset(seen.find((p) => p.id === q.id)!.pos, q.pos)])) : {})
    const duel = state.lastDuel
    const attackerFrom = duel ? seen.find((p) => p.id === duel.attackerId)?.pos : undefined
    setSlashes(duel ? gone.filter((p) => samePos(p.pos, duel.at)).map((p) => ({ key: `${p.id}-${seen.length}`, at: p.pos, ...slashEnds(attackerFrom ?? p.pos, p.pos), leader: p.role === 'leader' })) : [])
    if (gone.length > 0 && gone.length <= 2) setFalls(gone.map((p) => ({ key: `${p.id}-${seen.length}`, pos: p.pos, role: p.role, court: p.court })))
    else if (falls.length > 0) setFalls([])
  }
  const fxId = equippedId('capture')
  const fx = CAPTURE_FX[fxId] ?? CAPTURE_FX.fade
  // Keyboard play: arrows move a cursor once the board has focus, Enter or Space acts on its square.
  const [cursor, setCursor] = useState<Pos | null>(null)
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      if (cursor) { e.preventDefault(); onSquare(cursor) }
      return
    }
    const next = stepCursor(cursor ?? selected?.pos ?? { x: Math.floor(size / 2), y: Math.floor(size / 2) }, e.key, flip, size)
    if (next) { e.preventDefault(); setCursor(next) }
  }
  const rippleKey = `${state.phase}-${state.dir}-${state.eclipse}`
  return (
    <>
    <p className="sr-only" role="status" aria-live="polite">{cursor ? describeSquare(state, cursor) : ''}</p>
    <svg className="board" style={{ ['--turn-glow' as string]: turnGlow(state.turn) }} viewBox={`0 0 ${size} ${size}`} role="grid" tabIndex={0} aria-label="Board: arrow keys move, Enter selects" onKeyDown={onKey} onBlur={() => setCursor(null)}>
      <BoardDefs />
      <rect x={-0.06} y={-0.06} width={size + 0.12} height={size + 0.12} rx={0.06} className="board-glow" />
      <rect x={-0.06} y={-0.06} width={size + 0.12} height={size + 0.12} rx={0.06} className="board-frame" />
      {allSquares(size).map((p) => {
        const { cx, cy } = toScreen(p, flip, size)
        const lum = squareLuminance(state, p)
        const target = isMove(p)
        const cycling = isCycling(p, size)
        const acting = !!active && samePos(active, p)
        return (
          <g key={`${p.x}-${p.y}`} onClick={() => onSquare(p)}>
            <rect x={cx - 0.5} y={cy - 0.5} width={1} height={1} style={{ fill: lumColor(lum) }}
              className={cycling ? 'sq cycling' : 'sq fixed'} />
            {trail && samePos(trail.from, p) && <rect x={cx - 0.5} y={cy - 0.5} width={1} height={1} className="trail trail-from" />}
            {trail && samePos(trail.to, p) && <rect x={cx - 0.5} y={cy - 0.5} width={1} height={1} className="trail trail-to" />}
            {acting && <rect x={cx - 0.5} y={cy - 0.5} width={1} height={1} className="acting" />}
            {lum !== 0 && (
              <circle cx={cx} cy={cy} r={0.5} fill={`url(#glow-${lum > 0 ? 'solari' : 'umbral'})`}
                opacity={Math.abs(lum) / 2} className="glow" />
            )}
            <rect x={cx - 0.5} y={cy - 0.5} width={1} height={1} className="sq-bevel" />
            <use href="#lead" x={cx} y={cy} />
            {marks && lum !== 0 && (
              <text x={cx - 0.32} y={cy - 0.3} className={`lum-mark ${lum > 0 ? 'lit' : 'dim'}`}>{(lum > 0 ? '+' : '−').repeat(Math.abs(lum))}</text>
            )}
            {nextLight && cycling && (() => {
              const shift = squareLuminance(nextLight, p) - lum
              if (shift === 0) return null
              const up = shift > 0
              const x = cx + 0.34, y = cy + 0.34
              return <path className={`forecast ${up ? 'lit' : 'dim'}`} d={up ? `M${x - 0.1},${y + 0.07}L${x},${y - 0.09}L${x + 0.1},${y + 0.07}Z` : `M${x - 0.1},${y - 0.07}L${x},${y + 0.09}L${x + 0.1},${y - 0.07}Z`}><title>{up ? 'Lighter next round' : 'Darker next round'}</title></path>
            })()}
            {isBlocked(state.config, p) && (
              <g className="wall">
                <rect x={cx - 0.44} y={cy - 0.44} width={0.88} height={0.88} rx={0.1} />
                <path d={`M${cx - 0.3},${cy - 0.1}H${cx + 0.3}M${cx - 0.3},${cy + 0.15}H${cx + 0.3}M${cx},${cy - 0.1}V${cy + 0.15}`} />
              </g>
            )}
            {(() => { const effect = cellAt(state.config, p); return effect && <CellMark effect={effect} cx={cx} cy={cy} round={state.round} /> })()}
            {cycling && (
              <rect key={rippleKey} x={cx - 0.5} y={cy - 0.5} width={1} height={1} className={`ripple ${lum >= 0 ? 'lit' : 'dim'}`}
                style={{ animationDelay: `${rayDelay(p, size, state.dir, state.eclipse)}ms` }} />
            )}
            {radius !== null && chebyshev(p, center) > radius && <rect x={cx - 0.5} y={cy - 0.5} width={1} height={1} className="doom" />}
            {isBeacon(p, state.config.beacons) && <circle cx={cx} cy={cy} r={0.4} className="beacon" />}
            {reach?.some((b) => samePos(b, p)) && <circle cx={cx} cy={cy} r={0.47} className="beacon-reach" />}
            {target && (
              <g key={selected?.id} className="move-pop" style={{ animationDelay: `${cascadeDelay(selected?.pos, p)}ms` }}>
                <circle cx={cx} cy={cy} r={0.46} fill="url(#move-glow)" className="move-glow" />
                <circle cx={cx} cy={cy} r={0.16} className="move-dot" />
              </g>
            )}
            {isThreat(p) && <circle cx={cx} cy={cy} r={0.46} fill="url(#threat-glow)" className="move-glow" />}
            {isThreat(p) && <circle cx={cx} cy={cy} r={0.16} className="move-dot threat-dot" />}
            {winAt.some((w) => samePos(w, p)) && <rect x={cx - 0.5} y={cy - 0.5} width={1} height={1} className="win-shimmer" />}
            {hint?.square && samePos(hint.square, p) && <circle cx={cx} cy={cy} r={0.46} fill="url(#move-glow)" className="move-glow hint-square" />}
          </g>
        )
      })}
      <rect width={size} height={size} filter="url(#stone-grain)" className="board-grain" />
      <rect width={size} height={size} fill="url(#hour-wash)" className={`hour-wash ${state.eclipse ? 'eclipse' : state.dir > 0 ? 'rising' : 'waning'}`} />
      {!fogFor && moves_.map(({ key, court, from, to }) => {
        const a = toScreen(from, flip, size)
        const b = toScreen(to, flip, size)
        return (
          <g key={key} className={`move-fx ${court}`} pointerEvents="none">
            <line className="comet" x1={a.cx} y1={a.cy} x2={b.cx} y2={b.cy} pathLength={1} />
            <circle className="puff" cx={b.cx} cy={b.cy} r={0.3} />
          </g>
        )
      })}
      {!fogFor && slashes.map(({ key, at, dx, dy, leader }) => {
        const a = toScreen({ x: at.x - dx, y: at.y - dy }, flip, size)
        const b = toScreen({ x: at.x + dx, y: at.y + dy }, flip, size)
        return <line key={key} className={`slash${leader ? ' leader' : ''}`} x1={a.cx} y1={a.cy} x2={b.cx} y2={b.cy} pathLength={1} pointerEvents="none" />
      })}
      {state.pieces.filter((pc) => !fogFor || visibleTo(state, fogFor, pc)).map((pc) => {
        const { cx, cy } = toScreen(pc.pos, flip, size)
        const attack = isMove(pc.pos) || targetIds.includes(pc.id) || isThreat(pc.pos)
        return (
          <g key={pc.id} aria-label={`${ROLE_NAMES[pc.court][pc.role]} ${pc.hp}/${pc.maxHp}`} onClick={() => onSquare(pc.pos)} style={{ transform: `translate(${cx}px, ${cy}px)` }}
            className={`piece ${pc.court}${selected?.id === pc.id ? ' selected' : ''}${attack ? ' attackable' : ''}${endangered.includes(pc.id) ? ' endangered' : ''}${pc.bound ? ' bound' : ''}${focus?.mover === pc.id ? ' mover' : ''}${focus?.target === pc.id ? ' target' : ''}`}>
            
            <ellipse className="ground-shadow" cx={0.03} cy={0.3} rx={0.3} ry={0.1} />
            <g className="piece-lift">
              <g key={landings[pc.id] ?? 0} className={landings[pc.id] ? `piece-settle${lunges[pc.id] ? ' lunge' : ''}` : undefined}
                style={lunges[pc.id] ? { ['--lx' as string]: `${lunges[pc.id].dx.toFixed(3)}px`, ['--ly' as string]: `${lunges[pc.id].dy.toFixed(3)}px` } : undefined}>
                <circle className="halo" r={0.4} />
                <circle className="ring" r={0.4} />
                <PieceArt role={pc.role} court={pc.court} hp={pc.hp} maxHp={pc.maxHp} />
              </g>
            </g>
            {odds?.[pc.id] !== undefined && (
              <text className={`odds-tag ${odds[pc.id] >= 60 ? 'good' : odds[pc.id] >= 35 ? 'even' : 'bad'}`} x={0} y={-0.38}>{odds[pc.id]}%</text>
            )}
            {nextOdds?.[pc.id] !== undefined && odds?.[pc.id] !== nextOdds[pc.id] && (
              <text className="odds-tag next" x={0} y={0.5}>{`→${nextOdds[pc.id]}%`}</text>
            )}
            {pc.bound && (
              <g className="bound-badge" aria-label="Bound">
                <circle cx={0.28} cy={-0.28} r={0.15} />
                <g transform="translate(0.28 -0.28) scale(0.0125) translate(-12 -12)"><IconShape name="chain" /></g>
              </g>
            )}
            {Array.from({ length: pc.hp }, (_, i) => (
              <circle key={i} className="pip" r={0.035} cx={-((pc.hp - 1) * 0.09) / 2 + i * 0.09} cy={0.32} />
            ))}
          </g>
        )
      })}
      {cursor && (() => {
        const { cx, cy } = toScreen(cursor, flip, size)
        return <rect x={cx - 0.46} y={cy - 0.46} width={0.92} height={0.92} className="kb-cursor" />
      })()}
      {falls.map(({ key, pos, court }) => {
        const { cx, cy } = toScreen(pos, flip, size)
        return (
          <g key={key} className="fall" style={{ transform: `translate(${cx}px, ${cy}px)`, color: fx.colour }}>
            <g className={`art art-${court}`}>
              {WEDGES.map((d, i) => {
                const a = ((i + 0.5) / WEDGES.length) * Math.PI * 2
                const dist = 0.25 + fx.reach * 0.35
                return (
                  <path key={i} d={d} className={`pane pane-${i % 3} shard`}
                    style={{ ['--dx' as string]: `${(Math.cos(a) * dist).toFixed(3)}px`, ['--dy' as string]: `${(Math.sin(a) * dist).toFixed(3)}px`, ['--spin' as string]: `${(i % 2 ? 1 : -1) * (30 + i * 9)}deg`, fill: PALETTE[court].panes[i % 3] }} />
                )
              })}
            </g>
            {Array.from({ length: fx.parts }, (_, i) => (
              <line key={i} className="fall-part" x1={0.1} x2={0.26} style={{ transform: `rotate(${(360 / fx.parts) * i}deg)`, ['--reach' as string]: `${fx.reach}` }} />
            ))}
          </g>
        )
      })}
      {!fogFor && cast && (() => {
        const { style, hue } = SPELL_FX[cast.spell]
        const a = toScreen(cast.from, flip, size)
        const b = toScreen(cast.to, flip, size)
        const hit = impactDelayMs(style)
        const travels = style !== 'bloom' && !samePos(cast.from, cast.to)
        return (
          <g key={cast.key} className={`spell-fx spell-${style}`} style={{ color: hue }} pointerEvents="none">
            <circle className="spell-charge" cx={a.cx} cy={a.cy} r={0.5} style={{ animationDuration: `${CHARGE_MS}ms` }} />
            {travels && style === 'bolt' && (
              <circle className="spell-bolt" cx={a.cx} cy={a.cy} r={0.12}
                style={{ ['--sx' as string]: `${b.cx - a.cx}px`, ['--sy' as string]: `${b.cy - a.cy}px`, animationDelay: `${CHARGE_MS}ms`, animationDuration: `${TRAVEL_MS}ms` }} />
            )}
            {travels && style === 'beam' && (
              <line className="spell-beam" x1={a.cx} y1={a.cy} x2={b.cx} y2={b.cy} pathLength={1} style={{ animationDelay: `${CHARGE_MS}ms`, animationDuration: `${TRAVEL_MS + 220}ms` }} />
            )}
            <circle className="spell-bloom" cx={b.cx} cy={b.cy} r={0.55} style={{ animationDelay: `${hit}ms`, animationDuration: `${BLOOM_MS}ms` }} />
            <circle className="spell-ring" cx={b.cx} cy={b.cy} r={0.3} style={{ animationDelay: `${hit}ms`, animationDuration: `${BLOOM_MS}ms` }} />
          </g>
        )
      })()}
      {hint?.from && hint.to && hint.pieceId && (() => {
        const piece = state.pieces.find((x) => x.id === hint.pieceId)
        return piece && <HintGhost piece={piece} from={hint.from} to={hint.to} flip={flip} size={size} />
      })()}
    </svg>
    </>
  )
})
