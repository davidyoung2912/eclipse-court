import { CELL_EFFECTS, CELL_INFO } from '../../engine/rules/cells'
import type { CellSquare } from '../../engine/rules/types'

/** A key to the cell tints on this board; renders nothing on boards without cells. */
export function CellLegend({ cells }: { cells?: readonly CellSquare[] }) {
  const present = CELL_EFFECTS.filter((e) => cells?.some((c) => c.effect === e))
  if (!present.length) return null
  return (
    <ul className="cell-legend" aria-label="Cell effects">
      {present.map((e) => (
        <li key={e} className={`cell-${e}`} title={CELL_INFO[e].text}><i />{CELL_INFO[e].name}</li>
      ))}
    </ul>
  )
}
