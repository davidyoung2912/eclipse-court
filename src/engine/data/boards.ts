import { BEACONS, defaultBeacons } from '../rules/board'
import type { CellSquare, Pos } from '../rules/types'

/** A board layout: where the beacons are, which squares are walled off and which carry a cell effect. All mirror-symmetric. */
export interface BoardVariant {
  id: string
  name: string
  text: string
  beacons: readonly Pos[]
  blocked: readonly Pos[]
  cells?: readonly CellSquare[]
}

const cell = (effect: CellSquare['effect'], ...at: [number, number][]): CellSquare[] => at.map(([x, y]) => ({ pos: { x, y }, effect }))

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
  {
    id: 'shrine',
    name: 'Shrine',
    text: 'Might cells north and south of the centre, Ward cells in front of each court, Recovery cells in the far corners.',
    beacons: BEACONS,
    blocked: [],
    cells: [...cell('might', [3, 2], [3, 4]), ...cell('ward', [2, 3], [4, 3]), ...cell('recovery', [2, 0], [4, 0], [2, 6], [4, 6])],
  },
  {
    id: 'crossroads',
    name: 'Crossroads',
    text: 'Hazard cells on the diagonals around the centre, which is Invincible on odd rounds.',
    beacons: BEACONS,
    blocked: [],
    cells: [...cell('hazard', [2, 2], [4, 2], [2, 4], [4, 4]), ...cell('invincible', [3, 3])],
  },
  {
    id: 'sanctum',
    name: 'Sanctum',
    text: 'Silence cells guard the way out of each court; Recovery cells wait on the flanks.',
    beacons: BEACONS,
    blocked: [],
    cells: [...cell('silence', [2, 3], [4, 3]), ...cell('recovery', [2, 1], [4, 1], [2, 5], [4, 5])],
  },
]

export const boardById = (id: string | undefined) => BOARDS.find((b) => b.id === id) ?? BOARDS[0]

/** The 9x9 boards. Walls and cells stay in columns 2 to 6, clear of the starting armies. */
export const GRAND_BOARDS: readonly BoardVariant[] = [
  { id: 'grand-open', name: 'Grand Open', text: 'The open 9x9 board.', beacons: defaultBeacons(9), blocked: [] },
  {
    id: 'grand-pillars',
    name: 'Grand Pillars',
    text: 'Four pillars in the middle ring and two on the long edges block movement and shots.',
    beacons: defaultBeacons(9),
    blocked: [{ x: 3, y: 3 }, { x: 5, y: 3 }, { x: 3, y: 5 }, { x: 5, y: 5 }, { x: 4, y: 2 }, { x: 4, y: 6 }],
  },
  {
    id: 'grand-shrine',
    name: 'Grand Shrine',
    text: 'Might cells north and south of the centre, Ward cells beside it, Recovery cells in the far corners of the middle.',
    beacons: defaultBeacons(9),
    blocked: [],
    cells: [...cell('might', [4, 2], [4, 6]), ...cell('ward', [3, 4], [5, 4]), ...cell('recovery', [3, 0], [5, 0], [3, 8], [5, 8])],
  },
]

export const grandBoardById = (id: string | undefined) => GRAND_BOARDS.find((b) => b.id === id) ?? GRAND_BOARDS[0]
