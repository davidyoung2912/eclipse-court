import { BEACONS } from '../rules/board'
import { DAY } from '../rules/luminance'
import type { MatchConfig } from '../rules/types'
import { DEFAULT_LAYOUT } from './roster'

/** The classic match: today's board, army, pacing and day. */
export const DEFAULT_CONFIG: MatchConfig = {
  seed: 1,
  eclipseRound: 30,
  roundLimit: 50,
  day: DAY,
  beacons: BEACONS,
  layout: DEFAULT_LAYOUT,
}

/** The classic match with any of its settings replaced. */
export function matchConfig(overrides: Partial<MatchConfig> = {}): MatchConfig {
  const config = { ...DEFAULT_CONFIG, ...overrides }
  return { ...config, seed: config.seed >>> 0 }
}
