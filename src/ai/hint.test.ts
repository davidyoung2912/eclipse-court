import { describe, expect, it } from 'vitest'
import { newGame } from '../engine/reducer'
import { chooseAction } from './strategy'
import { describeHint, HINT_DIFFICULTY } from './hint'

describe('hints', () => {
  it('describes the recommended opening action for the side to move', () => {
    const s = newGame(7)
    const action = chooseAction(s, HINT_DIFFICULTY, 3)
    const hint = describeHint(s, action)
    expect(hint.action).toEqual(action)
    expect(hint.headline.length).toBeGreaterThan(0)
    if (action.type === 'move') {
      expect(hint.mover).toBe(action.pieceId)
      expect(hint.to ?? hint.target).toBeDefined()
    }
  })

  it('describes a pass', () => {
    const hint = describeHint(newGame(1), { type: 'pass' })
    expect(hint.mover).toBeUndefined()
    expect(hint.headline).toMatch(/end your turn/i)
  })
})
