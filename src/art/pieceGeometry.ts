import type { Court, Role } from '../engine/rules/types'

/** Stained-glass medallion for a piece, drawn in a unit box centred on (0, 0). */
export const EMBLEM: Record<Role, string> = {
  footsoldier: 'M-0.1,-0.14H0.1V0.02Q0.1,0.14 0,0.18Q-0.1,0.14 -0.1,0.02Z',
  flier: 'M0,0.12Q-0.2,0 -0.24,-0.16Q-0.1,-0.1 0,-0.1Q0.1,-0.1 0.24,-0.16Q0.2,0 0,0.12Z',
  marksman: 'M-0.06,-0.18Q0.14,0 -0.06,0.18M-0.06,-0.18V0.18M-0.15,0H0.17M0.17,0L0.1,-0.05M0.17,0L0.1,0.05',
  bruiser: 'M-0.16,-0.17H0.16V-0.05H-0.16ZM-0.035,-0.05H0.035V0.19H-0.035Z',
  charger: 'M0.05,-0.2L-0.11,0.04H-0.01L-0.05,0.2L0.12,-0.06H0.02Z',
  aura: 'M0,-0.19L0.05,-0.05L0.19,0L0.05,0.05L0,0.19L-0.05,0.05L-0.19,0L-0.05,-0.05Z',
  leader: 'M-0.17,0.11L-0.19,-0.1L-0.09,-0.02L0,-0.15L0.09,-0.02L0.19,-0.1L0.17,0.11Z',
}

export const OPEN_EMBLEM: ReadonlySet<Role> = new Set(['marksman'])

const PANES = 8
export const R = 0.36

/** Wedge `i` of the medallion, from the centre out to the rim. */
const wedge = (i: number) => {
  const a0 = (i / PANES) * Math.PI * 2
  const a1 = ((i + 1) / PANES) * Math.PI * 2
  const pt = (a: number) => `${(Math.cos(a) * R).toFixed(3)},${(Math.sin(a) * R).toFixed(3)}`
  return `M0,0L${pt(a0)}A${R},${R} 0 0 1 ${pt(a1)}Z`
}
export const WEDGES = Array.from({ length: PANES }, (_, i) => wedge(i))

/**
 * Which panes to grey out for lost HP. Each pane stands for 1/8 of full HP, rounded in the piece's favour so a
 * living piece always keeps one. Panes go grey counter-clockwise from the top (pane 5 first, then 4, 3, ...).
 */
export function lostPanes(hp: number, maxHp: number): Set<number> {
  const kept = Math.min(PANES, Math.max(hp > 0 ? 1 : 0, Math.ceil((Math.max(0, hp) / maxHp) * PANES)))
  return new Set(Array.from({ length: PANES - kept }, (_, k) => (((5 - k) % PANES) + PANES) % PANES))
}


export const LOST_PANE = '#5d5d72'

/** Pane, emblem and hub colours per court, mirroring the board's stylesheet for contexts without it. */
export const PALETTE = {
  solari: { panes: ['#f2c55c', '#e8943a', '#fbe39a'], hub: '#fff4cf', emblem: '#3a2410' },
  umbral: { panes: ['#6a4cc0', '#3b2f8a', '#4aa6b8'], hub: '#1d1745', emblem: '#e4d8ff' },
} as const

/** The same medallion as a standalone SVG string, for drawing on a canvas. */
export function pieceArtSvg(role: Role, court: Court, lost: ReadonlySet<number> = new Set()): string {
  const pal = PALETTE[court]
  const open = OPEN_EMBLEM.has(role)
  const panes = WEDGES.map((d, i) => `<path d="${d}" fill="${lost.has(i) ? LOST_PANE : pal.panes[i % 3]}" stroke="#120d2a" stroke-width="0.018"/>`).join('')
  const ring = role === 'aura' ? `<circle r="0.28" fill="none" stroke="#120d2a" stroke-width="0.02" stroke-dasharray="0.07 0.05"/>` : ''
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-0.39 -0.39 0.78 0.78" width="256" height="256">`
    + `<circle r="${R + 0.03}" fill="#120d2a"/>${panes}<circle r="${R}" fill="none" stroke="#120d2a" stroke-width="0.025"/>`
    + `<circle r="0.22" fill="${pal.hub}" stroke="#120d2a" stroke-width="0.02"/>`
    + `<path d="${EMBLEM[role]}" fill="${open ? 'none' : pal.emblem}" stroke="${pal.emblem}" stroke-width="0.03" stroke-linejoin="round" stroke-linecap="round"/>${ring}</svg>`
}
