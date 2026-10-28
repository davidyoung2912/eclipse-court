import { PERSONALITIES, type PersonalityId } from './personality'
import { DIFFICULTY_LIST, type Difficulty } from './difficulty'
import { newGame } from '../reducer'
import { rngNext } from '../rng'
import { isBlocked } from '../rules/board'
import type { CellEffect, CellSquare, GameState, MatchConfig } from '../rules/types'
import { dayIndex, skirmishConfig, dailySeed, type SetupChoice } from './setups'

/** The weekly match is always played from the Solari court, as the daily one is. */
export const WEEKLY_COURT = 'solari'

/** A rule twist that holds for one week. */
export interface WeeklyModifier {
  id: string
  name: string
  text: string
  /** Cells laid over the middle band of the board (rows 2 to 4), mirror-symmetric. */
  band?: CellEffect
  /** Other rule changes. */
  rules: Partial<Pick<SetupChoice, 'events' | 'showdown' | 'reverse' | 'cycle' | 'winMode'>>
  /** The round the Eclipse falls, where it differs from the standard. */
  eclipseRound?: number
}

export const WEEKLY_MODIFIERS: readonly WeeklyModifier[] = [
  { id: 'hazard', name: 'Scorched Field', text: 'The whole middle band of the board is Hazard ground.', band: 'hazard', rules: {} },
  { id: 'might', name: 'Warband Ground', text: 'The middle band lends Might to whoever stands on it.', band: 'might', rules: {} },
  { id: 'ward', name: 'Ward Fields', text: 'The middle band is warded; the fight is for the edges.', band: 'ward', rules: {} },
  { id: 'silence', name: 'Hush', text: 'Spells fall silent across the middle band.', band: 'silence', rules: {} },
  { id: 'recovery', name: 'Healing Springs', text: 'The middle band restores whoever rests on it.', band: 'recovery', rules: { winMode: 'score' } },
  { id: 'rush', name: 'Early Eclipse', text: 'The Eclipse falls on round 14 and the court closes in.', rules: { showdown: true }, eclipseRound: 14 },
  { id: 'storm', name: 'Storm Week', text: 'Day events strike on a swift day.', rules: { events: true, cycle: 'swift' } },
  { id: 'dusk', name: 'Backwards Dusk', text: 'The light runs the other way across a long day, and the Hill is the prize.', rules: { reverse: true, cycle: 'long', winMode: 'hill' } },
]

export interface WeeklyMatch {
  /** The Monday of the week as a `dailySeed`; identifies the week. */
  week: number
  modifier: WeeklyModifier
  config: MatchConfig
  difficulty: Difficulty
  personality: PersonalityId
  /** One line for the menu. */
  blurb: string
}

/** The Monday on or before `date`, as a `dailySeed`. */
export function weekStart(date = new Date()): number {
  const back = (date.getDay() + 6) % 7
  return dailySeed(new Date(date.getFullYear(), date.getMonth(), date.getDate() - back))
}

/** Days from `date` until the next week begins. */
export const daysLeftInWeek = (date = new Date()) => 7 - ((date.getDay() + 6) % 7)

/** Cells for every free square in rows 2 to 4 of a 7x7 board. */
function bandCells(config: MatchConfig, effect: CellEffect): CellSquare[] {
  const size = config.size ?? 7
  const cells: CellSquare[] = []
  const mid = Math.floor(size / 2)
  for (let y = mid - 1; y <= mid + 1; y++)
    for (let x = 0; x < size; x++) {
      const pos = { x, y }
      if (isBlocked(config, pos) || config.beacons.some((b) => b.x === x && b.y === y)) continue
      if (config.cells?.some((c) => c.pos.x === x && c.pos.y === y)) continue
      cells.push({ pos, effect })
    }
  return cells
}

/** The match everyone gets this week: the week's modifier on a seeded random army, against a named AI. */
export function weeklyMatch(date = new Date()): WeeklyMatch {
  const week = weekStart(date)
  const index = Math.floor(dayIndex(week) / 7)
  const modifier = WEEKLY_MODIFIERS[((index % WEEKLY_MODIFIERS.length) + WEEKLY_MODIFIERS.length) % WEEKLY_MODIFIERS.length]
  const [r1, s1] = rngNext(week * 17 + 3)
  const [r2] = rngNext(s1)
  const ids = Object.keys(PERSONALITIES) as PersonalityId[]
  const personality = ids[Math.floor(r1 * ids.length)]
  const pool = DIFFICULTY_LIST.filter((d) => d !== 'easy')
  const difficulty = pool[Math.floor(r2 * pool.length)]
  const choice: SetupChoice = { mode: 'random', board: 'classic', ...modifier.rules }
  const base = skirmishConfig(choice, WEEKLY_COURT, week)
  const config: MatchConfig = { ...base, setup: 'weekly' }
  if (modifier.eclipseRound) config.eclipseRound = modifier.eclipseRound
  if (modifier.band) config.cells = [...(base.cells ?? []), ...bandCells(base, modifier.band)]
  return { week, modifier, config, difficulty, personality, blurb: `${modifier.name}: ${modifier.text}` }
}

export const weeklyGame = (match: WeeklyMatch): GameState => newGame(match.config)

/** True if `config` is the weekly match of `date`, such as a saved game that was left half played. */
export const isWeeklyMatch = (config: MatchConfig, date = new Date()) => config.setup === 'weekly' && JSON.stringify(config) === JSON.stringify(weeklyMatch(date).config)

/** Points for a finished weekly match: a win is worth most, then speed and the pieces kept. */
export function weeklyScore(r: { won: boolean; draw: boolean; turns: number; lost: number }): number {
  if (r.draw) return 100
  if (!r.won) return 0
  return 500 + Math.max(0, 50 - r.turns) * 6 + Math.max(0, 10 - r.lost) * 20
}

