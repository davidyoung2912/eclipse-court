import { describe, expect, it } from 'vitest'
import { newGame, reduce } from './engine/reducer'
import { legalMoves } from './engine/rules/moves'
import { describeSquare, narrate, squareName } from './narrate'

describe('narrate', () => {
  it('names squares by column letter and row number', () => {
    expect(squareName({ x: 0, y: 0 })).toBe('a1')
    expect(squareName({ x: 3, y: 6 })).toBe('g4')
  })

  it('describes empty and occupied squares', () => {
    const state = newGame()
    const piece = state.pieces[0]
    expect(describeSquare(state, piece.pos)).toContain(`${piece.hp} of ${piece.maxHp} HP`)
    expect(describeSquare(state, { x: 3, y: 3 })).toMatch(/empty|HP/)
  })

  it('says where a piece moved', () => {
    const state = newGame()
    const piece = state.pieces.find((p) => p.court === state.turn && legalMoves(state, p).length > 0)!
    const to = legalMoves(state, piece)[0]
    const action = { type: 'move' as const, pieceId: piece.id, to }
    const line = narrate(state, action, reduce(state, action))
    expect(line).toContain(`moves to ${squareName(to)}`)
  })

  it('names a pass', () => {
    const state = newGame()
    expect(narrate(state, { type: 'pass' }, reduce(state, { type: 'pass' }))).toMatch(/passes/)
  })
})
