import { BEACONS } from '../rules/board'
import type { Pos } from '../rules/types'

/** A board layout: where the beacons are and which squares are walled off. Both are mirror-symmetric. */
export interface BoardVariant {
  id: string
  name: string
  text: string
  beacons: readonly Pos[]
  blocked: readonly Pos[]
}

export const BOARDS: readonly BoardVariant[] = [
  { id: 'classic', name: 'Classic', text: 'The open board.', beacons: BEACONS, blocked: [] },
  {
    id: 'pillars',
    name: 'Pillars',
    text: 'Four pillars around the centre block movement and shots.',
    beacons: BEACONS,
    blocked: [{ x: 2, y: 2 }, { x: 4, y: 2 }, { x: 2, y: 4 }, { x: 4, y: 4 }],
  },
  {
    id: 'flanks',
    name: 'Flanks',
    text: 'The outer beacons sit nearer the middle, on the flanks.',
    beacons: [{ x: 0, y: 3 }, { x: 6, y: 3 }, { x: 3, y: 3 }, { x: 3, y: 1 }, { x: 3, y: 5 }],
    blocked: [],
  },
  {
    id: 'ruins',
    name: 'Ruins',
    text: 'Fallen walls close the centre off from north and south.',
    beacons: BEACONS,
    blocked: [{ x: 3, y: 2 }, { x: 3, y: 4 }],
  },
]

export const boardById = (id: string | undefined) => BOARDS.find((b) => b.id === id) ?? BOARDS[0]
