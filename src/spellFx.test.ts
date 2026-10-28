import { describe, expect, it } from 'vitest'
import { ALL_SPELLS } from './engine/rules/spells'
import { newGame } from './engine/reducer'
import { arcPoint, beaconPickups, BLOOM_MS, castPath, ECLIPSE_CINEMA_MS, eclipseCinemaMs, impactDelayMs, SPELL_FX, toScreen, CHARGE_MS, TRAVEL_MS } from './spellFx'

const game = () => newGame(1)

describe('spell and Eclipse spectacle', () => {
  it('holds the Eclipse cinematic only when motion is allowed', () => {
    expect(eclipseCinemaMs(false)).toBe(ECLIPSE_CINEMA_MS)
    expect(eclipseCinemaMs(true)).toBe(0)
  })

  it('gives every spell a signature look', () => {
    for (const spell of ALL_SPELLS) expect(SPELL_FX[spell]).toBeDefined()
  })

  it('lands a bolt after the charge and the crossing, but a bloom straight after the charge', () => {
    expect(impactDelayMs('bloom')).toBe(CHARGE_MS)
    expect(impactDelayMs('bolt')).toBe(CHARGE_MS + TRAVEL_MS)
    expect(BLOOM_MS).toBeGreaterThan(0)
  })

  it('maps screen squares the way the board does', () => {
    expect(toScreen({ x: 0, y: 0 }, false, 7)).toEqual({ cx: 0.5, cy: 6.5 })
    expect(toScreen({ x: 0, y: 0 }, true, 7)).toEqual({ cx: 6.5, cy: 0.5 })
  })

  it('reads the path of a cast from the Leader to its target', () => {
    const state = game()
    const leader = state.pieces.find((p) => p.court === 'solari' && p.role === 'leader')!
    const ally = state.pieces.find((p) => p.court === 'solari' && p.role !== 'leader')!
    expect(castPath(state, 'solari', 'hold')).toEqual({ from: leader.pos, to: leader.pos })
    expect(castPath(state, 'solari', 'mend', ally.id)).toEqual({ from: leader.pos, to: ally.pos })
    expect(castPath(state, 'solari', 'conjure', undefined, { x: 2, y: 2 })).toEqual({ from: leader.pos, to: { x: 2, y: 2 } })
    expect(castPath(state, 'solari', 'exchange', ally.id, { x: 3, y: 3 })).toEqual({ from: ally.pos, to: { x: 3, y: 3 } })
  })

  it('finds the pieces that stepped onto a beacon', () => {
    const before = game()
    const beacon = before.config.beacons[0]
    const mover = before.pieces[0]
    const after = { ...before, pieces: before.pieces.map((p) => (p.id === mover.id ? { ...p, pos: beacon } : p)) }
    expect(beaconPickups(before, after)).toEqual([{ pos: beacon, court: mover.court }])
    expect(beaconPickups(before, before)).toEqual([])
  })

  it('arcs a pickup from start to finish, bowing upward in between', () => {
    const a = { x: 0, y: 100 }
    const b = { x: 100, y: 0 }
    expect(arcPoint(a, b, 0)).toEqual(a)
    expect(arcPoint(a, b, 1).x).toBeCloseTo(100)
    expect(arcPoint(a, b, 1).y).toBeCloseTo(0)
    expect(arcPoint(a, b, 0.5).y).toBeLessThan(50)
  })
})
