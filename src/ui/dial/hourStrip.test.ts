import { describe, expect, it } from 'vitest'
import { hourStrip } from './hourStrip'

const s = (round: number, eclipse: boolean, dir: 1 | -1 = 1) => ({ round, eclipse, dir, config: { eclipseRound: 5 } }) as never

describe('hourStrip', () => {
  it('starts at dawn and rises with the rounds', () => {
    expect(hourStrip(s(1, false))).toEqual({ hour: 'rising', at: 0 })
    expect(hourStrip(s(3, false)).at).toBe(0.5)
  })
  it('follows the dial direction', () => {
    expect(hourStrip(s(2, false, -1)).hour).toBe('waning')
  })
  it('ends at the Eclipse and never overshoots', () => {
    expect(hourStrip(s(5, false)).at).toBe(1)
    expect(hourStrip(s(9, false)).at).toBe(1)
    expect(hourStrip(s(5, true))).toEqual({ hour: 'eclipse', at: 1 })
  })
})
