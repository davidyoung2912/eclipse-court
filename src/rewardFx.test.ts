import { describe, expect, it } from 'vitest'
import { burstCount, confettiCount, confettiPieces, FLIP_MS, flashScale, pulseHz, REVEAL_SPARKS } from './rewardFx'
import { flashesReduced } from './settings'

describe('rewardFx', () => {
  it('bursts more coins for bigger payouts, never a flood, and none for nothing', () => {
    expect(burstCount(0)).toBe(0)
    expect(burstCount(-3)).toBe(0)
    expect(burstCount(5)).toBeLessThan(burstCount(60))
    expect(burstCount(100000)).toBe(18)
  })

  it('showers confetti only on a first win with flashes allowed', () => {
    expect(confettiCount(true, false)).toBeGreaterThan(0)
    expect(confettiCount(false, false)).toBe(0)
    expect(confettiCount(true, true)).toBe(0)
  })

  it('fans out the requested number of confetti pieces the same way each time', () => {
    const a = confettiPieces(12)
    expect(a).toHaveLength(12)
    expect(confettiPieces(12)).toEqual(a)
    expect(confettiPieces(-1)).toEqual([])
    expect(a.every((p) => p.angle > -200 && p.angle < 20)).toBe(true)
  })

  it('lets rarer cosmetics linger and sparkle more', () => {
    const order = ['common', 'uncommon', 'rare', 'epic', 'legend'] as const
    for (let i = 1; i < order.length; i++) {
      expect(FLIP_MS[order[i]]).toBeGreaterThan(FLIP_MS[order[i - 1]])
      expect(REVEAL_SPARKS[order[i]]).toBeGreaterThan(REVEAL_SPARKS[order[i - 1]])
    }
  })

  it('gates flashes and pulses', () => {
    expect(flashScale(false)).toBe(1)
    expect(flashScale(true)).toBe(0)
    expect(pulseHz(2.8, false)).toBeLessThan(3)
    expect(pulseHz(1.5, false)).toBe(1.5)
    expect(pulseHz(2, true)).toBe(0)
  })

  it('reduces flashes on request and whenever motion is reduced', () => {
    expect(flashesReduced({ reduceMotion: false, reduceFlashes: false })).toBe(false)
    expect(flashesReduced({ reduceMotion: false, reduceFlashes: true })).toBe(true)
    expect(flashesReduced({ reduceMotion: true, reduceFlashes: false })).toBe(true)
  })
})
