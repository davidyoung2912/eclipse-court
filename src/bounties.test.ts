import { describe, expect, it } from 'vitest'
import { bountiesFor, BOUNTIES, BOUNTIES_PER_DAY } from './engine/data/bounties'
import { claimBounties, claimedOn } from './bounties'
import type { Summary } from './engine/data/summary'

const flawless: Summary = { won: true, draw: false, lost: 0, taken: 6, turns: 8, swift: true, spellsCast: 3, difficulty: 'normal', campaignIndex: null, daily: false }

describe('bounties', () => {
  it('draws the same distinct bounties for a day', () => {
    const a = bountiesFor(20261101)
    expect(a).toHaveLength(BOUNTIES_PER_DAY)
    expect(new Set(a.map((b) => b.id)).size).toBe(BOUNTIES_PER_DAY)
    expect(bountiesFor(20261101)).toEqual(a)
    expect(new Set(Array.from({ length: 20 }, (_, i) => bountiesFor(20261101 + i).map((b) => b.id).join())).size).toBeGreaterThan(5)
    expect(BOUNTIES.every((b) => b.shards > 0)).toBe(true)
  })
  it('claims a bounty once a day', () => {
    const day = 20261105
    const first = claimBounties(flawless, day)
    expect(first.length).toBeGreaterThan(0)
    expect(claimedOn(day)).toEqual(first.map((b) => b.id))
    expect(claimBounties(flawless, day)).toEqual([])
    expect(claimedOn(day + 1)).toEqual([])
  })
})
