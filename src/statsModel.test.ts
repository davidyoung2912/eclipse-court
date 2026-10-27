import { describe, expect, it } from 'vitest'
import { CAMPAIGN } from './engine/data/campaign'
import { emptyProgress, migrate, recordGame, recordPractice, recordVersus, resetStats, type Summary } from './progress'
import { overall, sections, totals } from './statsModel'

const story = { read: new Set<string>(), characters: {}, losses: {}, ending: null }
const game = (over: Partial<Summary> = {}): Summary => ({
  won: true, draw: false, lost: 1, taken: 4, turns: 12, swift: false, spellsCast: 0, difficulty: 'hard', campaignIndex: null, daily: false, ...over,
})

describe('play areas', () => {
  it('tallies each game under its area and difficulty', () => {
    let p = recordGame(emptyProgress(), game(), null, 'skirmish').progress
    p = recordGame(p, game({ won: false }), null, 'campaign').progress
    p = recordPractice(p, { attackerHp: 0, defenderHp: 2 })
    p = recordVersus(p, 'online', true)
    expect(p.areas.skirmish).toEqual({ games: 1, wins: 1, losses: 0, draws: 0 })
    expect(p.areas.campaign.losses).toBe(1)
    expect(p.areas.practice.losses).toBe(1)
    expect(p.areas.online.wins).toBe(1)
    expect(p.byDifficulty.hard.games).toBe(2)
    expect(p.stats.games).toBe(2)
  })

  it('survives a round trip, an older save and a stats reset', () => {
    const p = recordGame(emptyProgress(), game(), null, 'daily').progress
    expect(migrate(JSON.parse(JSON.stringify(p))).areas.daily.wins).toBe(1)
    expect(migrate({ ...JSON.parse(JSON.stringify(p)), areas: 'x', byDifficulty: null }).areas.daily.games).toBe(0)
    expect(resetStats(p).areas.daily.games).toBe(0)
  })
})

describe('statsModel', () => {
  it('starts every goal at nothing and reaches 100% only when all is done', () => {
    const list = sections(emptyProgress(), story, 20260101)
    expect(overall(list)).toBe(0)
    expect(list.map((s) => s.id)).toContain('practice')
    const full = { ...emptyProgress(), battles: Object.fromEntries(CAMPAIGN.map((o) => [o.id, 7])) }
    expect(sections(full, story, 20260101)[0].fraction).toBe(1)
  })

  it('reads the headline numbers', () => {
    const p = recordGame(emptyProgress(), game(), null).progress
    const t = Object.fromEntries(totals(p).map((r) => [r.label, r.value]))
    expect(t['Games played']).toBe('1')
    expect(t['Win rate']).toBe('100%')
    expect(t['Capture ratio']).toBe('4.00')
  })
})
