import { describe, expect, it } from 'vitest'
import { CAMPAIGN } from '../../engine/data/campaign'
import { PUZZLES } from '../../engine/data/puzzles'
import { emptyProgress, recordDaily, recordPuzzle } from '../../progress'
import { rulesetById } from '../../engine/data/setups'
import { cardSummaries, changedRuleSections, changedSections, primaryAction } from './menuModel'

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

describe('changedSections', () => {
  const standard = rulesetById('standard')!.rules
  const plain = { rules: standard, armyMode: 'classic', boardId: 'classic', spellMode: 'classic' as const }

  it('flags nothing for a tier left at its defaults', () => {
    expect(changedSections(plain, standard)).toEqual([])
  })

  it('flags the section each changed rule lives in', () => {
    const v = { ...plain, rules: { ...standard, winMode: 'hill' as const, events: true, clock: { seconds: 15 }, recharge: 8 } }
    expect(changedSections(v, standard).sort()).toEqual(['clock', 'hazards', 'spells', 'win'])
  })

  it('flags the army, the board and a loadout', () => {
    expect(changedSections({ ...plain, armyMode: 'draft' }, standard)).toEqual(['army'])
    expect(changedSections({ ...plain, boardId: 'ruins' }, standard)).toEqual(['army'])
    expect(changedSections({ ...plain, spellMode: 'loadout' }, standard)).toEqual(['spells'])
  })

  it('compares against the tier, so Classic showdown-off is not a change there', () => {
    const classic = rulesetById('classic')!.rules
    expect(changedSections({ ...plain, rules: classic }, classic)).toEqual([])
    expect(changedRuleSections(standard, classic)).toEqual(['hazards'])
  })
})
