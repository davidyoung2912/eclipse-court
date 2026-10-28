import { describe, expect, it } from 'vitest'
import { newGame } from './engine/reducer'
import type { Step } from './engine/log'
import type { Court, GameState } from './engine/rules/types'
import { momentOf, type MomentId } from './moments'

const base = newGame(1)
const none = new Set<MomentId>()

/** A position with `turn` to move and `lost` pieces fewer than the opening. */
const at = (turn: Court, lost: number, extra: Partial<GameState> = {}): GameState => ({ ...base, turn, pieces: base.pieces.slice(lost), ...extra })

/** Steps alternating from Solari; each entry is the pieces gone in total after that action. */
function steps(totals: number[], last: Partial<GameState> = {}): Step[] {
  const out: Step[] = [{ state: at('solari', 0), action: null }]
  totals.forEach((t, i) => out.push({ state: at(i % 2 === 0 ? 'umbral' : 'solari', t, i === totals.length - 1 ? last : {}), action: { type: 'pass' } }))
  return out
}

describe('named moments', () => {
  it('says nothing before an action or for a quiet move', () => {
    expect(momentOf(steps([]), none)).toBeNull()
    expect(momentOf(steps([0]), none)).toBeNull()
  })

  it('names the first capture of the game for the court that made it', () => {
    expect(momentOf(steps([0, 1]), none)).toEqual({ id: 'first-blood', court: 'umbral' })
    expect(momentOf(steps([1, 1, 2]), none)).toBeNull()
  })

  it('does not name a moment twice', () => {
    expect(momentOf(steps([1]), new Set<MomentId>(['first-blood']))).toBeNull()
  })

  it('names a streak of three, not two or four', () => {
    expect(momentOf(steps([1, 1, 2, 2, 3]), new Set<MomentId>(['first-blood']))).toEqual({ id: 'streak', court: 'solari' })
    expect(momentOf(steps([1, 1, 2, 2]), new Set<MomentId>(['first-blood']))).toBeNull()
    expect(momentOf(steps([1, 1, 2, 2, 3, 3, 4]), new Set<MomentId>(['first-blood']))).toBeNull()
  })

  it('names the Eclipse as it falls, and prefers it to a capture', () => {
    expect(momentOf(steps([1], { eclipse: true }), none)).toEqual({ id: 'eclipse', court: null })
  })

  it('stays quiet when the game is decided', () => {
    expect(momentOf(steps([1], { winner: 'solari' }), none)).toBeNull()
  })
})
