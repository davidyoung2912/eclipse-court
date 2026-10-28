import { describe, expect, it } from 'vitest'
import { dailyMatch } from './daily'
import { EVENT_DAYS, EVENT_PERIOD, SEASONAL_EVENTS, seasonalEvent, withEvent } from './events'
import { weeklyMatch } from './weekly'
import { shardMultiplier } from './modifiers'
import { skirmishConfig } from './setups'

const day = (y: number, m: number, d: number) => new Date(y, m - 1, d)

describe('seasonal events', () => {
  it('run for part of each fortnight and rotate through every event', () => {
    const seen = new Set<string>()
    let quiet = 0
    for (let i = 0; i < EVENT_PERIOD * SEASONAL_EVENTS.length; i++) {
      const running = seasonalEvent(day(2026, 1, 1 + i))
      if (running) {
        seen.add(running.event.id)
        expect(running.daysLeft).toBeGreaterThanOrEqual(1)
        expect(running.daysLeft).toBeLessThanOrEqual(EVENT_DAYS)
      } else quiet++
    }
    expect(seen.size).toBe(SEASONAL_EVENTS.length)
    expect(quiet).toBe((EVENT_PERIOD - EVENT_DAYS) * SEASONAL_EVENTS.length)
  })

  it('change the config and raise the Shard multiplier only while running', () => {
    let on = 0
    for (let i = 0; i < 60; i++) {
      const date = day(2026, 3, 1 + i)
      const base = skirmishConfig({ mode: 'daily', board: 'classic' }, 'solari', 1, {}, date)
      const config = withEvent(base, date)
      if (seasonalEvent(date)) {
        on++
        expect(shardMultiplier(config, 'solari')).toBeGreaterThan(shardMultiplier(base, 'solari'))
      } else expect(config).toBe(base)
    }
    expect(on).toBeGreaterThan(0)
  })

  it('name themselves in the daily tags and hold for the whole week in the weekly match', () => {
    for (let i = 0; i < 40; i++) {
      const date = day(2026, 5, 1 + i)
      const running = seasonalEvent(date)
      expect(dailyMatch(date).tags.includes(running?.event.name ?? '\0')).toBe(!!running)
    }
    const monday = weeklyMatch(day(2026, 10, 26))
    for (let d = 26; d <= 32; d++) expect(weeklyMatch(day(2026, 10, d)).config).toEqual(monday.config)
  })
})
