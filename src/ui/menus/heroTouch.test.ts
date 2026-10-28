import { describe, expect, it } from 'vitest'
import { heroReaction, nextRun, TAP_RUN_MS } from './heroTouch'

describe('heroReaction', () => {
  it('has the Solarch answer the sun and the Duskmother the moon', () => {
    expect(heroReaction('sun', 1).leader).toBe('solari')
    expect(heroReaction('moon', 1).leader).toBe('umbral')
  })

  it('flares big on every fifth tap of a run', () => {
    expect([1, 2, 3, 4, 5, 6, 10].map((n) => heroReaction('sun', n).big)).toEqual([false, false, false, false, true, false, true])
  })
})

describe('nextRun', () => {
  it('continues a quick run and restarts after a pause', () => {
    expect(nextRun(2, 300)).toBe(3)
    expect(nextRun(4, TAP_RUN_MS + 1)).toBe(1)
  })
})
