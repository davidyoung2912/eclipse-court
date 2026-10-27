import { describe, expect, it } from 'vitest'
import { decodeRecord, encodeRecord } from '../serialize'
import { replay } from '../log'
import { dailyGame, dailyMatch, isDailyMatch } from './daily'
import { dailySeed, dayIndex } from './setups'

const day = (y: number, m: number, d: number) => new Date(y, m - 1, d)

describe('daily match', () => {
  it('gives the same match for a date and a different one for other dates', () => {
    const a = dailyMatch(day(2026, 10, 26))
    expect(dailyMatch(day(2026, 10, 26))).toEqual(a)
    expect(a.config.seed).toBe(dailySeed(day(2026, 10, 26)))
    const blurbs = new Set(Array.from({ length: 40 }, (_, i) => dailyMatch(day(2026, 11, 1 + i % 28)).blurb))
    expect(blurbs.size).toBeGreaterThan(10)
    expect(dailyMatch(day(2026, 10, 27)).config).not.toEqual(a.config)
  })

  it('never asks for an easy opponent and always names its rules', () => {
    for (let i = 0; i < 60; i++) {
      const m = dailyMatch(day(2026, 1, 1 + i))
      expect(m.difficulty).not.toBe('easy')
      expect(m.tags.length).toBeGreaterThanOrEqual(2)
      expect(m.blurb).toBe(m.tags.join(' · '))
      expect(m.config.setup).toBe('daily')
    }
  })

  it('recognises its own config, also after a record round trip, and no other', () => {
    const d = day(2026, 10, 26)
    const m = dailyMatch(d)
    const record = { initial: dailyGame(m), actions: [] }
    expect(isDailyMatch(record.initial.config, d)).toBe(true)
    const again = decodeRecord(encodeRecord(record))!
    expect(isDailyMatch(again.initial.config, d)).toBe(true)
    expect(replay(again)).not.toBeNull()
    expect(isDailyMatch(record.initial.config, day(2026, 10, 27))).toBe(false)
  })

  it('counts days across month, year and daylight-saving edges', () => {
    expect(dayIndex(20261101) - dayIndex(20261031)).toBe(1)
    expect(dayIndex(20270101) - dayIndex(20261231)).toBe(1)
    expect(dayIndex(20240301) - dayIndex(20240228)).toBe(2)
    expect(dayIndex(20261026) - dayIndex(20261024)).toBe(2)
  })
})
