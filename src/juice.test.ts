import { describe, expect, it } from 'vitest'
import { newGame } from './engine/reducer'
import type { Step } from './engine/log'
import type { Court, GameState } from './engine/rules/types'
import { musicLevel, piecesLost, shakeFor, streakAfter, streakLabel } from './juice'

const base = newGame(1)

/** A position with the given court to move and `lost` pieces fewer than the opening. */
const at = (turn: Court, lost: number): GameState => ({ ...base, turn, pieces: base.pieces.slice(lost) })

/** Steps alternating from Solari; each entry is the number of pieces gone in total after that action. */
function steps(totals: number[]): Step[] {
  const out: Step[] = [{ state: at('solari', 0), action: null }]
  totals.forEach((t, i) => out.push({ state: at(i % 2 === 0 ? 'umbral' : 'solari', t), action: { type: 'pass' } }))
  return out
}

describe('capture streaks', () => {
  it('counts pieces lost between two positions', () => {
    expect(piecesLost(at('solari', 0), at('umbral', 1))).toBe(1)
    expect(piecesLost(at('solari', 2), at('umbral', 2))).toBe(0)
  })

  it('has no streak before the first action', () => {
    expect(streakAfter(steps([]))).toBeNull()
  })

  it('counts a court\'s consecutive capturing turns across the other court\'s turns', () => {
    // Solari takes, Umbral takes, Solari takes: Solari is on two.
    expect(streakAfter(steps([1, 2, 3]))).toEqual({ court: 'solari', count: 2 })
    expect(streakAfter(steps([1, 2, 3, 4]))).toEqual({ court: 'umbral', count: 2 })
  })

  it('ends when the court takes nothing', () => {
    expect(streakAfter(steps([1, 1, 1, 1, 2]))).toEqual({ court: 'solari', count: 1 })
    expect(streakAfter(steps([1, 1, 1]))).toEqual({ court: 'solari', count: 0 })
  })

  it('labels only streaks of two or more, capped at the top label', () => {
    expect(streakLabel(0)).toBeNull()
    expect(streakLabel(1)).toBeNull()
    expect(streakLabel(2)).toBe('Double Capture')
    expect(streakLabel(3)).toBe('Triple Capture')
    expect(streakLabel(99)).toBe(streakLabel(5))
  })
})

describe('screen shake', () => {
  it('is off for reduced motion and for quiet moves', () => {
    expect(shakeFor(1, false, true)).toBeNull()
    expect(shakeFor(0, false, false)).toBeNull()
  })

  it('grows with the pieces lost and is heaviest for a Leader', () => {
    const one = shakeFor(1, false, false)!
    const two = shakeFor(2, false, false)!
    const leader = shakeFor(1, true, false)!
    expect(two.px).toBeGreaterThan(one.px)
    expect(leader.px).toBeGreaterThan(two.px)
    expect(leader.ms).toBeGreaterThan(one.ms)
  })
})

describe('music level', () => {
  const at = (round: number, extra: Partial<GameState> = {}) => ({ ...base, round, ...extra })

  it('builds with the rounds and peaks at the Eclipse', () => {
    const last = base.config.eclipseRound
    expect(musicLevel(at(1))).toBe(0)
    expect(musicLevel(at(Math.ceil(last / 2)))).toBeGreaterThan(0)
    expect(musicLevel(at(last))).toBeGreaterThan(musicLevel(at(Math.ceil(last / 2))))
    expect(musicLevel(at(last))).toBeLessThan(1)
    expect(musicLevel(at(last, { eclipse: true }))).toBe(1)
  })

  it('falls silent once the game is won', () => {
    expect(musicLevel(at(5, { winner: 'solari' }))).toBe(0)
  })
})
