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
    const p = { ...emptyProgress(), battles: { novice: 1, archerless: 1, 'tongue-tied': 1 } }
    expect(primaryAction(p, false, false)).toEqual({ kind: 'campaign', label: 'Continue Campaign · Battle 4' })
  })

  it('falls back to a skirmish once the campaign is cleared', () => {
    const p = { ...emptyProgress(), battles: Object.fromEntries(CAMPAIGN.map((o) => [o.id, 1])) }
    expect(primaryAction(p, false, false).kind).toBe('skirmish')
  })
})

describe('cardSummaries', () => {
  const story = { read: new Set<string>(), characters: {}, losses: {}, ending: null }

  it('reads empty progress', () => {
    const s = cardSummaries(emptyProgress(), 20260101, story)
    expect(s.battle.lines[0]).toBe('Skirmish · Practice · Codes')
    expect(s.campaign.lines[0]).toBe(`0 of ${CAMPAIGN.length} beaten · 0★`)
    expect(s.gauntlet.lines[0]).toBe('No runs yet')
    expect(s.puzzles.lines[0]).toBe(`0 of ${PUZZLES.length} solved`)
    expect(s.puzzles.fraction).toBe(0)
    expect(s.streak).toBe(0)
  })

  it('counts solved puzzles, the best gauntlet stage and a live daily streak', () => {
    let p = recordPuzzle(emptyProgress(), PUZZLES[0].id, false).progress
    p = { ...p, gauntlet: { runs: 2, won: 0, best: 4 } }
    p = recordDaily(p, { date: 20260101, won: true, turns: 9, lost: 1 }).progress
    const s = cardSummaries(p, 20260101, story)
    expect(s.puzzles.lines[0]).toBe(`1 of ${PUZZLES.length} solved`)
    expect(s.gauntlet.lines).toEqual(['Best: stage 4 of 8', '0 wins in 2 runs'])
    expect(s.gauntlet.fraction).toBe(0.5)
    expect(s.streak).toBe(1)
  })

  it('summarises skirmishes, practice and friend games on the Battle card', () => {
    const p = { ...emptyProgress(), areas: { ...emptyProgress().areas, skirmish: { games: 4, wins: 3, losses: 1, draws: 0 }, practice: { games: 1, wins: 1, losses: 0, draws: 0 } } }
    expect(cardSummaries(p, 20260101, story).battle.lines).toEqual(['4 skirmishes · 75% won', '1 duel · 0 friend games'])
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
