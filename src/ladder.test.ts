import { describe, expect, it } from 'vitest'
import {
  expectedScore, foeById, kFactor, ladderGame, LADDER_FOES, MIN_RATING, nextRating, rankOf, RANKS, START_RATING, suggestFoe,
} from './engine/data/ladder'
import { parseLadder, recordLadder, ladderSnapshot, SEASON_MIN_GAMES, SEASON_SHARDS, seasonHistory, seasonReward, seasonStart, startSeason, SHARDS_LADDER_RANK, SHARDS_LADDER_WIN } from './ladder'

describe('ladder maths', () => {
  it('has five distinct foes in every rank, weakest first', () => {
    expect(LADDER_FOES).toHaveLength(RANKS.length * 5)
    expect(new Set(LADDER_FOES.map((f) => f.id)).size).toBe(LADDER_FOES.length)
    for (const r of RANKS) expect(LADDER_FOES.filter((f) => rankOf(f.rating) === r.title)).toHaveLength(5)
    const ratings = LADDER_FOES.map((f) => f.rating)
    expect(ratings).toEqual([...ratings].sort((a, b) => a - b))
  })

  it('expects an even match at equal ratings and favours the stronger', () => {
    expect(expectedScore(1000, 1000)).toBeCloseTo(0.5)
    expect(expectedScore(1200, 1000)).toBeGreaterThan(0.5)
    expect(expectedScore(1000, 1200)).toBeLessThan(0.5)
  })

  it('pays more for beating a stronger foe and settles after ten games', () => {
    expect(nextRating(1000, 1400, 1, 20) - 1000).toBeGreaterThan(nextRating(1000, 800, 1, 20) - 1000)
    expect(nextRating(1000, 1000, 0.5, 20)).toBe(1000)
    expect(kFactor(0)).toBeGreaterThan(kFactor(10))
    expect(nextRating(MIN_RATING, 1400, 0, 20)).toBe(MIN_RATING)
  })

  it('suggests the closest foe', () => {
    for (const f of LADDER_FOES) expect(suggestFoe(f.rating).rating).toBe(f.rating)
    expect(suggestFoe(0).id).toBe(LADDER_FOES[0].id)
    expect(suggestFoe(5000).id).toBe(LADDER_FOES[LADDER_FOES.length - 1].id)
  })

  it('names ranks in rating order', () => {
    expect(RANKS.map((r) => r.from)).toEqual([...RANKS.map((r) => r.from)].sort((a, b) => a - b))
    expect(rankOf(START_RATING)).toBe('Squire')
    expect(rankOf(900)).toBe('Knight')
    expect(rankOf(100)).toBe('Squire')
    expect(rankOf(9999)).toBe('Eclipse Champion')
  })

  it('builds a legal game', () => {
    expect(() => ladderGame(7)).not.toThrow()
    expect(ladderGame(7).config.setup).toBe('ladder')
  })
})

describe('ladder store', () => {
  it('repairs bad data', () => {
    expect(parseLadder(null).rating).toBe(START_RATING)
    const s = parseLadder({ rating: 1100, history: [{ foe: 'nobody', result: 'win', change: 3 }, { foe: 'hard-rusher', result: 'loss', change: -5 }] })
    expect(s.history).toHaveLength(1)
    expect(s.peak).toBe(1100)
  })

  it('records a win, then a loss, and pays for a first win', () => {
    const foe = foeById('normal-balanced')!
    const before = ladderSnapshot().rating
    const win = recordLadder(foe, 'win')
    expect(win.change).toBeGreaterThan(0)
    expect(win.shards).toBeGreaterThanOrEqual(SHARDS_LADDER_WIN)
    expect(ladderSnapshot().rating).toBe(before + win.change)
    const loss = recordLadder(foe, 'loss')
    expect(loss.change).toBeLessThan(0)
    expect(loss.shards).toBe(0)
    expect(ladderSnapshot().games).toBe(2)
    expect(ladderSnapshot().peak).toBe(before + win.change)
  })

  it('pays a rank bonus once when the peak crosses into a new rank', () => {
    const foe = foeById('hard-rusher')!
    let bonus = 0
    for (let i = 0; i < 40; i++) bonus += recordLadder(foe, 'win').shards >= SHARDS_LADDER_RANK + SHARDS_LADDER_WIN ? 1 : 0
    expect(bonus).toBeGreaterThan(0)
    expect(bonus).toBeLessThanOrEqual(RANKS.length - 1)
  })
})

describe('seasons and rivals', () => {
  it('reads old saves as a first season and keeps results per foe', () => {
    const old = parseLadder({ rating: 900, peak: 950, games: 3, wins: 2, draws: 0, losses: 1, history: [] })
    expect(old.season).toBe(1)
    expect(old.rivals).toEqual({})
    const foe = LADDER_FOES[0]
    expect(parseLadder({ rivals: { [foe.id]: { w: 2, d: 1, l: 0 }, nobody: { w: 9 } } }).rivals).toEqual({ [foe.id]: { w: 2, d: 1, l: 0 } })
  })
  it('pulls the rating halfway back for a new season', () => {
    expect(seasonStart(1400)).toBe(1100)
    expect(seasonStart(START_RATING)).toBe(START_RATING)
    expect(seasonStart(MIN_RATING)).toBe(START_RATING - Math.round((START_RATING - MIN_RATING) / 2))
  })
  it('counts games against a foe and opens the next season only after ten', () => {
    const foe = LADDER_FOES[0]
    recordLadder(foe, 'win')
    expect(ladderSnapshot().rivals[foe.id].w).toBeGreaterThanOrEqual(1)
    while (ladderSnapshot().seasonGames < SEASON_MIN_GAMES) {
      expect(startSeason()).toBeNull()
      recordLadder(foe, 'loss')
    }
    const peak = ladderSnapshot().seasonPeak
    const reward = startSeason()
    expect(reward).toEqual(seasonReward(1, peak))
    expect(reward!.shards).toBe(SEASON_SHARDS[rankOf(peak)])
    const s = ladderSnapshot()
    expect(s.season).toBe(2)
    expect(s.seasonGames).toBe(0)
    expect(s.past.at(-1)).toBe(peak)
    expect(seasonHistory(s).at(-1)).toEqual(reward)
  })
})

describe('season rewards', () => {
  it('pays more for a higher rank and covers every rank', () => {
    for (const r of RANKS) expect(SEASON_SHARDS[r.title]).toBeGreaterThan(0)
    const paid = RANKS.map((r) => SEASON_SHARDS[r.title])
    expect(paid).toEqual([...paid].sort((a, b) => a - b))
    expect(seasonReward(3, 1520)).toEqual({ season: 3, peak: 1520, rank: 'Eclipse Champion', shards: SEASON_SHARDS['Eclipse Champion'] })
  })
  it('numbers the past seasons from the current one', () => {
    const s = parseLadder({ season: 4, past: [800, 950, 1100] })
    expect(seasonHistory(s).map((h) => [h.season, h.rank])).toEqual([[1, 'Squire'], [2, 'Knight'], [3, 'Captain']])
  })
})
