import { memo, useEffect, useState } from 'react'
import { ROLE_NAMES } from '../../engine/data/roster'
import { allSquares, centerOf, chebyshev, isBeacon, isBlocked, isCycling, ringOf, samePos, sizeOf } from '../../engine/rules/board'
import { safeRadius } from '../../engine/rules/events'
import { squareLuminance } from '../../engine/rules/luminance'
import type { Court, GameState, Piece, Pos } from '../../engine/rules/types'
import { visibleTo } from '../../engine/data/modifiers'
import { PieceArt } from '../../art/PieceArt'
import { BoardDefs } from '../../art/Tile'
import { getSettings } from '../../settings'
import { cellAt } from '../../engine/rules/cells'
import { CellMark } from './CellMark'
import { lumColor } from './lumColor'
import { IconShape } from '../menus/icons'
import { CAPTURE_FX } from '../../engine/data/cosmetics'
import { equippedId } from '../../shop'

/** Rotate so the Solari edge (x = 0) is at the bottom of the portrait screen. */
const toScreen = ({ x, y }: Pos, flip: boolean, size: number) =>
  flip ? { cx: size - y - 0.5, cy: x + 0.5 } : { cx: y + 0.5, cy: size - x - 0.5 }

interface Props {
  state: GameState
  selected: Piece | null
  moves: Pos[]
  /** Pieces a chosen spell may target. */
  targetIds?: string[]
  onSquare: (p: Pos) => void
  /** Pieces to spotlight: an AI piece about to move, or the two sides of an attack under review. */
  focus?: { mover?: string; target?: string }
  /** A recommended move to loop: the piece glows, a ghost of it travels from `from` to `to`, and `square` is marked. */
  hint?: { from?: Pos; to?: Pos; square?: Pos; pieceId?: string }
  /** Turn the board half a turn so the Umbral edge is at the bottom. */
  flip?: boolean
  /** Hide the enemy pieces this court cannot see under fog of war. */
  fogFor?: Court
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

export const Board = memo(function Board({ state, selected, moves, targetIds = [], onSquare, focus, hint, flip = false, fogFor }: Props) {
  const isMove = (p: Pos) => moves.some((m) => samePos(m, p))
  // A new key replays the ripple each time the day steps or the Hour turns.
  const radius = safeRadius(state)
  const size = sizeOf(state.config)
  const center = centerOf(size)
  const marks = getSettings().marks
  const activeId = selected?.id ?? focus?.mover
  const active = activeId ? state.pieces.find((pc) => pc.id === activeId)?.pos : undefined
  // A piece that vanishes between two states leaves the equipped capture effect on its square.
  const [seen, setSeen] = useState(state.pieces)
  const [falls, setFalls] = useState<{ key: string; pos: Pos }[]>([])
  if (seen !== state.pieces) {
    setSeen(state.pieces)
    const gone = seen.filter((p) => !state.pieces.some((q) => q.id === p.id))
    if (gone.length > 0 && gone.length <= 2) setFalls(gone.map((p) => ({ key: `${p.id}-${seen.length}`, pos: p.pos })))
    else if (falls.length > 0) setFalls([])
  }
  const fxId = equippedId('capture')
  const fx = CAPTURE_FX[fxId] ?? CAPTURE_FX.fade
  const rippleKey = `${state.phase}-${state.dir}-${state.eclipse}`
  return (
    <svg className="board" viewBox={`0 0 ${size} ${size}`} role="grid">
      <BoardDefs />
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
            {acting && <rect x={cx - 0.5} y={cy - 0.5} width={1} height={1} className="acting" />}
            {lum !== 0 && (
              <circle cx={cx} cy={cy} r={0.5} fill={`url(#glow-${lum > 0 ? 'solari' : 'umbral'})`}
                opacity={Math.abs(lum) / 2} className="glow" />
            )}
            <use href="#lead" x={cx} y={cy} />
            {marks && lum !== 0 && (
              <text x={cx - 0.32} y={cy - 0.3} className={`lum-mark ${lum > 0 ? 'lit' : 'dim'}`}>{(lum > 0 ? '+' : '−').repeat(Math.abs(lum))}</text>
            )}
            {isBlocked(state.config, p) && (
              <g className="wall">
                <rect x={cx - 0.44} y={cy - 0.44} width={0.88} height={0.88} rx={0.1} />
                <path d={`M${cx - 0.3},${cy - 0.1}H${cx + 0.3}M${cx - 0.3},${cy + 0.15}H${cx + 0.3}M${cx},${cy - 0.1}V${cy + 0.15}`} />
              </g>
            )}
            {(() => { const effect = cellAt(state.config, p); return effect && <CellMark effect={effect} cx={cx} cy={cy} round={state.round} /> })()}
            {cycling && (
              <rect key={rippleKey} x={cx - 0.5} y={cy - 0.5} width={1} height={1} className={`ripple ${lum >= 0 ? 'lit' : 'dim'}`}
                style={{ animationDelay: `${ringOf(p, size) * 70}ms` }} />
            )}
            {radius !== null && chebyshev(p, center) > radius && <rect x={cx - 0.5} y={cy - 0.5} width={1} height={1} className="doom" />}
            {isBeacon(p, state.config.beacons) && <circle cx={cx} cy={cy} r={0.4} className="beacon" />}
            {target && <circle cx={cx} cy={cy} r={0.46} fill="url(#move-glow)" className="move-glow" />}
            {target && <circle cx={cx} cy={cy} r={0.16} className="move-dot" />}
            {hint?.square && samePos(hint.square, p) && <circle cx={cx} cy={cy} r={0.46} fill="url(#move-glow)" className="move-glow hint-square" />}
          </g>
        )
      })}
      {state.pieces.filter((pc) => !fogFor || visibleTo(state, fogFor, pc)).map((pc) => {
        const { cx, cy } = toScreen(pc.pos, flip, size)
        const attack = isMove(pc.pos) || targetIds.includes(pc.id)
        return (
          <g key={pc.id} aria-label={`${ROLE_NAMES[pc.court][pc.role]} ${pc.hp}/${pc.maxHp}`} onClick={() => onSquare(pc.pos)} style={{ transform: `translate(${cx}px, ${cy}px)` }}
            className={`piece ${pc.court}${selected?.id === pc.id ? ' selected' : ''}${attack ? ' attackable' : ''}${pc.bound ? ' bound' : ''}${focus?.mover === pc.id ? ' mover' : ''}${focus?.target === pc.id ? ' target' : ''}`}>
            
            <circle className="halo" r={0.4} />
            <circle className="ring" r={0.4} />
            <PieceArt role={pc.role} court={pc.court} hp={pc.hp} maxHp={pc.maxHp} />
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
      {falls.map(({ key, pos }) => {
        const { cx, cy } = toScreen(pos, flip, size)
        return (
          <g key={key} className="fall" style={{ transform: `translate(${cx}px, ${cy}px)`, color: fx.colour }}>
            <circle className="fall-ring" r={fx.reach * 0.6} />
            {Array.from({ length: fx.parts }, (_, i) => (
              <line key={i} className="fall-part" x1={0.1} x2={0.26} style={{ transform: `rotate(${(360 / fx.parts) * i}deg)`, ['--reach' as string]: `${fx.reach}` }} />
            ))}
          </g>
        )
      })}
      {hint?.from && hint.to && hint.pieceId && (() => {
        const piece = state.pieces.find((x) => x.id === hint.pieceId)
        return piece && <HintGhost piece={piece} from={hint.from} to={hint.to} flip={flip} size={size} />
      })()}
    </svg>
  )
})
