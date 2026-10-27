import { describe, expect, it } from 'vitest'
import { CAMPAIGN } from './engine/data/campaign'
import { PUZZLES } from './engine/data/puzzles'
import {
  ACHIEVEMENTS, boardUnlocked, emptyProgress, migrate, recordGame, recordPuzzle, recordRun, recordTournament, starCount, starsEarned, STAR_FLAWLESS, STAR_SWIFT, STAR_WIN,
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

  it('records solved puzzles once and awards their achievements', () => {
    let p = emptyProgress()
    let r = recordPuzzle(p, PUZZLES[0].id, false)
    expect(r.progress.puzzles).toEqual([PUZZLES[0].id])
    expect(r.earned).toEqual([])
    p = recordPuzzle(r.progress, PUZZLES[0].id, true).progress
    expect(p.puzzles).toEqual([PUZZLES[0].id])
    expect(p.achievements).toContain('daily-puzzle')
    for (const z of PUZZLES) p = recordPuzzle(p, z.id, false).progress
    expect(p.achievements).toEqual(expect.arrayContaining(['puzzler', 'puzzle-master']))
    expect(p.stats.games).toBe(0)
  })

  it('counts only won series as titles', () => {
    const lost = recordTournament(emptyProgress(), false)
    expect(lost.progress.tournaments).toBe(0)
    expect(lost.earned).toEqual([])
    const won = recordTournament(lost.progress, true)
    expect(won.progress.tournaments).toBe(1)
    expect(won.earned.map((a) => a.id)).toEqual(['champion'])
  })

  it('keeps puzzles and titles through a save, and drops unknown puzzle ids', () => {
    const p = recordTournament(recordPuzzle(emptyProgress(), PUZZLES[1].id, false).progress, true).progress
    const round = migrate(JSON.parse(JSON.stringify(p)))
    expect(round.puzzles).toEqual([PUZZLES[1].id])
    expect(round.tournaments).toBe(1)
    expect(migrate({ v: 2, puzzles: ['nope', PUZZLES[0].id], tournaments: -3 })).toMatchObject({ puzzles: [PUZZLES[0].id], tournaments: 0 })
    expect(migrate({ v: 2 }).puzzles).toEqual([])
  })

  it('keeps a version-2 save, adding an empty gauntlet record', () => {
    const v2 = { v: 2, cleared: 3, stars: [7, 1, 0], stats: { games: 9, wins: 5 }, achievements: ['first-win'], puzzles: [], tournaments: 1, last: 'x' }
    const p = migrate(v2)
    expect(p).toMatchObject({ cleared: 3, tournaments: 1, last: 'x', gauntlet: { runs: 0, won: 0, best: 0 } })
    expect(p.stats.games).toBe(9)
    expect(p.achievements).toEqual(['first-win'])
    expect(migrate({ v: 3, gauntlet: { runs: 2, won: 1, best: 8, junk: 5 } }).gauntlet).toEqual({ runs: 2, won: 1, best: 8 })
    expect(migrate({ v: 3, gauntlet: { runs: -1, best: 'x' } }).gauntlet).toEqual({ runs: 0, won: 0, best: 0 })
  })

  it('records gauntlet runs and their achievements', () => {
    const lost = recordRun(emptyProgress(), 5, false)
    expect(lost.progress.gauntlet).toEqual({ runs: 1, won: 0, best: 5 })
    expect(lost.earned.map((a) => a.id)).toEqual(['deep'])
    const early = recordRun(lost.progress, 2, false).progress
    expect(early.gauntlet).toEqual({ runs: 2, won: 0, best: 5 })
    const won = recordRun(early, 9, true)
    expect(won.progress.gauntlet).toEqual({ runs: 3, won: 1, best: 8 })
    expect(won.earned.map((a) => a.id)).toEqual(['gauntlet'])
    expect(won.progress.stats.games).toBe(0)
  })
})
