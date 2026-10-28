import { describe, expect, it } from 'vitest'
import { countUpMs, countUpValue, parallaxShift, rippleSpot, staggerDelay, STAGGER_MAX_ITEMS, STAGGER_STEP_MS } from './appMotion'

describe('count up', () => {
  it('starts at the old figure and ends on the new one', () => {
    expect(countUpValue(10, 50, 0)).toBe(10)
    expect(countUpValue(10, 50, countUpMs(10, 50))).toBe(50)
    expect(countUpValue(10, 50, 99999)).toBe(50)
  })
  it('rises monotonically and eases out', () => {
    const ms = countUpMs(0, 100)
    const half = countUpValue(0, 100, ms / 2)
    expect(half).toBeGreaterThan(50)
    expect(countUpValue(0, 100, ms * 0.25)).toBeLessThan(half)
  })
  it('counts down too, and a no-op change shows the figure at once', () => {
    expect(countUpValue(50, 10, 1)).toBeLessThanOrEqual(50)
    expect(countUpValue(7, 7, 0)).toBe(7)
  })
  it('never drags on', () => {
    expect(countUpMs(0, 100000)).toBe(1100)
  })
})

describe('stagger', () => {
  it('delays each item a step more, up to a cap', () => {
    expect(staggerDelay(0)).toBe(0)
    expect(staggerDelay(2)).toBe(2 * STAGGER_STEP_MS)
    expect(staggerDelay(50)).toBe(STAGGER_MAX_ITEMS * STAGGER_STEP_MS)
    expect(staggerDelay(-3)).toBe(0)
  })
})

describe('ripple spot', () => {
  const box = { left: 100, top: 50, width: 200, height: 40 }
  it('locates the pointer inside the box', () => {
    expect(rippleSpot(box, 200, 70)).toEqual({ x: 50, y: 50 })
  })
  it('clamps a pointer outside the box and survives an empty box', () => {
    expect(rippleSpot(box, 0, 500)).toEqual({ x: 0, y: 100 })
    expect(rippleSpot({ ...box, width: 0 }, 5, 70).x).toBe(50)
  })
})

describe('parallax', () => {
  it('is still at the centre and opposes the pointer at the edges', () => {
    expect(parallaxShift(200, 300, 400, 600)).toEqual({ dx: -0, dy: -0 })
    const edge = parallaxShift(400, 0, 400, 600, 10)
    expect(edge.dx).toBe(-10)
    expect(edge.dy).toBe(10)
  })
  it('is clamped for a pointer outside the window and safe in an empty one', () => {
    expect(parallaxShift(9999, 9999, 400, 600, 10)).toEqual({ dx: -10, dy: -10 })
    expect(parallaxShift(1, 1, 0, 0)).toEqual({ dx: 0, dy: 0 })
  })
})
