import { describe, expect, it } from 'vitest'
import { CAMPAIGN } from '../../engine/data/campaign'
import { PUZZLES } from '../../engine/data/puzzles'
import { emptyProgress, recordDaily, recordPuzzle } from '../../progress'
import { cardSummaries, primaryAction } from './menuModel'

describe('primaryAction', () => {
  it('puts an unfinished game before everything else', () => {
    expect(primaryAction(emptyProgress(), true, true).kind).toBe('resume')
  })

  it('offers the tutorial on the first run', () => {
    expect(primaryAction(emptyProgress(), false, true).kind).toBe('learn')
  })

  it('starts, then continues, the campaign', () => {
    expect(primaryAction(emptyProgress(), false, false)).toEqual({ kind: 'campaign', label: 'Start Campaign' })
    const p = { ...emptyProgress(), cleared: 3 }
    expect(primaryAction(p, false, false)).toEqual({ kind: 'campaign', label: 'Continue Campaign · Battle 4' })
  })

  it('falls back to a skirmish once the campaign is cleared', () => {
    const p = { ...emptyProgress(), cleared: CAMPAIGN.length }
    expect(primaryAction(p, false, false).kind).toBe('skirmish')
  })
})

describe('cardSummaries', () => {
  it('reads empty progress', () => {
    expect(cardSummaries(emptyProgress(), 20260101)).toEqual({
      campaign: `0 of ${CAMPAIGN.length * 3} stars`,
      gauntlet: 'No runs yet',
      puzzles: `0 of ${PUZZLES.length} solved`,
      streak: 0,
    })
  })

  it('counts solved puzzles, the best gauntlet stage and a live daily streak', () => {
    let p = recordPuzzle(emptyProgress(), PUZZLES[0].id, false).progress
    p = { ...p, gauntlet: { runs: 2, won: 0, best: 4 } }
    p = recordDaily(p, { date: 20260101, won: true, turns: 9, lost: 1 }).progress
    const s = cardSummaries(p, 20260101)
    expect(s.puzzles).toBe(`1 of ${PUZZLES.length} solved`)
    expect(s.gauntlet).toBe('Best: stage 4')
    expect(s.streak).toBe(1)
  })
})
