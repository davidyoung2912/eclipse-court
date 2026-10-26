import { describe, expect, it } from 'vitest'
import { allSquares, BEACONS, fixedCourt, isCycling, ringOf } from './board'
import { DAY, duelMods, forecast, squareLuminance } from './luminance'
import { newGame } from '../reducer'

describe('board layout', () => {
  const squares = allSquares()
  it('has 26 fixed squares split 13/13 and a 23-square diamond', () => {
    expect(squares.filter(isCycling)).toHaveLength(23)
    expect(squares.filter((p) => fixedCourt(p) === 'solari')).toHaveLength(13)
    expect(squares.filter((p) => fixedCourt(p) === 'umbral')).toHaveLength(13)
  })
  it('keeps home-edge middles fixed and the other beacons cycling', () => {
    expect(fixedCourt({ x: 0, y: 3 })).toBe('solari')
    expect(fixedCourt({ x: 6, y: 3 })).toBe('umbral')
    expect(BEACONS).toHaveLength(5)
    expect(BEACONS.filter(isCycling)).toHaveLength(3)
  })
})

describe('luminance', () => {
  const g = newGame()
  it('ripples outward: each ring shows what the inner ring showed a step ago', () => {
    for (let phase = 0; phase < 8; phase++) {
      for (let ring = 1; ring <= 3; ring++) {
        const outer = squareLuminance({ ...g, phase }, { x: 3, y: 3 - ring })
        const inner = squareLuminance({ ...g, phase: phase - 1 }, { x: 3, y: 3 - ring + 1 })
        expect(outer).toBe(inner)
      }
    }
  })
  it('runs the 8-step day and lags each ring', () => {
    expect(DAY).toEqual([-2, -1, 0, 1, 2, 1, 0, -1])
    const s = { ...g, phase: 4 }
    expect(squareLuminance(s, { x: 3, y: 3 })).toBe(2)
    expect(squareLuminance(s, { x: 3, y: 2 })).toBe(1)
    expect(ringOf({ x: 3, y: 0 })).toBe(3)
  })
  it('pins fixed squares and freezes the diamond in the Eclipse', () => {
    const s = { ...g, phase: 4, eclipse: true }
    expect(squareLuminance(s, { x: 0, y: 0 })).toBe(2)
    expect(squareLuminance(s, { x: 6, y: 6 })).toBe(-2)
    expect(squareLuminance(s, { x: 3, y: 3 })).toBe(0)
    expect(forecast(s)).toEqual([0, 0, 0])
  })
  it('forecasts the next three center steps', () => {
    expect(forecast({ ...g, phase: 0 })).toEqual([-1, 0, 1])
    expect(forecast({ ...g, phase: 0, dir: -1 })).toEqual([-1, 0, 1].map((_, i) => DAY[(8 - (i + 1)) % 8]))
  })
  it('gives the favoured court up to +30% damage and -20% taken', () => {
    expect(duelMods('solari', 0)).toEqual({ dealt: 1, taken: 1 })
    expect(duelMods('solari', 1).dealt).toBeCloseTo(1.15)
    expect(duelMods('solari', 2)).toEqual({ dealt: 1.3, taken: 0.8 })
    expect(duelMods('umbral', 2)).toEqual({ dealt: 1, taken: 1 })
    expect(duelMods('umbral', -2).dealt).toBeCloseTo(1.3)
  })
})
