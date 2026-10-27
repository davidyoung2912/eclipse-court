import { describe, expect, it } from 'vitest'
import { MATCHUP_DATA } from '../engine/data/matchupData'
import { matchup } from '../engine/data/matchups'
import { estimateOdds } from '../engine/reducer'
import { draftGames, reportOn } from './draft'
import { checkInvariants, playGame } from './game'
import { COURTS } from '../engine/rules/board'
import { fresh, LUMS, ROLES, roleStrength } from './matchups'
import type { MatchupTable } from '../engine/data/matchups'

describe('matchup table', () => {
  const table = MATCHUP_DATA as MatchupTable

  it('covers every pairing at every luminance with sane numbers', () => {
    for (const court of COURTS)
      for (const a of ROLES)
        for (const d of ROLES) {
          expect(table[court][a][d]).toHaveLength(LUMS.length)
          for (const m of table[court][a][d]) {
            expect(m.attacker + m.defender).toBeLessThanOrEqual(1.001)
            expect(m.attackerKeeps).toBeLessThanOrEqual(1)
            expect(m.defenderKeeps).toBeLessThanOrEqual(1)
          }
        }
  })

  it('keeps every role between hopeless and unbeatable', () => {
    for (const role of ROLES) {
      const s = roleStrength(table, role)
      expect(s).toBeGreaterThan(0.1)
      expect(s).toBeLessThan(0.8)
    }
  })

  it('favours the court the light favours', () => {
    const a = fresh('solari', 'footsoldier', 'a')
    const d = fresh('umbral', 'footsoldier', 'd')
    expect(matchup(a, d, 2).attacker).toBeGreaterThan(matchup(a, d, -2).attacker)
  })

  it('feeds the odds bar for fresh pieces', () => {
    const o = estimateOdds(fresh('solari', 'charger', 'a'), fresh('umbral', 'footsoldier', 'd'), 0)
    expect(o.attacker).toBeGreaterThan(0.8)
    expect(o.attacker + o.defender + o.other).toBeCloseTo(1)
  })
})

describe('AI-vs-AI soak', () => {
  it('finishes full games with real duels, keeping the board consistent', () => {
    for (const [seed, solari, umbral] of [[1, 'easy', 'normal'], [2, 'normal', 'easy'], [3, 'normal', 'normal']] as const) {
      const r = playGame(seed, solari, umbral)
      expect(r.problems).toEqual([])
      expect(r.state.winner).not.toBeNull()
      expect(checkInvariants(r.state)).toEqual([])
    }
  }, 120_000)
})

describe('drafted armies', () => {
  it('play to a finish on every board without breaking the board', () => {
    const results = draftGames(4, 3)
    expect(results.every((r) => r.winner !== null)).toBe(true)
    const report = reportOn(results, 1)
    expect(report.played).toBe(4)
    expect(report.solariWins + report.umbralWins).toBeLessThanOrEqual(4)
  }, 120_000)
})
