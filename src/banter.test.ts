import { describe, expect, it } from 'vitest'
import { COOLDOWN_PLIES, lineAllowed, newBanter, speak, triggerFor } from './banter'
import { LINE_BANKS } from './engine/data/personaLines'
import { newGame } from './engine/reducer'
import type { Action, GameState, Piece, Pos, Role } from './engine/rules/types'

const piece = (role: Role, pos: Pos, court: Piece['court'], id: string): Piece => ({
  id, court, role, hp: 5, maxHp: 5, pos, rest: 0, moved: false, bound: false,
})
const world = (...pieces: Piece[]): GameState => ({ ...newGame(), pieces })
const move = (state: GameState, pieceId: string, to: Pos, duel?: { attackerHp: number; defenderHp: number }): [Action, GameState] => {
  const action: Action = { type: 'move', pieceId, to, duel }
  return [action, { ...state, pieces: state.pieces.map((p) => (p.id === pieceId ? { ...p, pos: to } : p)) }]
}

describe('triggerFor', () => {
  const mine = piece('footsoldier', { x: 3, y: 3 }, 'umbral', 'm')
  const yours = piece('footsoldier', { x: 2, y: 3 }, 'solari', 'y')
  const start = world(mine, yours)

  it('speaks for a win, a loss and a draw', () => {
    const [a] = move(start, 'm', { x: 3, y: 4 })
    expect(triggerFor(start, a, { ...start, winner: 'umbral' }, 'umbral')).toBe('win')
    expect(triggerFor(start, a, { ...start, winner: 'solari' }, 'umbral')).toBe('lose')
    expect(triggerFor(start, a, { ...start, winner: 'draw' }, 'umbral')).toBe('draw')
  })
  it('speaks when the Eclipse begins', () => {
    const [a, after] = move(start, 'm', { x: 3, y: 4 })
    expect(triggerFor(start, a, { ...after, eclipse: true }, 'umbral')).toBe('eclipse')
  })
  it('tells captures and duels from the persona side', () => {
    const [a, after] = move(start, 'm', { x: 2, y: 3 })
    expect(triggerFor(start, a, after, 'umbral')).toBe('capture')
    expect(triggerFor(start, a, after, 'solari')).toBe('lose-piece')
    const [won, afterWon] = move(start, 'm', { x: 2, y: 3 }, { attackerHp: 2, defenderHp: 0 })
    expect(triggerFor(start, won, afterWon, 'umbral')).toBe('duel-win')
    const [lost, afterLost] = move(start, 'm', { x: 2, y: 3 }, { attackerHp: 0, defenderHp: 2 })
    expect(triggerFor(start, lost, afterLost, 'umbral')).toBe('duel-loss')
    expect(triggerFor(start, lost, afterLost, 'solari')).toBe('duel-win')
    const [drawn, afterDrawn] = move(start, 'm', { x: 2, y: 3 }, { attackerHp: 1, defenderHp: 1 })
    expect(triggerFor(start, drawn, afterDrawn, 'umbral')).toBeNull()
  })
  it('speaks for a spell and for the first move, and is quiet otherwise', () => {
    const cast: Action = { type: 'cast', spell: 'mend', pieceId: 'm' }
    expect(triggerFor(start, cast, start, 'umbral')).toBe('spell')
    const [a, after] = move(world(mine, yours), 'm', { x: 3, y: 4 })
    expect(triggerFor({ ...start, turn: 'umbral' }, a, after, 'umbral', true)).toBe('open')
    expect(triggerFor({ ...start, turn: 'umbral' }, a, after, 'umbral', false)).toBeNull()
  })
  it('speaks when a Leader becomes threatened', () => {
    const myLeader = piece('leader', { x: 6, y: 6 }, 'umbral', 'ml')
    const yourLeader = piece('leader', { x: 0, y: 0 }, 'solari', 'yl')
    const raider = piece('footsoldier', { x: 4, y: 4 }, 'solari', 'r')
    const before = world(myLeader, yourLeader, raider)
    const [a, after] = move(before, 'r', { x: 5, y: 5 })
    expect(triggerFor(before, a, after, 'umbral')).toBe('danger')
    expect(triggerFor(before, a, after, 'solari')).toBe('threat')
  })
})

describe('speak', () => {
  it('holds a cooldown, except for the end of the fight', () => {
    const first = speak(newBanter(7), 'cassia', 'capture', 10)!
    expect(first.banter.lastPly).toBe(10)
    expect(speak(first.banter, 'cassia', 'capture', 10 + COOLDOWN_PLIES - 1)).toBeNull()
    expect(speak(first.banter, 'cassia', 'capture', 10 + COOLDOWN_PLIES)).not.toBeNull()
    expect(speak(first.banter, 'cassia', 'win', 11)).not.toBeNull()
  })
  it('uses every line in a category before repeating one', () => {
    const size = LINE_BANKS.pym.spell.length
    let banter = newBanter(3)
    const said: string[] = []
    for (let i = 0; i < size * 3; i++) {
      const result = speak(banter, 'pym', 'spell', i * 10)!
      said.push(result.line)
      banter = result.banter
    }
    for (let round = 0; round < 3; round++) expect(new Set(said.slice(round * size, (round + 1) * size)).size).toBe(size)
    for (let i = 1; i < said.length; i++) expect(said[i]).not.toBe(said[i - 1])
  })
  it('is the same for the same seed', () => {
    expect(speak(newBanter(5), 'bea', 'danger', 4)!.line).toBe(speak(newBanter(5), 'bea', 'danger', 4)!.line)
  })
})

describe('lineAllowed', () => {
  it('shows everything on Full, only results and the Eclipse on Quiet, and nothing on Off', () => {
    expect(lineAllowed('full', 'capture')).toBe(true)
    expect(lineAllowed('quiet', 'capture')).toBe(false)
    for (const c of ['win', 'lose', 'draw', 'eclipse'] as const) expect(lineAllowed('quiet', c)).toBe(true)
    expect(lineAllowed('off', 'win')).toBe(false)
  })
})
