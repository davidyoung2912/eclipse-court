import { describe, expect, it } from 'vitest'
import { cueDue, CUE_GAP_MS, hourBed, uiCueFor } from './cues'

// The day runs -2, -1, 0, 1, 2, 1, 0, -1 from phase 0.
const TROUGH = 0
const PEAK = 4

describe('interface cues', () => {
  it('confirms a primary button, taps a plain one and denies a disabled one', () => {
    expect(uiCueFor({ primary: true, disabled: false })).toBe('confirm')
    expect(uiCueFor({ primary: false, disabled: false })).toBe('tap')
    expect(uiCueFor({ primary: true, disabled: true })).toBe('deny')
  })
  it('waits out the gap between sounds', () => {
    expect(cueDue(100, 100 - CUE_GAP_MS)).toBe(true)
    expect(cueDue(100, 100 - CUE_GAP_MS + 1)).toBe(false)
  })
})

describe('hour bed', () => {
  it('lifts the shimmer with the light and sinks it with the dark', () => {
    const bright = hourBed({ phase: PEAK, dir: 1, eclipse: false })
    const dark = hourBed({ phase: TROUGH, dir: -1, eclipse: false })
    expect(bright.shimmerHz).toBeGreaterThan(dark.shimmerHz)
    expect(bright.shimmerMul).toBeGreaterThan(dark.shimmerMul)
  })
  it('turns the fifth minor when the day wanes', () => {
    expect(hourBed({ phase: 2, dir: 1, eclipse: false }).fifthHz).toBeGreaterThan(hourBed({ phase: 2, dir: -1, eclipse: false }).fifthHz)
  })
  it('hushes the shimmer in the Eclipse', () => {
    const e = hourBed({ phase: PEAK, dir: 1, eclipse: true })
    expect(e.shimmerMul).toBeLessThan(hourBed({ phase: TROUGH, dir: -1, eclipse: false }).shimmerMul)
  })
})
