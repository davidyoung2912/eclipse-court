import { describe, expect, it } from 'vitest'
import { CAMPAIGN } from './engine/data/campaign'
import {
  ACHIEVEMENTS, boardUnlocked, emptyProgress, migrate, recordGame, starCount, starsEarned, STAR_FLAWLESS, STAR_SWIFT, STAR_WIN,
  totalStars, type Summary,
} from './progress'

const win = (over: Partial<Summary> = {}): Summary => ({
  won: true, draw: false, lost: 2, taken: 5, swift: false, spellsCast: 1, difficulty: 'normal', campaignIndex: 0, daily: false, ...over,
})

describe('progress', () => {
  it('awards stars for a win, a flawless win and a swift win', () => {
    expect(starsEarned(win({ won: false }))).toBe(0)
    expect(starsEarned(win())).toBe(STAR_WIN)
    expect(starsEarned(win({ lost: 0, swift: true }))).toBe(STAR_WIN | STAR_FLAWLESS | STAR_SWIFT)
    expect(starCount(STAR_WIN | STAR_SWIFT)).toBe(2)
  })

  it('keeps the best stars and unlocks the next opponent only on a win', () => {
    let p = emptyProgress()
    p = recordGame(p, win({ lost: 0 }), null).progress
    expect(p.cleared).toBe(1)
    expect(p.stars[0]).toBe(STAR_WIN | STAR_FLAWLESS)
    p = recordGame(p, win({ swift: true }), null).progress
    expect(p.stars[0]).toBe(STAR_WIN | STAR_FLAWLESS | STAR_SWIFT)
    p = recordGame(p, win({ won: false, campaignIndex: 1 }), null).progress
    expect(p.cleared).toBe(1)
    expect(p.stats).toMatchObject({ games: 3, wins: 2, losses: 1 })
    expect(totalStars(p)).toBe(3)
  })

  it('reports each achievement once', () => {
    const first = recordGame(emptyProgress(), win({ lost: 0, spellsCast: 0 }), 'code')
    expect(first.earned.map((a) => a.id)).toEqual(expect.arrayContaining(['first-win', 'flawless', 'silent']))
    expect(first.progress.last).toBe('code')
    expect(recordGame(first.progress, win({ lost: 0, spellsCast: 0 }), null).earned.map((a) => a.id)).not.toContain('first-win')
    expect(new Set(ACHIEVEMENTS.map((a) => a.id)).size).toBe(ACHIEVEMENTS.length)
  })

  it('migrates the old cleared count and survives damaged data', () => {
    const old = migrate(null, 3)
    expect(old.cleared).toBe(3)
    expect(old.stars.slice(0, 4)).toEqual([STAR_WIN, STAR_WIN, STAR_WIN, 0])
    expect(migrate(null, 99).cleared).toBe(CAMPAIGN.length)
    const round = migrate(JSON.parse(JSON.stringify(recordGame(emptyProgress(), win(), 'x').progress)))
    expect(round.cleared).toBe(1)
    expect(round.last).toBe('x')
    expect(migrate({ v: 2, cleared: 'lots', stars: [9, 'x'], stats: { games: -1 }, achievements: ['nope'] }).stars[0]).toBe(1)
    expect(migrate({ v: 2, achievements: ['nope', 'first-win'] }).achievements).toEqual(['first-win'])
  })

  it('opens boards as stars are earned', () => {
    const p = emptyProgress()
    expect(boardUnlocked(p, 'classic')).toBe(true)
    expect(boardUnlocked(p, 'pillars')).toBe(false)
    p.stars[0] = STAR_WIN | STAR_FLAWLESS
    expect(boardUnlocked(p, 'pillars')).toBe(true)
  })
})
