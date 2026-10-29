import { describe, expect, it } from 'vitest'
import { COSMETICS } from './engine/data/cosmetics'
import { BANNERS, SEASON_TIERS, XP_PER_TIER, rewardFor, seasonDaysLeft, seasonId, tierProgress, tierReached, xpFor } from './engine/data/season'
import type { Summary } from './engine/data/summary'
import { addXp, bannersEarned, claimAllTiers, claimTier, claimable, forSeason, parseSeason, recordQuestXp, recordSeasonEvent, refreshSeason, seasonSnapshot } from './season'
import { shopSnapshot } from './shop'
import { sinksSnapshot } from './sinks'

const won: Summary = { won: true, draw: false, lost: 0, taken: 7, turns: 9, swift: true, spellsCast: 3, difficulty: 'normal', campaignIndex: null, daily: false }

describe('season track', () => {
  it('names the month and counts its days', () => {
    expect(seasonId(new Date(2026, 9, 28))).toBe(202610)
    expect(seasonDaysLeft(new Date(2026, 9, 28))).toBe(4)
    expect(seasonDaysLeft(new Date(2026, 1, 1))).toBe(28)
  })

  it('turns XP into tiers and stops at the top', () => {
    expect(tierReached(0)).toBe(0)
    expect(tierReached(XP_PER_TIER * 3 + 5)).toBe(3)
    expect(tierReached(1e9)).toBe(SEASON_TIERS)
    expect(tierProgress(XP_PER_TIER + 10)).toEqual({ into: 10, step: XP_PER_TIER })
    expect(tierProgress(1e9)).toBeNull()
  })

  it('pays more for wins than losses and counts puzzles and stages', () => {
    expect(xpFor({ kind: 'game', summary: won })).toBeGreaterThan(xpFor({ kind: 'game', summary: { ...won, won: false } }))
    expect(xpFor({ kind: 'puzzle' })).toBeGreaterThan(0)
    expect(xpFor({ kind: 'stage' })).toBeGreaterThan(0)
  })

  it('can be finished in a month of steady play', () => {
    const perDay = 3 * xpFor({ kind: 'game', summary: won }) + 3 * xpFor({ kind: 'puzzle' }) + 15
    expect(perDay * 28).toBeGreaterThan(SEASON_TIERS * XP_PER_TIER)
  })
})

describe('season rewards', () => {
  it('give Shards every tier, with items on the planned tiers', () => {
    const items = Array.from({ length: SEASON_TIERS }, (_, i) => rewardFor(202610, i + 1))
    expect(items.every((r) => r.shards > 0)).toBe(true)
    expect(items.filter((r) => r.item).map((r) => r.tier)).toEqual([5, 10, 15, 20, 25, 30])
    expect(items[SEASON_TIERS - 1].item?.kind).toBe('banner')
  })

  it('draw real paid cosmetics, the same ones for a month', () => {
    for (const tier of [5, 15, 25]) {
      const item = rewardFor(202610, tier).item
      expect(item?.kind === 'cosmetic' && COSMETICS.includes(item.cosmetic) && item.cosmetic.cost > 0).toBe(true)
      expect(rewardFor(202610, tier)).toEqual(rewardFor(202610, tier))
    }
  })

  it('names a banner for every month', () => {
    expect(BANNERS).toHaveLength(12)
    expect(new Set(BANNERS).size).toBe(12)
  })
})

describe('season state', () => {
  it('repairs damaged data', () => {
    const s = parseSeason({ season: 'x', xp: -4, claimed: [3, 3, 99, 'a', 1], history: [{ season: 202609, tiers: 400, banner: true }, { season: 5 }, 7] })
    expect(s).toEqual({ season: 0, xp: 0, claimed: [1, 3], history: [{ season: 202609, tiers: SEASON_TIERS, banner: true }] })
    expect(parseSeason(null).history).toEqual([])
  })

  it('files a finished month and starts over', () => {
    const old = { season: 202609, xp: XP_PER_TIER * SEASON_TIERS, claimed: [SEASON_TIERS], history: [] }
    const next = forSeason(old, 202610)
    expect(next).toMatchObject({ season: 202610, xp: 0, claimed: [] })
    expect(next.history).toEqual([{ season: 202609, tiers: SEASON_TIERS, banner: true }])
    expect(forSeason(next, 202610)).toBe(next)
    expect(bannersEarned(next)).toHaveLength(1)
  })

  it('adds XP and lists the tiers reached but unclaimed', () => {
    const s = addXp({ season: 202610, xp: 0, claimed: [1], history: [] }, XP_PER_TIER * 3)
    expect(claimable(s)).toEqual([2, 3])
    expect(addXp(s, 0)).toBe(s)
  })
})

describe('season store', () => {
  it('fills from play and pays each tier once', () => {
    refreshSeason()
    const before = shopSnapshot().shards
    for (let i = 0; i < 12; i++) recordSeasonEvent({ kind: 'game', summary: won })
    recordQuestXp('weekly')
    const reached = tierReached(seasonSnapshot().xp)
    expect(reached).toBeGreaterThanOrEqual(3)
    const paid = claimTier(1)
    expect(paid?.shards).toBe(rewardFor(seasonSnapshot().season, 1).shards)
    expect(shopSnapshot().shards).toBe(before + paid!.shards)
    expect(claimTier(1)).toBeNull()
    expect(claimTier(SEASON_TIERS)).toBeNull()
    expect(claimAllTiers()).toBeGreaterThan(0)
    expect(claimable(seasonSnapshot())).toEqual([])
  })

  it('hands out the freeze and the hint pack on their tiers', () => {
    for (let i = 0; i < 120; i++) recordSeasonEvent({ kind: 'game', summary: won })
    const before = sinksSnapshot()
    claimAllTiers()
    expect(sinksSnapshot().freezes).toBeGreaterThanOrEqual(before.freezes)
    expect(sinksSnapshot().hints).toBeGreaterThan(0)
    expect(bannersEarned(seasonSnapshot())).toHaveLength(1)
  })
})
