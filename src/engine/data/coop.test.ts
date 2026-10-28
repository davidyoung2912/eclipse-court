import { describe, expect, it } from 'vitest'
import { PERSONALITIES } from './personality'
import { boardById } from './boards'
import { COOP_SCENARIOS, coopGame, coopPlayer } from './coop'
import { SCENARIOS } from './scenarios'
import { samePos } from '../rules/board'

describe('co-op scenarios', () => {
  it('has distinct, known scenarios that stay out of the solo list', () => {
    expect(COOP_SCENARIOS.length).toBeGreaterThanOrEqual(6)
    expect(new Set(COOP_SCENARIOS.map((s) => s.id)).size).toBe(COOP_SCENARIOS.length)
    expect(new Set(COOP_SCENARIOS.map((s) => s.objective.kind)).size).toBe(3)
    for (const s of COOP_SCENARIOS) {
      expect(s.id.startsWith('coop-')).toBe(true)
      expect(SCENARIOS.some((x) => x.id === s.id)).toBe(false)
      expect(PERSONALITIES[s.personality], s.id).toBeDefined()
      expect(boardById(s.board).id).toBe(s.board ?? 'classic')
      expect(s.bonus.text, s.id).not.toBe('')
    }
  })

  it('opens with Solari to move, a Leader on each side and its goal in the config', () => {
    for (const [i, s] of COOP_SCENARIOS.entries()) {
      const g = coopGame(s, i)
      expect(g.turn, s.id).toBe('solari')
      expect(g.config.objective, s.id).toEqual(s.objective)
      for (const court of ['solari', 'umbral'] as const) expect(g.pieces.filter((p) => p.court === court && p.role === 'leader').length, s.id).toBe(1)
      const squares = g.pieces.map((p) => p.pos)
      expect(squares.every((p, n) => squares.findIndex((q) => samePos(p, q)) === n), s.id).toBe(true)
      expect(g.pieces.filter((p) => p.court === 'solari').length, s.id).toBeGreaterThanOrEqual(8)
    }
  })

  it('alternates the two players by round', () => {
    expect([1, 2, 3, 4].map(coopPlayer)).toEqual([1, 2, 1, 2])
  })
})
