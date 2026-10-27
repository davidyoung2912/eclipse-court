import type { DayEvent, GameState, MatchConfig, MatchMode } from './types'

export const EVENT_INFO: Record<DayEvent, { name: string; text: string }> = {
  flare: { name: 'Solar Flare', text: 'Light surges: every shifting square is one step brighter.' },
  gloaming: { name: 'Gloaming', text: 'Shadows creep in: every shifting square is one step darker.' },
  fog: { name: 'Fog', text: 'Long-range movers reach one square less.' },
  blight: { name: 'Blight', text: 'Nothing heals at the end of the round.' },
}

const EVENTS: readonly DayEvent[] = ['flare', 'gloaming', 'fog', 'blight']

/** How many rounds an event lasts, counted from dawn. */
export const EVENT_ROUNDS = 2

const mix = (a: number, b: number) => {
  let h = Math.imul(a ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(b + 1, 0xc2b2ae35)
  h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d)
  return (h ^ (h >>> 12)) >>> 0
}

/**
 * The event in force during `round`, or null. A pure function of the seed and the round, so a replay
 * always meets the same events. Day one is calm, and none strike once the Eclipse has fallen.
 */
export function eventAt(config: Pick<MatchConfig, 'events' | 'seed' | 'day' | 'eclipseRound'>, round: number): DayEvent | null {
  if (!config.events || round > config.eclipseRound) return null
  const len = config.day.length
  const day = Math.floor((round - 1) / len)
  if (day < 1 || (round - 1) % len >= EVENT_ROUNDS) return null
  return EVENTS[mix(config.seed >>> 0, day) % EVENTS.length]
}

/** The event that will first strike within the next round or two, for the dial's warning. */
export function nextEvent(state: Pick<GameState, 'config' | 'round'>): { event: DayEvent; in: number } | null {
  for (let i = 1; i <= 2; i++) {
    const e = eventAt(state.config, state.round + i)
    if (e && eventAt(state.config, state.round + i - 1) !== e) return { event: e, in: i }
  }
  return null
}

export const SCORE_TARGET = 20
export const HILL_TURNS = 5

export const MODE_INFO: Record<MatchMode, { name: string; text: string; goal: string }> = {
  beacons: { name: 'Beacons', text: 'Hold all five beacons at the end of your turn.', goal: 'Hold all 5 beacons' },
  leader: { name: 'Leader Capture', text: 'Defeat the enemy Leader; beacons only heal.', goal: 'Defeat the enemy Leader' },
  score: { name: 'Score Race', text: `Every round, each court scores the beacons it holds. First to ${SCORE_TARGET} wins.`, goal: `First to ${SCORE_TARGET} points` },
  hill: { name: 'King of the Hill', text: `End ${HILL_TURNS} of your turns in a row holding the centre.`, goal: `Hold the centre ${HILL_TURNS} turns` },
}

export const modeOf = (config: Pick<MatchConfig, 'mode'>): MatchMode => config.mode ?? 'beacons'

/** Damage a piece takes at the end of each round while outside the safe zone. */
export const SHRINK_DAMAGE = 3

/**
 * During the showdown, the radius (in king-move steps from the centre) of the squares still safe in
 * `state.round`; null when there is no showdown yet. Everything beyond it is hit at the end of the round.
 */
export function safeRadius(state: Pick<GameState, 'config' | 'round' | 'eclipse'>): number | null {
  if (!state.config.showdown || !state.eclipse) return null
  const elapsed = state.round - state.config.eclipseRound
  return Math.max(0, 3 - Math.floor(elapsed / 2))
}
