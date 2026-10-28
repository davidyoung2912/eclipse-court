import { describe, expect, it } from 'vitest'
import { ambientLight, chargeAura, COMBO_WINDOW, comboHit, comboPitch, comboTick, easeTo, flareFor, followZoom, loserFade, NO_COMBO, telegraphFill } from './duelPresentation'

describe('follow zoom', () => {
  it('tightens as fighters close in and as health falls, and is off under reduced motion', () => {
    expect(followZoom(2, 1, false)).toBeGreaterThan(followZoom(8, 1, false))
    expect(followZoom(8, 0.1, false)).toBeGreaterThan(followZoom(8, 1, false))
    expect(followZoom(0, 0, false)).toBeLessThanOrEqual(0.08)
    expect(followZoom(0, 0, true)).toBe(0)
  })
  it('eases toward a target without overshooting', () => {
    const v = easeTo(0, 1, 5, 0.1)
    expect(v).toBeGreaterThan(0)
    expect(v).toBeLessThan(1)
    expect(easeTo(0, 1, 5, 0)).toBe(0)
  })
})

describe('telegraphs and light', () => {
  it('grows the charge aura with the charge and hides it when idle', () => {
    expect(chargeAura(0)).toBeNull()
    expect(chargeAura(1)!.radius).toBeGreaterThan(chargeAura(0.2)!.radius)
    expect(chargeAura(5)!.strength).toBeLessThanOrEqual(1)
  })
  it('fills a landing decal from empty to full', () => {
    expect(telegraphFill(1, 1)).toBe(0)
    expect(telegraphFill(0, 1)).toBe(1)
    expect(telegraphFill(0.5, 0)).toBe(1)
  })
  it('flares the arena light on a hit and keeps it in range', () => {
    expect(ambientLight(0, 1, flareFor(3))).toBeGreaterThan(ambientLight(0, 1, 0))
    for (let t = 0; t < 5; t += 0.1) {
      const a = ambientLight(t, 0.2, 0.5)
      expect(a).toBeGreaterThanOrEqual(0)
      expect(a).toBeLessThanOrEqual(1)
    }
  })
})

describe('combo pitch', () => {
  it('counts hits by one fighter and restarts when the other replies or time runs out', () => {
    let c = comboHit(NO_COMBO, 0)
    c = comboHit(c, 0)
    expect(c.count).toBe(2)
    expect(comboHit(c, 1).count).toBe(1)
    expect(comboTick(c, COMBO_WINDOW + 0.1)).toEqual(NO_COMBO)
    expect(comboHit(comboTick(c, COMBO_WINDOW + 0.1), 0).count).toBe(1)
  })
  it('rises a semitone per hit up to an octave', () => {
    expect(comboPitch(1)).toBe(1)
    expect(comboPitch(2)).toBeCloseTo(2 ** (1 / 12))
    expect(comboPitch(99)).toBe(2)
  })
})

describe('loser fade', () => {
  it('dissolves to nothing', () => {
    expect(loserFade(0)).toEqual({ alpha: 1, scale: 1 })
    expect(loserFade(5).alpha).toBe(0)
    expect(loserFade(5).scale).toBeLessThan(1)
  })
})
