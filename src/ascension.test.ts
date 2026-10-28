import { beforeEach, describe, expect, it } from 'vitest'
import { ascensionSnapshot, forDay, parseAscension, recordAscension, SHARDS_ASCENSION_WIN, SHARDS_DAILY_RUN } from './ascension'

describe('parseAscension', () => {
  it('repairs junk', () => {
    expect(parseAscension(null)).toEqual({ unlocked: 0, day: 0, dayBest: 0, dayWon: false, daysWon: 0 })
    expect(parseAscension({ unlocked: 99, day: -1, dayBest: 3, dayWon: 'yes' }).unlocked).toBe(0)
    expect(parseAscension({ unlocked: 2, dayBest: 3, dayWon: true }).dayBest).toBe(3)
  })
})

describe('recordAscension', () => {
  beforeEach(() => { try { localStorage.clear() } catch { /* no storage */ } })

  it('unlocks the next level only on a win at the top unlocked level', () => {
    const start = ascensionSnapshot().unlocked
    recordAscension({ ascension: start, daily: 0 }, 9, false)
    expect(ascensionSnapshot().unlocked).toBe(start)
    const out = recordAscension({ ascension: start, daily: 0 }, 9, true)
    expect(ascensionSnapshot().unlocked).toBe(start + 1)
    expect(out.shards).toBe(SHARDS_ASCENSION_WIN * start)
  })

  it('pays the daily run once a day and resets on a new day', () => {
    const first = recordAscension({ ascension: 0, daily: 20261101 }, 9, true)
    expect(first.shards).toBe(SHARDS_DAILY_RUN)
    expect(recordAscension({ ascension: 0, daily: 20261101 }, 9, true).shards).toBe(0)
    expect(ascensionSnapshot()).toMatchObject({ day: 20261101, dayWon: true })
    expect(forDay(ascensionSnapshot(), 20261102)).toMatchObject({ dayBest: 0, dayWon: false })
  })

  it('keeps the furthest stage of the day', () => {
    recordAscension({ ascension: 0, daily: 20270105 }, 5, false)
    recordAscension({ ascension: 0, daily: 20270105 }, 3, false)
    expect(ascensionSnapshot().dayBest).toBe(5)
  })
})
