import { ROLE_NAMES } from '../../engine/data/roster'
import { allSquares, isBeacon, isCycling, SIZE } from '../../engine/rules/board'
import { squareLuminance } from '../../engine/rules/luminance'
import type { GameState, Piece, Pos } from '../../engine/rules/types'
import { lumColor } from './lumColor'

const GLYPH: Record<Piece['role'], string> = {
  footsoldier: 'F', flier: 'W', marksman: 'M', bruiser: 'B', charger: 'C', aura: 'A', leader: 'L',
}

/** Rotate so the Solari edge (x = 0) is at the bottom of the portrait screen. */
const toScreen = ({ x, y }: Pos) => ({ cx: y + 0.5, cy: SIZE - x - 0.5 })

interface Props {
  state: GameState
  selected: Piece | null
  moves: Pos[]
  onSquare: (p: Pos) => void
}

export function Board({ state, selected, moves, onSquare }: Props) {
  const isMove = (p: Pos) => moves.some((m) => m.x === p.x && m.y === p.y)
  return (
    <svg className="board" viewBox={`0 0 ${SIZE} ${SIZE}`} role="grid">
      {allSquares().map((p) => {
        const { cx, cy } = toScreen(p)
        const lum = squareLuminance(state, p)
        const target = isMove(p)
        return (
          <g key={`${p.x}-${p.y}`} onClick={() => onSquare(p)}>
            <rect x={cx - 0.5} y={cy - 0.5} width={1} height={1} style={{ fill: lumColor(lum) }}
              className={isCycling(p) ? 'sq cycling' : 'sq fixed'} />
            {isBeacon(p) && <circle cx={cx} cy={cy} r={0.4} className="beacon" />}
            {target && <circle cx={cx} cy={cy} r={0.16} className="move-dot" />}
          </g>
        )
      })}
      {state.pieces.map((pc) => {
        const { cx, cy } = toScreen(pc.pos)
        const attack = isMove(pc.pos)
        return (
          <g key={pc.id} onClick={() => onSquare(pc.pos)} className={`piece ${pc.court}${selected?.id === pc.id ? ' selected' : ''}${attack ? ' attackable' : ''}`}>
            <title>{ROLE_NAMES[pc.court][pc.role]} {pc.hp}/{pc.maxHp}</title>
            <circle cx={cx} cy={cy} r={0.36} />
            <text x={cx} y={cy + 0.12} textAnchor="middle" className="glyph">{GLYPH[pc.role]}</text>
            {Array.from({ length: pc.hp }, (_, i) => (
              <circle key={i} className="pip" r={0.035}
                cx={cx - ((pc.hp - 1) * 0.09) / 2 + i * 0.09} cy={cy + 0.32} />
            ))}
          </g>
        )
      })}
    </svg>
  )
}
