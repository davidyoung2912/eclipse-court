import { useEffect, useState } from 'react'
import { ROLE_NAMES } from '../../engine/data/roster'
import { allSquares, CENTER, chebyshev, isBeacon, isBlocked, isCycling, ringOf, samePos, SIZE } from '../../engine/rules/board'
import { safeRadius } from '../../engine/rules/events'
import { squareLuminance } from '../../engine/rules/luminance'
import type { GameState, Piece, Pos } from '../../engine/rules/types'
import { PieceArt } from '../../art/PieceArt'
import { BoardDefs } from '../../art/Tile'
import { getSettings } from '../../settings'
import { lumColor } from './lumColor'

/** Rotate so the Solari edge (x = 0) is at the bottom of the portrait screen. */
const toScreen = ({ x, y }: Pos, flip: boolean) =>
  flip ? { cx: SIZE - y - 0.5, cy: x + 0.5 } : { cx: y + 0.5, cy: SIZE - x - 0.5 }

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
}

/** Pause on the start square, then the same slide a real move makes, then a pause on arrival. */
const HINT_START_MS = 700
const HINT_END_MS = 1100

/** A translucent copy of a piece that slides from start to end and snaps back, in a loop. */
function HintGhost({ piece, from, to, flip }: { piece: Piece; from: Pos; to: Pos; flip: boolean }) {
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
  const { cx, cy } = toScreen(atEnd ? to : from, flip)
  return (
    <g className={`piece ${piece.court} hint-ghost${atEnd ? '' : ' snap'}`} style={{ transform: `translate(${cx}px, ${cy}px)` }}>
      <circle className="ring" r={0.4} />
      <PieceArt role={piece.role} court={piece.court} />
    </g>
  )
}

export function Board({ state, selected, moves, targetIds = [], onSquare, focus, hint, flip = false }: Props) {
  const isMove = (p: Pos) => moves.some((m) => samePos(m, p))
  // A new key replays the ripple each time the day steps or the Hour turns.
  const radius = safeRadius(state)
  const marks = getSettings().marks
  const rippleKey = `${state.phase}-${state.dir}-${state.eclipse}`
  return (
    <svg className="board" viewBox={`0 0 ${SIZE} ${SIZE}`} role="grid">
      <BoardDefs />
      {allSquares().map((p) => {
        const { cx, cy } = toScreen(p, flip)
        const lum = squareLuminance(state, p)
        const target = isMove(p)
        const cycling = isCycling(p)
        return (
          <g key={`${p.x}-${p.y}`} onClick={() => onSquare(p)}>
            <rect x={cx - 0.5} y={cy - 0.5} width={1} height={1} style={{ fill: lumColor(lum) }}
              className={cycling ? 'sq cycling' : 'sq fixed'} />
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
            {cycling && (
              <rect key={rippleKey} x={cx - 0.5} y={cy - 0.5} width={1} height={1} className={`ripple ${lum >= 0 ? 'lit' : 'dim'}`}
                style={{ animationDelay: `${ringOf(p) * 70}ms` }} />
            )}
            {radius !== null && chebyshev(p, CENTER) > radius && <rect x={cx - 0.5} y={cy - 0.5} width={1} height={1} className="doom" />}
            {isBeacon(p, state.config.beacons) && <circle cx={cx} cy={cy} r={0.4} className="beacon" />}
            {target && <circle cx={cx} cy={cy} r={0.46} fill="url(#move-glow)" className="move-glow" />}
            {target && <circle cx={cx} cy={cy} r={0.16} className="move-dot" />}
            {hint?.square && samePos(hint.square, p) && <circle cx={cx} cy={cy} r={0.46} fill="url(#move-glow)" className="move-glow hint-square" />}
          </g>
        )
      })}
      {state.pieces.map((pc) => {
        const { cx, cy } = toScreen(pc.pos, flip)
        const attack = isMove(pc.pos) || targetIds.includes(pc.id)
        return (
          <g key={pc.id} onClick={() => onSquare(pc.pos)} style={{ transform: `translate(${cx}px, ${cy}px)` }}
            className={`piece ${pc.court}${selected?.id === pc.id ? ' selected' : ''}${attack ? ' attackable' : ''}${pc.bound ? ' bound' : ''}${focus?.mover === pc.id ? ' mover' : ''}${focus?.target === pc.id ? ' target' : ''}`}>
            <title>{ROLE_NAMES[pc.court][pc.role]} {pc.hp}/{pc.maxHp}</title>
            <circle className="halo" r={0.4} />
            <circle className="ring" r={0.4} />
            <PieceArt role={pc.role} court={pc.court} />
            {Array.from({ length: pc.hp }, (_, i) => (
              <circle key={i} className="pip" r={0.035} cx={-((pc.hp - 1) * 0.09) / 2 + i * 0.09} cy={0.32} />
            ))}
          </g>
        )
      })}
      {hint?.from && hint.to && hint.pieceId && (() => {
        const piece = state.pieces.find((x) => x.id === hint.pieceId)
        return piece && <HintGhost piece={piece} from={hint.from} to={hint.to} flip={flip} />
      })()}
    </svg>
  )
}
