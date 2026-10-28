import { describe, expect, it } from 'vitest'
import { CASCADE_STEP_MS, LUNGE_REACH, cascadeDelay, lungeOffset, turnGlow } from './boardMotion'

describe('lungeOffset', () => {
  it('points along the move at the lunge reach', () => {
    expect(lungeOffset({ x: 0, y: 0 }, { x: 3, y: 0 })).toEqual({ dx: LUNGE_REACH, dy: 0 })
    const d = lungeOffset({ x: 1, y: 1 }, { x: 3, y: 3 })
    expect(Math.hypot(d.dx, d.dy)).toBeCloseTo(LUNGE_REACH)
    expect(d.dx).toBeCloseTo(d.dy)
  })
  it('is still for a move that went nowhere', () => {
    expect(lungeOffset({ x: 2, y: 2 }, { x: 2, y: 2 })).toEqual({ dx: 0, dy: 0 })
  })
})

describe('cascadeDelay', () => {
  it('grows by one step per square of distance and is capped', () => {
    expect(cascadeDelay({ x: 0, y: 0 }, { x: 1, y: 1 })).toBe(CASCADE_STEP_MS)
    expect(cascadeDelay({ x: 0, y: 0 }, { x: 3, y: 1 })).toBe(3 * CASCADE_STEP_MS)
    expect(cascadeDelay({ x: 0, y: 0 }, { x: 20, y: 0 })).toBe(9 * CASCADE_STEP_MS)
  })
  it('is zero with no lifted piece', () => {
    expect(cascadeDelay(undefined, { x: 4, y: 4 })).toBe(0)
  })
})

describe('turnGlow', () => {
  it('differs between the courts', () => {
    expect(turnGlow('solari')).not.toBe(turnGlow('umbral'))
  })
})
