import { describe, expect, it } from 'vitest'
import {
  debrisCount, GHOST_DRAIN, GHOST_HOLD, healthColor, hitStopFor, lowHealthPulse, punchFor, shockwaveRadius, stepGhost, struck,
} from './duelImpact'

describe('hit-stop and punch', () => {
  it('freezes longer for heavier hits, and longest for the killing blow', () => {
    expect(hitStopFor(2, false)).toBeGreaterThan(hitStopFor(1, false))
    expect(hitStopFor(99, false)).toBeLessThanOrEqual(0.13)
    expect(hitStopFor(1, true)).toBeGreaterThan(hitStopFor(99, false))
  })
  it('punches the camera in more for heavier hits and not at all when motion is reduced', () => {
    expect(punchFor(3, false, false)).toBeGreaterThan(punchFor(1, false, false))
    expect(punchFor(99, false, false)).toBeLessThanOrEqual(0.06)
    expect(punchFor(1, true, false)).toBeGreaterThan(punchFor(99, false, false))
    expect(punchFor(3, true, true)).toBe(0)
  })
})

describe('ghost health', () => {
  it('holds after a hit, then drains to the real health', () => {
    let g = struck({ value: 1, hold: 0 })
    g = stepGhost(g, 0.6, 0.1)
    expect(g.value).toBe(1)
    g = stepGhost(g, 0.6, GHOST_HOLD)
    expect(g.hold).toBe(0)
    g = stepGhost(g, 0.6, 0.1)
    expect(g.value).toBeCloseTo(1 - GHOST_DRAIN * 0.1)
    g = stepGhost(g, 0.6, 10)
    expect(g.value).toBe(0.6)
  })
  it('snaps up when health rises', () => {
    expect(stepGhost({ value: 0.4, hold: 0.2 }, 0.7, 0.1)).toEqual({ value: 0.7, hold: 0 })
  })
})

describe('health colour and low-health pulse', () => {
  it('goes green, amber, red', () => {
    expect(healthColor(1)).toBe('#6fe08a')
    expect(healthColor(0.5)).toBe('#f2c14e')
    expect(healthColor(0.2)).toBe('#ff5a64')
  })
  it('only pulses when low and alive, faster and stronger as health falls', () => {
    expect(lowHealthPulse(0.5)).toBeNull()
    expect(lowHealthPulse(0)).toBeNull()
    const a = lowHealthPulse(0.3)!
    const b = lowHealthPulse(0.05)!
    expect(b.hz).toBeGreaterThan(a.hz)
    expect(b.strength).toBeGreaterThan(a.strength)
    expect(b.strength).toBeLessThanOrEqual(1)
  })
})

describe('impact size', () => {
  it('grows the shockwave and debris with damage, with debris off when motion is reduced', () => {
    expect(shockwaveRadius(3)).toBeGreaterThan(shockwaveRadius(1))
    expect(shockwaveRadius(99)).toBe(3)
    expect(debrisCount(3, false)).toBeGreaterThan(debrisCount(1, false))
    expect(debrisCount(3, true)).toBe(0)
  })
})
