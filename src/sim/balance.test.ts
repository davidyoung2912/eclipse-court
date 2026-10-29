import { describe, expect, it } from 'vitest'
import { bandFor, courtsInBand, MODE_BATCH, modeBalance, solariShare, STYLE_BAND, styleScores } from './balance'
import type { MatchMode } from '../engine/rules/types'

describe('balance bands', () => {
  it('widens the band for small batches and tightens it towards 40-60%', () => {
    expect(bandFor(10).hi).toBeGreaterThan(bandFor(100).hi)
    expect(bandFor(10_000).lo).toBeCloseTo(0.4 - 0.0075, 2)
  })

  it('scores wins as one point and draws as half, ignoring unfinished games', () => {
    expect(solariShare(['solari', 'umbral', 'draw', null])).toBeCloseTo(0.5)
    expect(solariShare([null])).toBe(0.5)
    expect(courtsInBand(0.95, 20)).toBe(false)
    expect(courtsInBand(0.55, 20)).toBe(true)
  })
})

// Seeded and deterministic: these fail only when a rule or AI change shifts the results, so a failure
// means "rerun `npm run courts`, `npm run modes` and `npm run styles` and judge the larger sample".
describe('balance guard', () => {
  for (const [mode, games] of Object.entries(MODE_BATCH) as [MatchMode, number][])
    it(`keeps the courts even in ${mode}`, () => {
      const r = modeBalance(mode, games)
      expect(r.unfinished).toBe(0)
      expect(courtsInBand(r.share, r.games), `Solari scored ${r.share}`).toBe(true)
    }, 120_000)

  it('keeps every play style within its band', () => {
    for (const s of styleScores()) {
      expect(s.unfinished).toBe(0)
      const share = s.points / s.played
      expect(share, s.style).toBeGreaterThanOrEqual(STYLE_BAND.lo)
      expect(share, s.style).toBeLessThanOrEqual(STYLE_BAND.hi)
    }
  }, 120_000)
})
