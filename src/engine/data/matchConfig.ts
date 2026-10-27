import { BEACONS } from '../rules/board'
import { DAY } from '../rules/luminance'
import type { MatchConfig } from '../rules/types'
import { grandBoardById } from './boards'
import { DEFAULT_LAYOUT, GRAND_LAYOUT } from './roster'

/** The classic match: today's board, army, pacing and day. */
export const DEFAULT_CONFIG: MatchConfig = {
  seed: 1,
  eclipseRound: 30,
  roundLimit: 50,
  day: DAY,
  beacons: BEACONS,
  layout: DEFAULT_LAYOUT,
  passives: true,
}

/** The classic match with any of its settings replaced. */
export function matchConfig(overrides: Partial<MatchConfig> = {}): MatchConfig {
  const config = { ...DEFAULT_CONFIG, ...overrides }
  return { ...config, seed: config.seed >>> 0 }
}

/** The Grand match: the 9x9 board with its sixteen-piece army, on one of the Grand boards (the open one by default). */
export function grandConfig(overrides: Partial<MatchConfig> = {}, boardId?: string): MatchConfig {
  const board = grandBoardById(boardId)
  return matchConfig({
    size: 9,
    layout: GRAND_LAYOUT,
    beacons: board.beacons,
    blocked: board.blocked,
    cells: board.cells,
    board: board.id,
    ...overrides,
  })
}
