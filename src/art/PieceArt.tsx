import type { Court, Role } from '../engine/rules/types'
import { EMBLEM, lostPanes, OPEN_EMBLEM, R, WEDGES } from './pieceGeometry'

/** The medallion; with `hp` given, panes for lost HP are greyed counter-clockwise. */
export function PieceArt({ role, court, hp, maxHp }: { role: Role; court: Court; hp?: number; maxHp?: number }) {
  const lost = hp !== undefined && maxHp ? lostPanes(hp, maxHp) : null
  return (
    <g className={`art art-${court}`}>
      <circle className="art-rim" r={R + 0.03} />
      {WEDGES.map((d, i) => (
        <path key={i} d={d} className={`pane pane-${i % 3}${lost?.has(i) ? ' lost' : ''}`} />
      ))}
      <circle className="art-lead" r={R} />
      <circle className="art-hub" r={0.22} />
      <path d={EMBLEM[role]} className={OPEN_EMBLEM.has(role) ? 'emblem open' : 'emblem'} />
      {role === 'aura' && <circle className="emblem-ring" r={0.28} />}
    </g>
  )
}
