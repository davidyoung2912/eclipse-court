import { describe, expect, it } from 'vitest'
import { claimMastery, levelOf, LEVEL_POINTS, masterySnapshot, parseMastery, rewardUpTo, standings, togglePin, TRACKS } from './mastery'
import { emptyProgress, recordReview, STAR_FLAWLESS, STAR_SWIFT, STAR_WIN } from './progress'
import { CAMPAIGN } from './engine/data/campaign'
import { shopSnapshot } from './shop'

describe('mastery levels', () => {
  it('climb a strictly rising ladder', () => {
    expect([...LEVEL_POINTS].sort((a, b) => a - b)).toEqual([...LEVEL_POINTS])
    expect(levelOf(0)).toBe(0)
    expect(levelOf(LEVEL_POINTS[0])).toBe(1)
    expect(levelOf(10_000)).toBe(LEVEL_POINTS.length)
  })

  it('count each track from progress', () => {
    const p = { ...emptyProgress(), battles: { [CAMPAIGN[0].id]: STAR_WIN | STAR_FLAWLESS | STAR_SWIFT }, gauntlet: { runs: 1, won: 0, best: 2 } }
    const by = Object.fromEntries(standings(p).map((s) => [s.track.id, s.points]))
    expect(by.campaign).toBe(4)
    expect(by.gauntlet).toBe(5)
    expect(by.puzzles).toBe(0)
    expect(TRACKS).toHaveLength(6)
  })

  it('pay each level once', () => {
    const p = { ...emptyProgress(), puzzles: [] as string[], gauntlet: { runs: 3, won: 0, best: 0 } }
    const before = shopSnapshot().shards
    expect(claimMastery(p)).toBe(rewardUpTo(1))
    expect(shopSnapshot().shards).toBe(before + rewardUpTo(1))
    expect(claimMastery(p)).toBe(0)
    expect(claimMastery({ ...p, gauntlet: { runs: 8, won: 0, best: 0 } })).toBe(rewardUpTo(2) - rewardUpTo(1))
  })
})

describe('showcase', () => {
  it('holds three pins and drops unknown ids', () => {
    expect(parseMastery({ showcase: ['first-win', 'nope', 'first-win', 'wins-10', 'wins-25', 'wins-50'] }).showcase).toEqual(['first-win', 'wins-10', 'wins-25'])
    expect(togglePin('first-win')).toBe(true)
    expect(togglePin('wins-10') && togglePin('wins-25')).toBe(true)
    expect(togglePin('wins-50')).toBe(false)
    expect(masterySnapshot().showcase).toHaveLength(3)
    expect(togglePin('first-win')).toBe(true)
    expect(masterySnapshot().showcase).toHaveLength(2)
  })

  it('repairs damaged data', () => {
    expect(parseMastery(null)).toEqual({ claimed: {}, showcase: [], lastCourt: null })
    expect(parseMastery({ claimed: { puzzles: 99, campaign: -1 }, lastCourt: 'x' }).claimed).toEqual({ puzzles: LEVEL_POINTS.length })
  })
})

describe('review achievements', () => {
  const ids = (p: ReturnType<typeof recordReview>) => p.earned.map((a) => a.id)

  it('reward a clean, accurate game and ignore short ones', () => {
    const base = emptyProgress()
    expect(ids(recordReview(base, { moves: 12, accuracy: 99, mistakes: 0, won: true }))).toEqual(
      expect.arrayContaining(['review-first', 'review-clean', 'review-sharp', 'review-perfect', 'review-win-clean']),
    )
    expect(ids(recordReview(base, { moves: 3, accuracy: 100, mistakes: 0, won: true }))).toEqual(['review-first'])
    expect(ids(recordReview(base, { moves: 12, accuracy: 70, mistakes: 2, won: false }))).toEqual(['review-first'])
  })
})
