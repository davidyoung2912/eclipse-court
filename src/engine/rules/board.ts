import type { Court, Pos } from './types'

export const SIZE = 7
export const CENTER: Pos = { x: 3, y: 3 }

export const HOME_EDGE_MIDDLE: Record<Court, Pos> = {
  solari: { x: 0, y: 3 },
  umbral: { x: 6, y: 3 },
}

/** Home-edge middles (fixed), the center, and the top and bottom middles (cycling). */
export const BEACONS: readonly Pos[] = [
  HOME_EDGE_MIDDLE.solari,
  HOME_EDGE_MIDDLE.umbral,
  CENTER,
  { x: 3, y: 0 },
  { x: 3, y: 6 },
]

export const samePos = (a: Pos, b: Pos) => a.x === b.x && a.y === b.y

export const COURTS: readonly Court[] = ['solari', 'umbral']

export const otherCourt = (c: Court): Court => (c === 'solari' ? 'umbral' : 'solari')

/** King-move distance: 1 means the squares touch, diagonals included. */
export const chebyshev = (a: Pos, b: Pos) => Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y))

export const inBounds = ({ x, y }: Pos) => x >= 0 && x < SIZE && y >= 0 && y < SIZE

export const isBlocked = (config: { blocked?: readonly Pos[] }, p: Pos) => !!config.blocked?.some((b) => samePos(b, p))

export const isBeacon = (p: Pos, beacons: readonly Pos[] = BEACONS) => beacons.some((b) => samePos(b, p))

/** Steps from the center (Manhattan distance). */
export const ringOf = ({ x, y }: Pos) => Math.abs(x - CENTER.x) + Math.abs(y - CENTER.y)

const isHomeEdgeMiddle = (p: Pos) =>
  samePos(p, HOME_EDGE_MIDDLE.solari) || samePos(p, HOME_EDGE_MIDDLE.umbral)

/** The 23-square diamond that cycles: within 3 steps of the center, minus the home-edge middles. */
export const isCycling = (p: Pos) => ringOf(p) <= 3 && !isHomeEdgeMiddle(p)

/** For a fixed square, the court whose side it is. */
export function fixedCourt(p: Pos): Court | null {
  if (isCycling(p)) return null
  return p.x < CENTER.x ? 'solari' : 'umbral'
}

export function allSquares(): Pos[] {
  const out: Pos[] = []
  for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) out.push({ x, y })
  return out
}
