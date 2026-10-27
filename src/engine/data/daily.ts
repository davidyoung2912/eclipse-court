import type { PersonalityId } from '../../ai/personality'
import { PERSONALITIES } from '../../ai/personality'
import { DIFFICULTY_LIST, type Difficulty } from '../../ai/profile'
import { newGame } from '../reducer'
import { rngNext } from '../rng'
import type { CycleId } from '../rules/luminance'
import type { GameState, MatchConfig, MatchMode } from '../rules/types'
import { boardById } from './boards'
import { dailySeed, skirmishConfig, type SetupChoice } from './setups'

/** Today's match is always played from the Solari court, so everyone starts from the same side. */
export const DAILY_COURT = 'solari'

export interface DailyMatch {
  /** The day as a `dailySeed`. */
  date: number
  config: MatchConfig
  difficulty: Difficulty
  personality: PersonalityId
  /** The rules in play, for display. */
  tags: string[]
  /** One line for the menu, such as "Hill · Fog · Reverse light". */
  blurb: string
}

const WIN_MODES: readonly { mode: MatchMode; label: string }[] = [
  { mode: 'beacons', label: 'Beacons' },
  { mode: 'leader', label: 'Capture their Leader' },
  { mode: 'score', label: 'Score race' },
  { mode: 'hill', label: 'King of the Hill' },
]
const CYCLE_CHOICES: readonly { cycle: CycleId; label: string }[] = [
  { cycle: 'standard', label: '' },
  { cycle: 'swift', label: 'Swift day' },
  { cycle: 'long', label: 'Long day' },
]
const PERSONALITY_IDS = Object.keys(PERSONALITIES) as PersonalityId[]

/** A seeded stream of values in [0, 1). */
function stream(seed: number) {
  let state = seed >>> 0
  return () => {
    const [value, next] = rngNext(state)
    state = next
    return value
  }
}

const pick = <T,>(roll: () => number, items: readonly T[]) => items[Math.floor(roll() * items.length)]

/** The match everyone gets on `date`: board and army from the day's seed, plus a win mode, rules and an AI to beat. */
export function dailyMatch(date = new Date()): DailyMatch {
  const seed = dailySeed(date)
  // A different stream from the board and army, which skirmishConfig draws from the seed itself.
  const roll = stream(seed * 31 + 7)
  const win = pick(roll, WIN_MODES)
  const cycle = pick(roll, CYCLE_CHOICES)
  const events = roll() < 0.5
  const showdown = roll() < 0.4
  const reverse = roll() < 0.4
  const difficulty = pick(roll, DIFFICULTY_LIST.filter((d) => d !== 'easy'))
  const personality = pick(roll, PERSONALITY_IDS)
  const choice: SetupChoice = { mode: 'daily', board: 'classic', winMode: win.mode, events, showdown, cycle: cycle.cycle, reverse }
  const config = skirmishConfig(choice, DAILY_COURT, seed, {}, date)
  const tags = [
    win.label,
    boardById(config.board).name,
    ...(cycle.label ? [cycle.label] : []),
    ...(events ? ['Day events'] : []),
    ...(showdown ? ['Showdown'] : []),
    ...(reverse ? ['Reverse light'] : []),
  ]
  return { date: seed, config, difficulty, personality, tags, blurb: tags.join(' · ') }
}

export const dailyGame = (match: DailyMatch): GameState => newGame(match.config)

/** True if `config` is the daily match of `date`, such as a saved game that was left half played. */
export const isDailyMatch = (config: MatchConfig, date = new Date()) => JSON.stringify(config) === JSON.stringify(dailyMatch(date).config)
