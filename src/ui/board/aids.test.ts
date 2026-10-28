import { describe, expect, it } from 'vitest'
import { newGame } from '../../engine/reducer'
import { legalMoves } from '../../engine/rules/moves'
import type { GameState, Piece } from '../../engine/rules/types'
import { attackOdds, lastMoveOf, threatenedIds } from './aids'

const piece = (id: string, court: Piece['court'], role: Piece['role'], x: number, y: number): Piece => ({
  id, court, role, hp: 4, maxHp: 4, pos: { x, y }, rest: 0, moved: false, bound: false,
})
const world = (pieces: Piece[]): GameState => ({ ...newGame(), pieces })

describe('threatenedIds', () => {
  it('finds own pieces an enemy could reach, and only those', () => {
    const state = world([piece('a', 'solari', 'footsoldier', 3, 3), piece('b', 'solari', 'footsoldier', 0, 0), piece('e', 'umbral', 'footsoldier', 3, 4)])
    expect(threatenedIds(state, 'solari')).toEqual(['a'])
    expect(threatenedIds(state, 'umbral')).toEqual(['e'])
  })
  it('is empty when no enemy is in reach', () => {
    const state = world([piece('a', 'solari', 'footsoldier', 0, 0), piece('e', 'umbral', 'footsoldier', 6, 6)])
    expect(threatenedIds(state, 'solari')).toEqual([])
  })
})

describe('attackOdds', () => {
  it('gives a percentage for each enemy in the move list', () => {
    const attacker = piece('a', 'solari', 'footsoldier', 3, 3)
    const state = world([attacker, piece('e', 'umbral', 'footsoldier', 3, 4), piece('f', 'solari', 'footsoldier', 4, 3)])
    const odds = attackOdds(state, attacker, legalMoves(state, attacker))
    expect(Object.keys(odds)).toEqual(['e'])
    expect(odds.e).toBeGreaterThanOrEqual(0)
    expect(odds.e).toBeLessThanOrEqual(100)
  })
})

describe('lastMoveOf', () => {
  const before = world([piece('a', 'solari', 'footsoldier', 1, 1)])
  it('names the squares a move left and reached', () => {
    const history = [{ state: before, action: null }, { state: before, action: { type: 'move' as const, pieceId: 'a', to: { x: 2, y: 1 } } }]
    expect(lastMoveOf(history)).toEqual({ from: { x: 1, y: 1 }, to: { x: 2, y: 1 } })
  })
  it('is null at the start and after a pass', () => {
    expect(lastMoveOf([{ state: before, action: null }])).toBeNull()
    expect(lastMoveOf([{ state: before, action: null }, { state: before, action: { type: 'pass' as const } }])).toBeNull()
  })
})
