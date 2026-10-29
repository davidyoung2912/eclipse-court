import { describe, expect, it } from 'vitest'
import { validConfig } from '../serialize'
import { shuffleLayout } from './draft'
import { dailyMatch } from './daily'
import { daysLeftInMonth, featuredRuleset, FEATURED_RULESETS } from './featured'
import { ladderConfig } from './ladder'
import { DEFAULT_LAYOUT } from './roster'
import { skirmishConfig } from './setups'
import { weeklyMatch } from './weekly'

describe('featured rulesets', () => {
  it('give a month the same ruleset for every day and a different one the next month', () => {
    expect(featuredRuleset(new Date(2026, 9, 1))).toBe(featuredRuleset(new Date(2026, 9, 31)))
    expect(featuredRuleset(new Date(2026, 9, 1))).not.toBe(featuredRuleset(new Date(2026, 10, 1)))
  })
  it('cycle through every ruleset over a run of months', () => {
    const seen = new Set(Array.from({ length: FEATURED_RULESETS.length }, (_, m) => featuredRuleset(new Date(2026, m, 15)).id))
    expect(seen.size).toBe(FEATURED_RULESETS.length)
  })
  it('count the days left in the month', () => {
    expect(daysLeftInMonth(new Date(2026, 9, 28))).toBe(4)
    expect(daysLeftInMonth(new Date(2026, 9, 31))).toBe(1)
  })
  it('set the mode of the daily and the ladder, and the weekly where its modifier names none', () => {
    for (let m = 0; m < FEATURED_RULESETS.length; m++) {
      const date = new Date(2026, m, 14)
      const { rules } = featuredRuleset(date)
      const expectMode = (mode: string | undefined) => expect(mode ?? 'beacons').toBe(rules.winMode)
      expectMode(dailyMatch(date).config.mode)
      expectMode(ladderConfig(5, undefined, date).mode)
      const weekly = weeklyMatch(date)
      expect(weekly.theme.id).toBeTruthy()
      if (!weekly.modifier.rules.winMode) expectMode(weekly.config.mode)
      expect(validConfig(dailyMatch(date).config)).toBe(true)
      expect(validConfig(weekly.config)).toBe(true)
    }
  })
  it('keep the daily match stable for one date', () => {
    const a = dailyMatch(new Date(2026, 9, 28))
    expect(JSON.stringify(dailyMatch(new Date(2026, 9, 28)).config)).toBe(JSON.stringify(a.config))
  })
})

describe('shuffled layouts', () => {
  const roles = (l: readonly { role: string }[]) => l.map((p) => p.role).sort().join(',')
  it('keep the army and the Leader on the home beacon, on distinct home squares', () => {
    for (let seed = 1; seed < 40; seed++) {
      const out = shuffleLayout(DEFAULT_LAYOUT, seed)
      expect(roles(out)).toBe(roles(DEFAULT_LAYOUT))
      expect(out.find((p) => p.role === 'leader')).toMatchObject({ x: 0, y: 3 })
      expect(new Set(out.map((p) => `${p.x},${p.y}`)).size).toBe(out.length)
      expect(out.every((p) => p.x <= 1 && p.y >= 0 && p.y <= 6)).toBe(true)
    }
  })
  it('are the same for one seed and differ across seeds', () => {
    expect(shuffleLayout(DEFAULT_LAYOUT, 9)).toEqual(shuffleLayout(DEFAULT_LAYOUT, 9))
    expect(shuffleLayout(DEFAULT_LAYOUT, 9)).not.toEqual(shuffleLayout(DEFAULT_LAYOUT, 10))
  })
  it('apply to a skirmish only when asked, never to the daily or Grand board', () => {
    const plain = skirmishConfig({ mode: 'classic', board: 'classic' }, 'solari', 4)
    const dealt = skirmishConfig({ mode: 'classic', board: 'classic', shuffle: true }, 'solari', 4)
    expect(plain.layout).toEqual(DEFAULT_LAYOUT)
    expect(dealt.layout).not.toEqual(DEFAULT_LAYOUT)
    expect(validConfig(dealt)).toBe(true)
    const random = skirmishConfig({ mode: 'random', board: 'classic', shuffle: true }, 'solari', 4)
    expect(validConfig(random)).toBe(true)
    const draft = skirmishConfig({ mode: 'draft', board: 'classic', roles: ['footsoldier', 'flier'], shuffle: true }, 'solari', 4, { roles: ['bruiser'] })
    expect(validConfig(draft)).toBe(true)
    const daily = skirmishConfig({ mode: 'daily', board: 'classic', shuffle: true }, 'solari', 4)
    expect(daily.layout).toEqual(skirmishConfig({ mode: 'daily', board: 'classic' }, 'solari', 4).layout)
    const grand = skirmishConfig({ mode: 'classic', board: 'grand-open', size: 9, shuffle: true }, 'solari', 4)
    expect(grand.layout).toEqual(skirmishConfig({ mode: 'classic', board: 'grand-open', size: 9 }, 'solari', 4).layout)
  })
})
