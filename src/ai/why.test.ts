import { describe, expect, it } from 'vitest'
import { newGame } from '../engine/reducer'
import { legalMoves } from '../engine/rules/moves'
import { explainMove } from './why'

describe('explainMove', () => {
  const state = newGame()

  it('explains a pass and prefixes a personality', () => {
    expect(explainMove(state, { type: 'pass' })).toMatch(/waits/)
    expect(explainMove(state, { type: 'pass' }, 'turtle')).toMatch(/^Turtle: /)
  })

  it('gives a non-empty one-line reason for every opening move', () => {
    const mover = state.pieces.find((p) => p.court === state.turn && legalMoves(state, p).length > 0)!
    for (const to of legalMoves(state, mover)) {
      const text = explainMove(state, { type: 'move', pieceId: mover.id, to })
      expect(text.length).toBeGreaterThan(10)
      expect(text).not.toContain('\n')
    }
  })
})
