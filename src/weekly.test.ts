import { describe, expect, it } from 'vitest'
import { daysLeftInWeek, isWeeklyMatch, weeklyGame, weeklyMatch, weeklyScore, weekStart, WEEKLY_MODIFIERS } from './engine/data/weekly'
import { decodeRecord, encodeRecord } from './engine/serialize'
import { forWeek, parseWeekly, recordWeekly, weeklySnapshot } from './weekly'

const day = (y: number, m: number, d: number) => new Date(y, m - 1, d)

describe('weekly match', () => {
  it('is the same all week and changes on Monday', () => {
    const mon = weeklyMatch(day(2026, 10, 26))
    expect(weekStart(day(2026, 10, 26))).toBe(20261026)
    expect(weekStart(day(2026, 11, 1))).toBe(20261026)
    expect(weeklyMatch(day(2026, 11, 1))).toEqual(mon)
    expect(weeklyMatch(day(2026, 11, 2)).config).not.toEqual(mon.config)
    expect(daysLeftInWeek(day(2026, 10, 26))).toBe(7)
    expect(daysLeftInWeek(day(2026, 11, 1))).toBe(1)
  })

  it('cycles through every modifier with legal cells', () => {
    const seen = new Set<string>()
    for (let i = 0; i < WEEKLY_MODIFIERS.length * 2; i++) {
      const m = weeklyMatch(day(2026, 1, 5 + 7 * i))
      seen.add(m.modifier.id)
      expect(m.difficulty).not.toBe('easy')
      const cells = m.config.cells ?? []
      const keys = cells.map((c) => `${c.pos.x},${c.pos.y}`)
      expect(new Set(keys).size).toBe(keys.length)
      if (m.modifier.band) expect(cells.length).toBeGreaterThan(5)
      expect(() => weeklyGame(m)).not.toThrow()
    }
    expect(seen.size).toBe(WEEKLY_MODIFIERS.length)
  })

  it('recognises its own config, also after a record round trip', () => {
    const d = day(2026, 10, 28)
    const m = weeklyMatch(d)
    expect(isWeeklyMatch(m.config, d)).toBe(true)
    expect(isWeeklyMatch(m.config, day(2026, 11, 3))).toBe(false)
    const back = decodeRecord(encodeRecord({ initial: weeklyGame(m), actions: [] }))
    expect(isWeeklyMatch(back!.initial.config, d)).toBe(true)
  })

  it('scores wins above draws above losses, and rewards speed and care', () => {
    const w = (turns: number, lost: number) => weeklyScore({ won: true, draw: false, turns, lost })
    expect(w(20, 0)).toBeGreaterThan(w(30, 0))
    expect(w(20, 0)).toBeGreaterThan(w(20, 3))
    expect(weeklyScore({ won: false, draw: true, turns: 10, lost: 0 })).toBeGreaterThan(weeklyScore({ won: false, draw: false, turns: 10, lost: 0 }))
    expect(w(50, 10)).toBeGreaterThan(100)
  })
})

describe('weekly store', () => {
  it('keeps the best, pays the first win once and a better win after', () => {
    const wk = 20261026
    const a = recordWeekly(wk, 600, true)
    expect(a.shards).toBe(40)
    expect(a.improved).toBe(false)
    const b = recordWeekly(wk, 500, true)
    expect(b.shards).toBe(0)
    expect(b.best).toBe(600)
    const c = recordWeekly(wk, 700, true)
    expect(c.improved).toBe(true)
    expect(c.shards).toBe(10)
    expect(weeklySnapshot()).toMatchObject({ week: wk, best: 700, attempts: 3, weeksWon: 1 })
    expect(forWeek(weeklySnapshot(), wk + 7)).toMatchObject({ best: 0, attempts: 0, paid: false, weeksWon: 1 })
  })

  it('pays nothing for a loss, and cleans bad saved data', () => {
    expect(recordWeekly(20261102, 0, false).shards).toBe(0)
    expect(parseWeekly('junk')).toMatchObject({ week: 0, best: 0, history: [] })
    expect(parseWeekly({ best: -3, history: [{ week: 'x' }, { week: 20261026, best: 5 }] }).history).toEqual([{ week: 20261026, best: 5 }])
  })
})
