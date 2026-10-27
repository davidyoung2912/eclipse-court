import { describe, expect, it } from 'vitest'
import { reduce, stubDuel } from '../../reducer'
import { squareLuminance } from '../../rules/luminance'
import { pieceAt } from '../../rules/moves'
import { SPELL_INFO, spellPool } from '../../rules/spells'
import type { Action, GameState, Role } from '../../rules/types'
import { ROLE_NAMES } from '../roster'
import { dailyPuzzleIndex, PUZZLE_TIERS, PUZZLES, puzzleById, puzzlesIn, type Puzzle } from '.'
import { rivalReply, solve } from './solver'

/** Plays the puzzle as the game does: the Umbral AI answers each action with the seed the game gives it. */
function play(puzzle: Puzzle, actions: readonly Action[]): GameState {
  let s = puzzle.build()
  for (const action of actions) {
    const next = reduce(s, action)
    expect(next, `${puzzle.id}: ${JSON.stringify(action)} is legal`).not.toBe(s)
    s = next
    if (s.winner) break
    const reply = rivalReply(s, puzzle, 'ai')
    // A reply that attacks would be settled by a duel the puzzle cannot promise, so authors keep the rival's pieces out of reach.
    expect(reply.type === 'move' && pieceAt(s, reply.to), `${puzzle.id}: the rival never attacks`).toBeFalsy()
    s = reduce(s, reply)
  }
  return s
}

const LIMITS = { beginner: [1, 2], normal: [2, 3], expert: [3, 5] } as const
const TIER_SIZE = 25

describe('puzzles', () => {
  it('have unique ids and sane limits', () => {
    expect(new Set(PUZZLES.map((p) => p.id)).size).toBe(PUZZLES.length)
    for (const p of PUZZLES) {
      expect(p.limit).toBeGreaterThanOrEqual(1)
      expect(p.solution.length).toBeLessThanOrEqual(p.limit)
      expect(puzzleById(p.id)).toBe(p)
    }
  })

  it('sit in a tier, play at that tier\'s strength and carry two hints', () => {
    for (const p of PUZZLES) {
      const info = PUZZLE_TIERS.find((t) => t.tier === p.tier)!
      expect(p.difficulty, p.id).toBe(info.difficulty)
      expect(p.hints[0].length, p.id).toBeGreaterThan(0)
      expect(p.hints[1].length, p.id).toBeGreaterThan(0)
    }
    expect(PUZZLE_TIERS.flatMap((t) => puzzlesIn(t.tier))).toHaveLength(PUZZLES.length)
  })

  it('keep each tier\'s turn limits and fill each tier', () => {
    for (const { tier } of PUZZLE_TIERS) {
      const [lo, hi] = LIMITS[tier]
      for (const p of puzzlesIn(tier)) {
        expect(p.limit, p.id).toBeGreaterThanOrEqual(lo)
        expect(p.limit, p.id).toBeLessThanOrEqual(hi)
      }
      if (PUZZLES.length >= TIER_SIZE * 3) expect(puzzlesIn(tier), tier).toHaveLength(TIER_SIZE)
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
        if (!s.winner) s = reduce(s, rivalReply(s, p, 'ai'))
      }
      expect(s.winner, p.id).not.toBe('solari')
    }
  })

  it.each(PUZZLES.map((p) => [p.id, p] as const))('%s can be solved with its stated solution', (_id, p) => {
    expect(play(p, p.solution).winner).toBe('solari')
  })

  it('win every duel in a solution decisively, across the stub duel\'s spread of luck', () => {
    for (const p of PUZZLES) {
      let s = p.build()
      for (const a of p.solution) {
        if (a.type === 'move') {
          const attacker = s.pieces.find((x) => x.id === a.pieceId)!
          const defender = pieceAt(s, a.to)
          if (defender) {
            for (const roll of [0, 0.25, 0.5, 0.75, 1])
              expect(stubDuel(attacker, defender, squareLuminance(s, a.to), roll).defenderHp, `${p.id} at luck ${roll}`).toBe(0)
          }
        }
        s = reduce(s, a)
        if (s.winner) break
        s = reduce(s, rivalReply(s, p, 'ai'))
      }
    }
  })

  it('cannot be won in fewer turns than the solution takes', () => {
    for (const p of PUZZLES) {
      // A rival that only passes is a fair yardstick unless the rival\'s own moves are the point of the puzzle.
      const r = solve(p.build(), p, p.solution.length - 1, p.rivalMatters ? 'ai' : 'pass')
      expect(r.turns, `${p.id} has a shortcut ${JSON.stringify(r.lines[0])}`).toBeNull()
    }
  })

  it('name the first move\'s piece or spell in the second hint', () => {
    for (const p of PUZZLES) {
      const first = p.solution[0]
      const s = p.build()
      const names = first.type === 'move'
        ? [ROLE_NAMES.solari[s.pieces.find((x) => x.id === first.pieceId)!.role]]
        : first.type === 'cast' ? [SPELL_INFO[first.spell].name] : []
      expect(names.some((n) => p.hints[1].includes(n.split(' ').pop()!)), `${p.id}: "${p.hints[1]}" should name ${names.join(' or ')}`).toBe(true)
    }
  })

  it('put every role and every Solari spell into some solution', () => {
    const roles = new Set<Role>()
    const spells = new Set<string>()
    for (const p of PUZZLES) {
      const s = p.build()
      for (const a of p.solution) {
        if (a.type === 'move') roles.add(s.pieces.find((x) => x.id === a.pieceId)!.role)
        if (a.type === 'cast') spells.add(a.spell)
      }
    }
    // Only meaningful once the packs are full.
    if (PUZZLES.length < TIER_SIZE * 3) return
    expect([...roles].sort()).toEqual(['aura', 'bruiser', 'charger', 'flier', 'footsoldier', 'marksman'])
    expect([...spells].sort()).toEqual(spellPool('solari').sort())
  })

  it('picks a daily puzzle from the pack, the same all day', () => {
    const a = dailyPuzzleIndex(new Date(2026, 9, 26, 3))
    expect(a).toBe(dailyPuzzleIndex(new Date(2026, 9, 26, 22)))
    expect(a).toBeGreaterThanOrEqual(0)
    expect(a).toBeLessThan(PUZZLES.length)
  })
})
