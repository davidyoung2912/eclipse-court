import { describe, expect, it } from 'vitest'
import { padChord, padCutoff } from './synth'

describe('pad', () => {
  it('rises in pitch and opens the filter as the light grows', () => {
    expect(padChord(2)[0]).toBeGreaterThan(padChord(0)[0])
    expect(padChord(0)[0]).toBeGreaterThan(padChord(-2)[0])
    expect(padCutoff(2)).toBeGreaterThan(padCutoff(-2))
  })

  it('is major when light, minor when dark, suspended at dusk', () => {
    const third = (lum: number) => {
      const [root, t] = padChord(lum)
      return Math.round(12 * Math.log2(t / root))
    }
    expect(third(1)).toBe(4)
    expect(third(-1)).toBe(3)
    expect(third(0)).toBe(5)
  })

  it('always gives four voices', () => {
    for (const lum of [-2, -1, 0, 1, 2]) expect(padChord(lum)).toHaveLength(4)
  })
})
