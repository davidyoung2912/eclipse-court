import { describe, expect, it } from 'vitest'
import { reduce } from './engine/reducer'
import { rivalReply } from './sim/puzzleSolver'
import { applyResult, bandFor, endlessPuzzle, ENDLESS_START, generateEndless, puzzleRating, seedFor, type EndlessRecord } from './endless'

const record = (rating: number): EndlessRecord => ({ rating, best: rating, solved: 0, missed: 0, streak: 0, bestStreak: 0, n: 0 })

describe('endless puzzles', () => {
  it('serves harder bands as the rating rises', () => {
    expect([900, 1149, 1150, 1449, 1450, 2000].map(bandFor)).toEqual([0, 0, 1, 1, 2, 2])
  })

  it('gives each puzzle number its own seed', () => {
    expect(new Set([0, 1, 2, 3, 4].map((n) => seedFor(n, 7))).size).toBe(5)
  })

  it('moves the rating up for a solve and down for a miss, more for an upset', () => {
    const win = applyResult(record(ENDLESS_START), 1000, true)
    const loss = applyResult(record(ENDLESS_START), 1000, false)
    expect(win.rating).toBeGreaterThan(ENDLESS_START)
    expect(loss.rating).toBeLessThan(ENDLESS_START)
    expect(win).toMatchObject({ solved: 1, streak: 1, bestStreak: 1, best: win.rating })
    expect(loss).toMatchObject({ missed: 1, streak: 0 })
    expect(applyResult(record(ENDLESS_START), 1500, true).rating).toBeGreaterThan(win.rating)
    expect(applyResult(win, 1000, false)).toMatchObject({ streak: 0, bestStreak: 1 })
  })

  it('never lets the rating fall below its floor', () => {
    expect(applyResult(record(400), 2000, false).rating).toBe(400)
  })

  it('finds the same solvable puzzle from the same seed', () => {
    const g = generateEndless(seedFor(0, 1), 0)
    expect(generateEndless(seedFor(0, 1), 0).def).toEqual(g.def)
    const p = endlessPuzzle(g, 1)
    expect(p.limit).toBe(g.turns)
    expect(puzzleRating(g)).toBeGreaterThanOrEqual(850)
    // The stored solution wins within the limit against the rival the puzzle screen plays.
    let s = p.build()
    for (const action of p.solution) {
      s = reduce(s, action)
      if (s.winner) break
      const reply = rivalReply(s, p, 'ai')
      expect(reply).not.toBeNull()
      s = reduce(s, reply!)
    }
    expect(s.winner).toBe('solari')
  }, 60000)
})
