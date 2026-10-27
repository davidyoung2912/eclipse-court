import type { BoardSize, Court, Pos } from './types'

/** The standard board is 7x7. */
export const DEFAULT_SIZE = 7

export const BOARD_SIZES: readonly BoardSize[] = [7, 9]

/** The standard 7x7 board's constants; code that knows its match uses `sizeOf` and the helpers below instead. */
export const SIZE = DEFAULT_SIZE

/** The board size of a match; the standard 7 when the config does not say. */
export const sizeOf = (config: { size?: BoardSize }): number => config.size ?? DEFAULT_SIZE

/** The middle square, on both axes. */
export const centerOf = (size: number = DEFAULT_SIZE): Pos => ({ x: (size - 1) / 2, y: (size - 1) / 2 })

export const CENTER: Pos = centerOf()

/** The middle of each court's home edge. */
export const homeEdgeMiddles = (size: number = DEFAULT_SIZE): Record<Court, Pos> => ({
  solari: { x: 0, y: (size - 1) / 2 },
  umbral: { x: size - 1, y: (size - 1) / 2 },
})

export const HOME_EDGE_MIDDLE = homeEdgeMiddles()

/** Home-edge middles (fixed), the center, and the top and bottom middles (cycling). */
export const defaultBeacons = (size: number = DEFAULT_SIZE): readonly Pos[] => {
  const edges = homeEdgeMiddles(size)
  const mid = (size - 1) / 2
  return [edges.solari, edges.umbral, centerOf(size), { x: mid, y: 0 }, { x: mid, y: size - 1 }]
}

export const BEACONS: readonly Pos[] = defaultBeacons()

export const samePos = (a: Pos, b: Pos) => a.x === b.x && a.y === b.y

export const COURTS: readonly Court[] = ['solari', 'umbral']

export const otherCourt = (c: Court): Court => (c === 'solari' ? 'umbral' : 'solari')

/** King-move distance: 1 means the squares touch, diagonals included. */
export const chebyshev = (a: Pos, b: Pos) => Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y))

export const inBounds = ({ x, y }: Pos, size: number = DEFAULT_SIZE) => x >= 0 && x < size && y >= 0 && y < size

export const isBlocked = (config: { blocked?: readonly Pos[] }, p: Pos) => !!config.blocked?.some((b) => samePos(b, p))

export const isBeacon = (p: Pos, beacons: readonly Pos[] = BEACONS) => beacons.some((b) => samePos(b, p))

/** Steps from the center (Manhattan distance). */
export const ringOf = ({ x, y }: Pos, size: number = DEFAULT_SIZE) => {
  const c = centerOf(size)
  return Math.abs(x - c.x) + Math.abs(y - c.y)
}

/** How far from the center the light still cycles: 3 on the 7x7 board, 4 on the 9x9. */
export const cyclingRadius = (size: number = DEFAULT_SIZE) => (size - 1) / 2

const isHomeEdgeMiddle = (p: Pos, size: number) => {
  const edges = homeEdgeMiddles(size)
  return samePos(p, edges.solari) || samePos(p, edges.umbral)
}

/** The diamond that cycles (23 squares on 7x7): within the cycling radius of the center, minus the home-edge middles. */
export const isCycling = (p: Pos, size: number = DEFAULT_SIZE) => ringOf(p, size) <= cyclingRadius(size) && !isHomeEdgeMiddle(p, size)

/** For a fixed square, the court whose side it is. */
export function fixedCourt(p: Pos, size: number = DEFAULT_SIZE): Court | null {
  if (isCycling(p, size)) return null
  return p.x < centerOf(size).x ? 'solari' : 'umbral'
}

/** The square a position is reflected to across the board, from one court's side to the other's. */
export const mirrorOf = ({ x, y }: Pos, size: number = DEFAULT_SIZE): Pos => ({ x: size - 1 - x, y })

export function allSquares(size: number = DEFAULT_SIZE): Pos[] {
  const out: Pos[] = []
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) out.push({ x, y })
  return out
}
