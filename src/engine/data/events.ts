import type { MatchConfig } from '../rules/types'
import { dailySeed, dayIndex } from './setups'

/** A limited-time twist laid over the daily and weekly matches while it runs. */
export interface SeasonalEvent {
  id: string
  name: string
  text: string
  /** Rules added to the match; the Shard multiplier counts them like any other modifier. */
  patch: Pick<MatchConfig, 'mayhem' | 'suddenDeath' | 'fog'>
}

export const SEASONAL_EVENTS: readonly SeasonalEvent[] = [
  { id: 'wild-moon', name: 'Wild Moon', text: 'Cells keep surfacing across the board.', patch: { mayhem: ['spawns'] } },
  { id: 'thieves', name: 'Thieves’ Season', text: 'Spells leap between the Leaders.', patch: { mayhem: ['thefts'] } },
  { id: 'masque', name: 'Masquerade', text: 'Pieces of a kind keep trading places.', patch: { mayhem: ['swaps'] } },
  { id: 'frost', name: 'Hard Frost', text: 'From round 20 the first kill ends the game.', patch: { suddenDeath: 20 } },
  { id: 'mist', name: 'Mist Festival', text: 'Fog hides the far side of the board.', patch: { fog: true } },
]

/** Each event begins on a fortnight boundary, runs this many days and is then followed by a quiet spell. */
export const EVENT_PERIOD = 14
export const EVENT_DAYS = 10

/** The event running on `date`, with the days left including today; none in the quiet days between events. */
export function seasonalEvent(date = new Date()): { event: SeasonalEvent; daysLeft: number } | null {
  const day = dayIndex(dailySeed(date))
  const into = ((day % EVENT_PERIOD) + EVENT_PERIOD) % EVENT_PERIOD
  if (into >= EVENT_DAYS) return null
  const n = SEASONAL_EVENTS.length
  const index = ((Math.floor(day / EVENT_PERIOD) % n) + n) % n
  return { event: SEASONAL_EVENTS[index], daysLeft: EVENT_DAYS - into }
}

/** `config` with the event on `date` laid over it; unchanged when none runs. Mayhem already in the config stays. */
export function withEvent(config: MatchConfig, date = new Date()): MatchConfig {
  const running = seasonalEvent(date)
  if (!running) return config
  const { patch } = running.event
  const mayhem = [...new Set([...(config.mayhem ?? []), ...(patch.mayhem ?? [])])]
  return {
    ...config,
    ...(mayhem.length ? { mayhem } : {}),
    ...(patch.suddenDeath ? { suddenDeath: Math.min(config.suddenDeath ?? Infinity, patch.suddenDeath) } : {}),
    ...(patch.fog ? { fog: true } : {}),
  }
}
