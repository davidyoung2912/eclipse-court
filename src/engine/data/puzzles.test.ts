import { describe, expect, it } from 'vitest'
import { chooseAction } from '../../ai/strategy'
import { reduce } from '../reducer'
import type { Action, GameState } from '../rules/types'
import { dailyPuzzleIndex, PUZZLES, puzzleById, type Puzzle } from './puzzles'

/** Plays the puzzle as the game does: the Umbral AI answers each action with the seed the game gives it. */
function play(puzzle: Puzzle, actions: readonly Action[]): GameState {
  let s = puzzle.build()
  for (const action of actions) {
    const next = reduce(s, action)
    expect(next, `${puzzle.id}: ${JSON.stringify(action)} is legal`).not.toBe(s)
    s = next
    if (s.winner) break
    const reply = chooseAction(s, puzzle.difficulty, s.rng + s.round)
    s = reduce(s, reply.type === 'move' && s.pieces.some((p) => p.court !== s.turn && p.pos.x === reply.to.x && p.pos.y === reply.to.y)
      ? { ...reply, duel: { attackerHp: 1, defenderHp: 1 } } : reply)
  }
  return s
}

describe('puzzles', () => {
  it('have unique ids and sane limits', () => {
    expect(new Set(PUZZLES.map((p) => p.id)).size).toBe(PUZZLES.length)
    for (const p of PUZZLES) {
      expect(p.limit).toBeGreaterThanOrEqual(1)
      expect(p.solution.length).toBeLessThanOrEqual(p.limit)
      expect(puzzleById(p.id)).toBe(p)
    }
  })

  it('start with Solari to move, one Leader a side and no overlapping pieces', () => {
    for (const p of PUZZLES) {
      const s = p.build()
      expect(s.turn, p.id).toBe('solari')
      expect(s.winner, p.id).toBeNull()
      for (const court of ['solari', 'umbral']) expect(s.pieces.filter((x) => x.court === court && x.role === 'leader'), p.id).toHaveLength(1)
      expect(new Set(s.pieces.map((x) => `${x.pos.x},${x.pos.y}`)).size, p.id).toBe(s.pieces.length)
    }
  })

  it('are not won by doing nothing', () => {
    for (const p of PUZZLES) {
      let s = p.build()
      for (let i = 0; i < p.limit && !s.winner; i++) {
        s = reduce(s, { type: 'pass' })
        if (!s.winner) s = reduce(s, chooseAction(s, p.difficulty, s.rng + s.round))
      }
      expect(s.winner, p.id).not.toBe('solari')
    }
  })

  it.each(PUZZLES.map((p) => [p.id, p] as const))('%s can be solved with its stated solution', (_id, p) => {
    expect(play(p, p.solution).winner).toBe('solari')
  })

  it('two-moves is solved in either order', () => {
    const p = puzzleById('two-moves')!
    expect(play(p, [...p.solution].reverse()).winner).toBe('solari')
  })

  it('picks a daily puzzle from the pack, the same all day', () => {
    const a = dailyPuzzleIndex(new Date(2026, 9, 26, 3))
    expect(a).toBe(dailyPuzzleIndex(new Date(2026, 9, 26, 22)))
    expect(a).toBeGreaterThanOrEqual(0)
    expect(a).toBeLessThan(PUZZLES.length)
  })
})
