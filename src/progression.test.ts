import { describe, expect, it } from 'vitest'
import { courtRank, glintOf, stampWeek } from './progression'

describe('court rank', () => {
  it('starts as Squire and climbs with levels', () => {
    expect(courtRank(0)).toMatchObject({ tier: 0, name: 'Squire', toNext: 4, fraction: 0 })
    expect(courtRank(4).name).toBe('Knight')
    expect(courtRank(7)).toMatchObject({ tier: 1, toNext: 3 })
  })
  it('tops out at Archon', () => {
    expect(courtRank(48)).toMatchObject({ name: 'Archon', toNext: null, fraction: 1 })
  })
})

describe('glint', () => {
  it('skips Common and quickens with rarity', () => {
    expect(glintOf('common')).toBeNull()
    expect(glintOf('legend')!.period).toBeLessThan(glintOf('uncommon')!.period)
    expect(glintOf('legend')!.strength).toBeGreaterThan(glintOf('rare')!.strength)
  })
})

describe('stamp week', () => {
  it('lists seven days ending today, across a month end', () => {
    const week = stampWeek(20261102, null, 0)
    expect(week.map((d) => d.date)).toEqual([20261027, 20261028, 20261029, 20261030, 20261031, 20261101, 20261102])
    expect(week.filter((d) => d.stamped)).toHaveLength(0)
    expect(week[6].today).toBe(true)
  })
  it('stamps the streak days ending at the last attempt', () => {
    const week = stampWeek(20261028, 20261028, 3)
    expect(week.filter((d) => d.stamped).map((d) => d.date)).toEqual([20261026, 20261027, 20261028])
  })
  it('leaves today open when the streak ended yesterday', () => {
    const week = stampWeek(20261028, 20261027, 2)
    expect(week[6].stamped).toBe(false)
    expect(week[5].stamped).toBe(true)
  })
})
