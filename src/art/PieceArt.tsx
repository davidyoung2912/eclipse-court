import type { Court, Role } from '../engine/rules/types'

/** Stained-glass medallion for a piece, drawn in a unit box centred on (0, 0). */
const EMBLEM: Record<Role, string> = {
  footsoldier: 'M-0.1,-0.14H0.1V0.02Q0.1,0.14 0,0.18Q-0.1,0.14 -0.1,0.02Z',
  flier: 'M0,0.12Q-0.2,0 -0.24,-0.16Q-0.1,-0.1 0,-0.1Q0.1,-0.1 0.24,-0.16Q0.2,0 0,0.12Z',
  marksman: 'M-0.06,-0.18Q0.14,0 -0.06,0.18M-0.06,-0.18V0.18M-0.15,0H0.17M0.17,0L0.1,-0.05M0.17,0L0.1,0.05',
  bruiser: 'M-0.16,-0.17H0.16V-0.05H-0.16ZM-0.035,-0.05H0.035V0.19H-0.035Z',
  charger: 'M0.05,-0.2L-0.11,0.04H-0.01L-0.05,0.2L0.12,-0.06H0.02Z',
  aura: 'M0,-0.19L0.05,-0.05L0.19,0L0.05,0.05L0,0.19L-0.05,0.05L-0.19,0L-0.05,-0.05Z',
  leader: 'M-0.17,0.11L-0.19,-0.1L-0.09,-0.02L0,-0.15L0.09,-0.02L0.19,-0.1L0.17,0.11Z',
}

const OPEN_EMBLEM: ReadonlySet<Role> = new Set(['marksman'])

const PANES = 8
const R = 0.36

/** Wedge `i` of the medallion, from the centre out to the rim. */
const wedge = (i: number) => {
  const a0 = (i / PANES) * Math.PI * 2
  const a1 = ((i + 1) / PANES) * Math.PI * 2
  const pt = (a: number) => `${(Math.cos(a) * R).toFixed(3)},${(Math.sin(a) * R).toFixed(3)}`
  return `M0,0L${pt(a0)}A${R},${R} 0 0 1 ${pt(a1)}Z`
}
const WEDGES = Array.from({ length: PANES }, (_, i) => wedge(i))

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
