import { describe, expect, it } from 'vitest'
import { CAMPAIGN } from './engine/data/campaign'
import { PUZZLES, puzzlesIn } from './engine/data/puzzles'
import { SCENARIOS } from './engine/data/scenarios'
import {
  resetCampaign,
  resetPuzzles,
  resetScenarios,
  ACHIEVEMENTS, addPlaytime, resetStats, boardUnlocked, dailyResult, emptyProgress, liveStreak, migrate, recordDaily, recordGame, recordPuzzle, recordRun, recordScenario, recordTournament, starCount, starsEarned, STAR_FLAWLESS, STAR_SWIFT, STAR_WIN,
  totalStars, type Progress, type Summary,
} from './progress'

const win = (over: Partial<Summary> = {}): Summary => ({
  won: true, draw: false, lost: 2, taken: 5, turns: 12, swift: false, spellsCast: 1, difficulty: 'normal', campaignIndex: 0, daily: false, ...over,
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

  it('counts Classic games in stats but not towards full-rules achievements', () => {
    const r = recordGame(emptyProgress(), win({ spellsCast: 0, classic: true }), null)
    expect(r.progress.stats.games).toBe(1)
    expect(r.earned.map((a) => a.id)).toContain('first-win')
    expect(r.earned.map((a) => a.id)).not.toContain('silent')
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

  it('awards a tier achievement only once that tier is cleared, and never for an empty tier', () => {
    let p = emptyProgress()
    for (const z of puzzlesIn('beginner').slice(0, -1)) p = recordPuzzle(p, z.id, false).progress
    expect(p.achievements).not.toContain('beginner-cleared')
    p = recordPuzzle(p, puzzlesIn('beginner').at(-1)!.id, false).progress
    expect(p.achievements).toContain('beginner-cleared')
    if (puzzlesIn('expert').length === 0) expect(p.achievements).not.toContain('expert-cleared')
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

  it('scores only the first daily attempt of a day', () => {
    const first = recordDaily(emptyProgress(), { date: 20261026, won: true, turns: 14, lost: 2 })
    expect(first.scored).toBe(true)
    expect(first.progress.daily).toEqual({ last: { date: 20261026, won: true, turns: 14, lost: 2 }, streak: 1, best: 1 })
    const again = recordDaily(first.progress, { date: 20261026, won: false, turns: 3, lost: 9 })
    expect(again.scored).toBe(false)
    expect(again.progress).toBe(first.progress)
    expect(dailyResult(first.progress, 20261026)?.turns).toBe(14)
    expect(dailyResult(first.progress, 20261027)).toBeNull()
  })

  it('builds the day streak across month ends, drops it after a missed day and awards achievements', () => {
    const play = (p: Progress, date: number) => recordDaily(p, { date, won: false, turns: 9, lost: 4 })
    let p = play(emptyProgress(), 20261030).progress
    p = play(p, 20261031).progress
    expect(liveStreak(p, 20261031)).toBe(2)
    const third = play(p, 20261101)
    expect(third.progress.daily.streak).toBe(3)
    expect(third.earned.map((a) => a.id)).toEqual(['streak-3'])
    // Alive the next day, lapsed the day after that.
    expect(liveStreak(third.progress, 20261102)).toBe(3)
    expect(liveStreak(third.progress, 20261103)).toBe(0)
    const restart = play(third.progress, 20261103).progress
    expect(restart.daily).toMatchObject({ streak: 1, best: 3 })
  })

  it('keeps the daily record through a save, adds it to older saves and drops damaged ones', () => {
    const p = recordDaily(emptyProgress(), { date: 20261026, won: true, turns: 14, lost: 2 }).progress
    expect(migrate(JSON.parse(JSON.stringify(p))).daily).toEqual(p.daily)
    expect(migrate({ v: 3, cleared: 2 })).toMatchObject({ cleared: 2, daily: { last: null, streak: 0, best: 0 } })
    expect(migrate({ v: 4, daily: { last: { date: 'x', won: true, turns: 1, lost: 0 }, streak: 5, best: 5 } }).daily).toEqual({ last: null, streak: 0, best: 0 })
    expect(migrate({ v: 4, daily: { last: { date: 20261026, won: true, turns: 1, lost: 0 }, streak: 2, best: 1 } }).daily.best).toBe(2)
  })
})

describe('scenario progress', () => {
  it('keeps stars once earned and awards the scenario achievements', () => {
    let p = emptyProgress()
    const first = recordScenario(p, SCENARIOS[0].id, 1)
    expect(first.earned.map((a) => a.id)).toContain('scenario-first')
    p = recordScenario(first.progress, SCENARIOS[0].id, 2).progress
    expect(p.scenarios[SCENARIOS[0].id]).toBe(3)
    for (const x of SCENARIOS) p = recordScenario(p, x.id, 1).progress
    expect(p.achievements).toContain('scenario-all')
  })
  it('migrates older saves with no scenarios, and cleans a damaged record', () => {
    expect(migrate({ v: 4, cleared: 2 })).toMatchObject({ cleared: 2, scenarios: {} })
    const id = SCENARIOS[0].id
    expect(migrate({ v: 5, scenarios: { [id]: 15, nope: 7 } }).scenarios).toEqual({ [id]: 7 })
    expect(migrate({ v: 5, scenarios: { [id]: 'x' } }).scenarios).toEqual({})
  })
})

describe('resets', () => {
  const played = { ...emptyProgress(), cleared: 3, stars: [7, 3, 1, 0, 0, 0, 0, 0].slice(0, emptyProgress().stars.length), puzzles: ['a', 'b'], scenarios: { x: 7 }, achievements: ['k'] }

  it('clears puzzles only', () => {
    expect(resetPuzzles(played)).toEqual({ ...played, puzzles: [] })
  })

  it('clears scenarios only', () => {
    expect(resetScenarios(played)).toEqual({ ...played, scenarios: {} })
  })

  it('clears the campaign battles only', () => {
    const after = resetCampaign(played)
    expect(after.cleared).toBe(0)
    expect(after.stars).toEqual(emptyProgress().stars)
    expect(after.puzzles).toEqual(played.puzzles)
  })
})

describe('play time and stats reset', () => {
  it('adds seconds to the lifetime total and ignores empty amounts', () => {
    const p = addPlaytime(addPlaytime(emptyProgress(), 90), 30)
    expect(p.stats.playSeconds).toBe(120)
    expect(addPlaytime(p, 0)).toBe(p)
  })

  it('resets stats but keeps campaign progress', () => {
    const p = { ...addPlaytime(emptyProgress(), 50), cleared: 3, achievements: ['champion'], last: 'x' }
    const r = resetStats(p)
    expect(r.stats).toEqual(emptyProgress().stats)
    expect(r.achievements).toEqual([])
    expect(r.last).toBeNull()
    expect(r.cleared).toBe(3)
  })

  it('migrates a v5 save without play time', () => {
    const { playSeconds: _, ...old } = emptyProgress().stats
    expect(migrate({ ...emptyProgress(), stats: old }).stats.playSeconds).toBe(0)
  })
})
