import { describe, expect, it } from 'vitest'
import { PERSONALITIES } from '../../ai/personality'
import { playFrom } from '../../sim/game'
import { decodeRecord, encodeRecord } from '../serialize'
import { isBlocked, samePos } from '../rules/board'
import { objectiveRounds } from '../rules/events'
import { boardById } from './boards'
import { SCENARIOS, scenarioById, scenarioGame, scenariosIn } from './scenarios'

describe('scenarios', () => {
  it('has distinct scenarios with known boards and personalities, grouped by tier', () => {
    expect(SCENARIOS.length).toBeGreaterThanOrEqual(6)
    const levels = ['easy', 'normal', 'hard']
    const order = SCENARIOS.map((s) => levels.indexOf(s.difficulty))
    expect(order).toEqual([...order].sort())
    expect(new Set(SCENARIOS.map((s) => s.id)).size).toBe(SCENARIOS.length)
    expect(new Set(SCENARIOS.map((s) => s.objective.kind)).size).toBe(3)
    for (const s of SCENARIOS) {
      expect(PERSONALITIES[s.personality], s.id).toBeDefined()
      expect(boardById(s.board).id).toBe(s.board ?? 'classic')
      expect(scenarioById(s.id)).toBe(s)
    }
  })

  it('has a full Beginner tier of 25 with all five personalities and every objective', () => {
    const easy = scenariosIn('easy')
    expect(easy).toHaveLength(25)
    expect(new Set(easy.map((s) => s.personality)).size).toBe(5)
    expect(new Set(easy.map((s) => s.objective.kind)).size).toBe(3)
    for (const s of easy) expect(s.bonus.text, s.id).not.toBe('')
  })

  it('has a Normal tier of 25 with all five personalities and every objective', () => {
    const normal = scenariosIn('normal')
    expect(normal).toHaveLength(25)
    expect(new Set(normal.map((s) => s.personality)).size).toBe(5)
    expect(new Set(normal.map((s) => s.objective.kind)).size).toBe(3)
    for (const s of normal) expect(s.bonus.text, s.id).not.toBe('')
  })

  it('opens each with Solari to move, a Leader each and no overlapping or walled-in pieces', () => {
    for (const [i, s] of SCENARIOS.entries()) {
      const g = scenarioGame(s, 10 + i)
      expect(g.turn, s.id).toBe('solari')
      expect(g.winner, s.id).toBeNull()
      expect(g.config.objective, s.id).toEqual(s.objective)
      for (const court of ['solari', 'umbral'] as const) expect(g.pieces.filter((p) => p.court === court && p.role === 'leader'), s.id).toHaveLength(1)
      expect(new Set(g.pieces.map((p) => `${p.pos.x},${p.pos.y}`)).size, s.id).toBe(g.pieces.length)
      for (const p of g.pieces) expect(isBlocked(g.config, p.pos), `${s.id} ${p.id}`).toBe(false)
    }
  })

  it('marks every goal square as a beacon and keeps it free at the start', () => {
    for (const s of SCENARIOS) {
      const g = scenarioGame(s, 3)
      const o = s.objective
      const square = o.kind === 'escort' ? o.goal : o.kind === 'hold' ? o.at : null
      if (!square) continue
      expect(g.config.beacons.some((b) => samePos(b, square)), s.id).toBe(true)
      expect(g.pieces.some((p) => samePos(p.pos, square)), s.id).toBe(false)
    }
  })

  it('gives enough rounds to reach a goal the Leader can walk to', () => {
    for (const s of SCENARIOS) {
      const o = s.objective
      if (o.kind !== 'escort') continue
      const g = scenarioGame(s, 4)
      const from = g.pieces.find((p) => p.court === 'solari' && p.role === 'leader')!.pos
      // The Leader jumps up to four squares a turn, so this is a floor on the turns needed.
      const turns = Math.ceil((Math.abs(from.x - o.goal.x) + Math.abs(from.y - o.goal.y)) / 4)
      expect(turns, s.id).toBeLessThan(o.limit)
    }
  })

  it('survives a replay code', () => {
    for (const s of SCENARIOS) {
      const initial = scenarioGame(s, 8)
      const back = decodeRecord(encodeRecord({ initial, actions: [] }))
      expect(back?.initial.config.objective, s.id).toEqual(s.objective)
      expect(back?.initial.pieces, s.id).toEqual(initial.pieces)
    }
  })

  it('terminates every scenario when the AIs play each other', () => {
    for (const [i, s] of SCENARIOS.entries()) {
      const r = playFrom(scenarioGame(s, 20 + i), 20 + i, s.difficulty, s.difficulty, 300)
      expect(r.problems, s.id).toEqual([])
      expect(r.state.winner, s.id).not.toBeNull()
      expect(r.state.round, s.id).toBeLessThanOrEqual(Math.max(objectiveRounds(s.objective), 1) + 1 + 50)
    }
  })
})
