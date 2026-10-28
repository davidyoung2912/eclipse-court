import { describe, expect, it } from 'vitest'
import { newGame } from './engine/reducer'
import type { Step } from './engine/log'
import type { Court, GameState } from './engine/rules/types'
import { LEADER_STOP_MS, METER_SEGMENTS, RAY_STEP_MS, leaderInDanger, leaderStopMs, meterSparks, rayDelay, slashEnds, streaksOf, winningSquares } from './boardDrama'

const base = newGame(1)
const at = (turn: Court, lost: number): GameState => ({ ...base, turn, pieces: base.pieces.slice(lost) })

describe('leaderStopMs', () => {
  it('freezes for a Leader and stays within 60 to 80ms', () => {
    expect(leaderStopMs(true, false)).toBe(LEADER_STOP_MS)
    expect(LEADER_STOP_MS).toBeGreaterThanOrEqual(60)
    expect(LEADER_STOP_MS).toBeLessThanOrEqual(80)
  })
  it('is none for other captures or reduced motion', () => {
    expect(leaderStopMs(false, false)).toBe(0)
    expect(leaderStopMs(true, true)).toBe(0)
  })
})

describe('slashEnds', () => {
  it('runs along the attack, and diagonally when the attacker did not move', () => {
    expect(slashEnds({ x: 0, y: 0 }, { x: 3, y: 0 }, 0.5)).toEqual({ dx: 0.5, dy: 0 })
    const d = slashEnds({ x: 2, y: 2 }, { x: 2, y: 2 }, 0.5)
    expect(Math.hypot(d.dx, d.dy)).toBeCloseTo(0.5, 2)
  })
})

describe('rayDelay', () => {
  it('sweeps from the Solari edge as the light rises and from the Umbral edge as it wanes', () => {
    expect(rayDelay({ x: 0, y: 0 }, 7, 1, false)).toBe(0)
    expect(rayDelay({ x: 3, y: 0 }, 7, 1, false)).toBe(3 * RAY_STEP_MS)
    expect(rayDelay({ x: 6, y: 0 }, 7, -1, false)).toBe(0)
  })
  it('rings out from the centre once the Eclipse has fallen', () => {
    expect(rayDelay({ x: 3, y: 3 }, 7, 1, true)).toBe(0)
    expect(rayDelay({ x: 3, y: 5 }, 7, 1, true)).toBe(2 * RAY_STEP_MS)
  })
})

describe('leaderInDanger', () => {
  it('is true only when the court\'s Leader is among the endangered', () => {
    const leader = base.pieces.find((p) => p.court === 'solari' && p.role === 'leader')!
    expect(leaderInDanger(base, 'solari', [leader.id])).toBe(true)
    expect(leaderInDanger(base, 'solari', [])).toBe(false)
    expect(leaderInDanger(base, 'umbral', [leader.id])).toBe(false)
  })
})

describe('winningSquares', () => {
  it('finds nothing at the start, or out of turn', () => {
    expect(winningSquares(base, 'solari')).toEqual([])
    expect(winningSquares(base, 'umbral')).toEqual([])
  })
  it('finds the beacon that completes the set', () => {
    const beacons = base.config.beacons
    const last = beacons[beacons.length - 1]
    const solari = base.pieces.filter((p) => p.court === 'solari')
    const mover = solari.find((p) => p.role === 'flier')!
    const others = solari.filter((p) => p.id !== mover.id).slice(0, beacons.length - 1)
    // Park a Solari piece on every beacon but the last; the Flier stands a long hop away from it.
    const pieces = base.pieces.map((p) => {
      const i = others.findIndex((o) => o.id === p.id)
      if (i >= 0) return { ...p, pos: beacons[i] }
      if (p.id === mover.id) return { ...p, pos: { x: last.x, y: last.y === 6 ? 4 : 2 } }
      return p
    })
    const state: GameState = { ...base, turn: 'solari', pieces }
    expect(winningSquares(state, 'solari')).toEqual([last])
  })
})

describe('streaksOf', () => {
  it('tracks each court\'s running streak', () => {
    const out: Step[] = [{ state: at('solari', 0), action: null }]
    ;[1, 2, 3].forEach((t, i) => out.push({ state: at(i % 2 === 0 ? 'umbral' : 'solari', t), action: { type: 'pass' } }))
    expect(streaksOf(out)).toEqual({ solari: 2, umbral: 1 })
  })
})

describe('meterSparks', () => {
  it('starts at two captures and grows to a cap', () => {
    expect(meterSparks(1)).toBe(0)
    expect(meterSparks(3)).toBeGreaterThan(meterSparks(2))
    expect(meterSparks(40)).toBe(12)
    expect(METER_SEGMENTS).toBe(5)
  })
})
