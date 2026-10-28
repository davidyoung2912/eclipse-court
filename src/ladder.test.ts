import { describe, expect, it } from 'vitest'
import {
  expectedScore, foeById, kFactor, ladderGame, LADDER_FOES, MIN_RATING, nextRating, rankOf, RANKS, START_RATING, suggestFoe,
} from './engine/data/ladder'
import { parseLadder, recordLadder, ladderSnapshot, SHARDS_LADDER_RANK, SHARDS_LADDER_WIN } from './ladder'

describe('ladder maths', () => {
  it('has fifteen distinct foes, weakest first', () => {
    expect(LADDER_FOES).toHaveLength(15)
    expect(new Set(LADDER_FOES.map((f) => f.id)).size).toBe(15)
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
    expect(rankOf(START_RATING)).toBe('Knight')
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
