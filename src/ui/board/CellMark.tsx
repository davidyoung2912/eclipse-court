import { CELL_INFO, invincibleOn } from '../../engine/rules/cells'
import type { CellEffect } from '../../engine/rules/types'

/** Shapes drawn in a 1 x 1 square centred on the origin; one glyph per effect, tinted by the `cell-<effect>` class. */
const GLYPH: Record<CellEffect, string> = {
  might: 'M0,-0.24L0.2,0.14H-0.2Z',
  ward: 'M-0.17,-0.2H0.17V0.04L0,0.22L-0.17,0.04Z',
  recovery: 'M-0.05,-0.2H0.05V-0.05H0.2V0.05H0.05V0.2H-0.05V0.05H-0.2V-0.05H-0.05Z',
  hazard: 'M-0.2,-0.17L0.2,0.17M0.2,-0.17L-0.2,0.17',
  silence: 'M-0.2,0H0.2',
  invincible: 'M0,-0.22L0.2,0L0,0.22L-0.2,0Z',
}

/** The tint, glyph and tooltip of a cell effect; Invincibility is drawn faint on even rounds, when it protects nothing. */
export function CellMark({ effect, cx, cy, round }: { effect: CellEffect; cx: number; cy: number; round: number }) {
  const dormant = effect === 'invincible' && !invincibleOn(round)
  const info = CELL_INFO[effect]
  return (
    <g className={`cell cell-${effect}${dormant ? ' dormant' : ''}`} transform={`translate(${cx} ${cy})`}>
      <title>{`${info.name}${effect === 'invincible' ? (dormant ? ' (dormant this round)' : ' (active this round)') : ''}: ${info.text}`}</title>
      <rect x={-0.44} y={-0.44} width={0.88} height={0.88} rx={0.1} className="cell-tint" />
      <path d={GLYPH[effect]} className="cell-glyph" transform="translate(0.27 -0.27) scale(0.6)" />
    </g>
  )
}
