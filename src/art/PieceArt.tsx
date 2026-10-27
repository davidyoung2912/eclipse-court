import type { Court, Role } from '../engine/rules/types'
import { EMBLEM, OPEN_EMBLEM, R, WEDGES } from './pieceGeometry'

export function PieceArt({ role, court }: { role: Role; court: Court }) {
  return (
    <g className={`art art-${court}`}>
      <circle className="art-rim" r={R + 0.03} />
      {WEDGES.map((d, i) => (
        <path key={i} d={d} className={`pane pane-${i % 3}`} />
      ))}
      <circle className="art-lead" r={R} />
      <circle className="art-hub" r={0.22} />
      <path d={EMBLEM[role]} className={OPEN_EMBLEM.has(role) ? 'emblem open' : 'emblem'} />
      {role === 'aura' && <circle className="emblem-ring" r={0.28} />}
    </g>
  )
}
