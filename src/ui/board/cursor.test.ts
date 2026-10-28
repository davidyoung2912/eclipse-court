import { describe, expect, it } from 'vitest'
import { stepCursor } from './cursor'

describe('stepCursor', () => {
  it('moves up the screen toward the far court', () => {
    expect(stepCursor({ x: 2, y: 3 }, 'ArrowUp', false, 7)).toEqual({ x: 3, y: 3 })
    expect(stepCursor({ x: 2, y: 3 }, 'ArrowRight', false, 7)).toEqual({ x: 2, y: 4 })
  })
  it('reverses when the board is turned', () => {
    expect(stepCursor({ x: 2, y: 3 }, 'ArrowUp', true, 7)).toEqual({ x: 1, y: 3 })
    expect(stepCursor({ x: 2, y: 3 }, 'ArrowRight', true, 7)).toEqual({ x: 2, y: 2 })
  })
  it('stays on the board and ignores other keys', () => {
    expect(stepCursor({ x: 0, y: 0 }, 'ArrowDown', false, 7)).toEqual({ x: 0, y: 0 })
    expect(stepCursor({ x: 0, y: 0 }, 'a', false, 7)).toBeNull()
  })
})
