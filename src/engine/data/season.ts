import { COSMETICS, type Cosmetic } from './cosmetics'
import type { QuestEvent, QuestPeriod } from './quests'

/** A month-long reward track: XP from play fills 30 tiers, each paying Shards and, now and then, an item. */
export const SEASON_TIERS = 30
export const XP_PER_TIER = 80

/** The season of `date` as a number such as 202610: the calendar month, so every device agrees offline. */
export const seasonId = (date = new Date()) => date.getFullYear() * 100 + date.getMonth() + 1

/** Days left in the month of `date`, counting today. */
export const seasonDaysLeft = (date = new Date()) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate() - date.getDate() + 1

/** XP one thing the player did is worth; the same events the quests count. */
export function xpFor(e: QuestEvent): number {
  if (e.kind === 'puzzle') return 4
  if (e.kind === 'stage') return 8
  const s = e.summary
  return s.won ? (s.daily ? 25 : 20) : 8
}

export const xpForQuest = (period: QuestPeriod) => (period === 'daily' ? 15 : 40)

/** Tiers reached with `xp`, capped at the top. */
export const tierReached = (xp: number) => Math.min(SEASON_TIERS, Math.floor(Math.max(0, xp) / XP_PER_TIER))

/** XP into the next tier, and the whole step; null at the top. */
export function tierProgress(xp: number): { into: number; step: number } | null {
  if (tierReached(xp) >= SEASON_TIERS) return null
  return { into: Math.max(0, xp) % XP_PER_TIER, step: XP_PER_TIER }
}

export type SeasonItem =
  | { kind: 'cosmetic'; cosmetic: Cosmetic }
  | { kind: 'freeze' }
  | { kind: 'hints' }
  | { kind: 'banner'; name: string }

export interface SeasonReward {
  tier: number
  shards: number
  item?: SeasonItem
}

export const BANNERS: readonly string[] = [
  'Banner of the Long Night', 'Banner of the Frost Court', 'Banner of the First Thaw', 'Banner of the Silver Rain',
  'Banner of the High Sun', 'Banner of the Gilded Noon', 'Banner of the Wild Moon', 'Banner of the Harvest Eclipse',
  'Banner of the Ember Dusk', 'Banner of the Hollow Crown', 'Banner of the Mist Festival', 'Banner of the Solstice Court',
]

export const bannerFor = (season: number) => BANNERS[((season % 100) - 1 + BANNERS.length) % BANNERS.length]

/** Tiers that carry a cosmetic, with the price band it is drawn from. */
const COSMETIC_TIERS: Readonly<Record<number, (c: Cosmetic) => boolean>> = {
  5: (c) => c.cost <= 100,
  15: (c) => c.cost > 100 && c.cost <= 200,
  25: (c) => c.cost > 200,
}

const pick = (season: number, tier: number, band: (c: Cosmetic) => boolean) => {
  const pool = COSMETICS.filter((c) => c.cost > 0 && band(c))
  return pool[(season * 7 + tier) % pool.length]
}

/** What `tier` (1 to 30) pays in `season`; the cosmetic drawn depends on the month. */
export function rewardFor(season: number, tier: number): SeasonReward {
  const shards = 8 + tier
  const band = COSMETIC_TIERS[tier]
  if (band) return { tier, shards, item: { kind: 'cosmetic', cosmetic: pick(season, tier, band) } }
  if (tier === 10) return { tier, shards, item: { kind: 'freeze' } }
  if (tier === 20) return { tier, shards, item: { kind: 'hints' } }
  if (tier === SEASON_TIERS) return { tier, shards: shards + 100, item: { kind: 'banner', name: bannerFor(season) } }
  return { tier, shards }
}
