import type { SetupChoice } from './setups'

/** A mode and a twist that colour the daily, weekly and ladder games for one calendar month. */
export interface FeaturedRuleset {
  id: string
  name: string
  text: string
  rules: Required<Pick<SetupChoice, 'winMode'>> & Partial<Pick<SetupChoice, 'events' | 'showdown' | 'cycle' | 'reverse'>>
}

export const FEATURED_RULESETS: readonly FeaturedRuleset[] = [
  { id: 'hill-month', name: 'Hill Month', text: 'Hold the centre of the court.', rules: { winMode: 'hill' } },
  { id: 'long-dusk', name: 'Long Dusk', text: 'A long day ending in an Eclipse showdown.', rules: { winMode: 'beacons', cycle: 'long', showdown: true } },
  { id: 'swift-sun', name: 'Swift Sun', text: 'A swift day and a race for beacon points.', rules: { winMode: 'score', cycle: 'swift' } },
  { id: 'leader-hunt', name: 'Leader Hunt', text: 'Capture the enemy Leader while day events strike.', rules: { winMode: 'leader', events: true } },
  { id: 'backlight', name: 'Backlight', text: 'The light runs backward and the Hill is the prize.', rules: { winMode: 'hill', reverse: true } },
  { id: 'score-storm', name: 'Score Storm', text: 'A beacon points race through swift days of events.', rules: { winMode: 'score', events: true, cycle: 'swift' } },
  { id: 'beacon-rite', name: 'Beacon Rite', text: 'Hold every beacon on a long day of events.', rules: { winMode: 'beacons', events: true, cycle: 'long' } },
  { id: 'mirror-moon', name: 'Mirror Moon', text: 'Capture the Leader under backward light.', rules: { winMode: 'leader', reverse: true } },
  { id: 'eclipse-tide', name: 'Eclipse Tide', text: 'Reversed light and an Eclipse showdown.', rules: { winMode: 'beacons', reverse: true, showdown: true } },
  { id: 'rush-hour', name: 'Rush Hour', text: 'A swift day, a score race and the showdown close behind.', rules: { winMode: 'score', cycle: 'swift', showdown: true } },
]

/** The month of `date` as a running count, so every month has the next ruleset and the same one for everyone. */
const monthIndex = (date: Date) => date.getFullYear() * 12 + date.getMonth()

/** The ruleset featured in the month of `date`. */
export function featuredRuleset(date = new Date()): FeaturedRuleset {
  const n = FEATURED_RULESETS.length
  return FEATURED_RULESETS[((monthIndex(date) % n) + n) % n]
}

/** Days from `date` to the first of next month, counting today. */
export const daysLeftInMonth = (date = new Date()) =>
  new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate() - date.getDate() + 1
