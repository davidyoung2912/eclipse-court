import { describe, expect, it } from 'vitest'
import { allSquares, BEACONS, CENTER, centerOf, defaultBeacons, fixedCourt, inBounds, isCycling, mirrorOf, ringOf, SIZE, sizeOf } from './board'
import { safeRadius } from './events'
import { DAY, duelMods, forecast, squareLuminance } from './luminance'
import { newGame } from '../reducer'

describe('board layout', () => {
  const squares = allSquares()
  it('has 26 fixed squares split 13/13 and a 23-square diamond', () => {
    expect(squares.filter((p) => isCycling(p))).toHaveLength(23)
    expect(squares.filter((p) => fixedCourt(p) === 'solari')).toHaveLength(13)
    expect(squares.filter((p) => fixedCourt(p) === 'umbral')).toHaveLength(13)
  })
  it('keeps home-edge middles fixed and the other beacons cycling', () => {
    expect(fixedCourt({ x: 0, y: 3 })).toBe('solari')
    expect(fixedCourt({ x: 6, y: 3 })).toBe('umbral')
    expect(BEACONS).toHaveLength(5)
    expect(BEACONS.filter((p) => isCycling(p))).toHaveLength(3)
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

describe('the 9x9 board', () => {
  const squares = allSquares(9)
  it('has 81 squares, a 39-square diamond of four rings and 21 fixed squares a side', () => {
    expect(squares).toHaveLength(81)
    expect(squares.filter((p) => isCycling(p, 9))).toHaveLength(39)
    expect(squares.filter((p) => fixedCourt(p, 9) === 'solari')).toHaveLength(21)
    expect(squares.filter((p) => fixedCourt(p, 9) === 'umbral')).toHaveLength(21)
    expect(Math.max(...squares.filter((p) => isCycling(p, 9)).map((p) => ringOf(p, 9)))).toBe(4)
  })
  it('puts the beacons and edge middles where the geometry says', () => {
    expect(centerOf(9)).toEqual({ x: 4, y: 4 })
    expect(defaultBeacons(9)).toEqual([{ x: 0, y: 4 }, { x: 8, y: 4 }, { x: 4, y: 4 }, { x: 4, y: 0 }, { x: 4, y: 8 }])
    expect(fixedCourt({ x: 0, y: 4 }, 9)).toBe('solari')
    expect(fixedCourt({ x: 8, y: 4 }, 9)).toBe('umbral')
    expect(mirrorOf({ x: 2, y: 5 }, 9)).toEqual({ x: 6, y: 5 })
    expect(inBounds({ x: 8, y: 8 }, 9)).toBe(true)
    expect(inBounds({ x: 8, y: 8 })).toBe(false)
  })
  it('leaves the 7x7 constants as they were', () => {
    expect(SIZE).toBe(7)
    expect(CENTER).toEqual({ x: 3, y: 3 })
    expect(sizeOf({})).toBe(7)
    expect(defaultBeacons()).toEqual(BEACONS)
  })
  it('plays on the larger board: mirrored armies, a ring-4 ripple and a wider showdown', () => {
    const g = newGame({ size: 9 })
    expect(g.pieces.filter((p) => p.court === 'umbral').every((p) => p.pos.x >= 6)).toBe(true)
    expect(g.pieces.find((p) => p.court === 'umbral' && p.role === 'leader')?.pos).toEqual({ x: 8, y: 3 })
    const s = { ...g, phase: 4 }
    expect(squareLuminance(s, { x: 4, y: 4 })).toBe(2)
    expect(squareLuminance(s, { x: 4, y: 0 })).toBe(squareLuminance({ ...g, phase: 0 }, { x: 4, y: 4 }))
    expect(safeRadius({ config: { ...g.config, showdown: true }, round: g.config.eclipseRound, eclipse: true })).toBe(4)
    expect(safeRadius({ config: { ...newGame().config, showdown: true }, round: 30, eclipse: true })).toBe(3)
  })
})
