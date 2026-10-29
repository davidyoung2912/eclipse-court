import { SEASON_TIERS, bannerFor, rewardFor, seasonId, tierReached, xpFor, xpForQuest, type SeasonItem } from './engine/data/season'
import type { QuestEvent, QuestPeriod } from './engine/data/quests'
import { award, earnShards, owns } from './shop'
import { grantFreeze, grantHints } from './sinks'

/** The month's reward track: XP, the tiers claimed and a history fold of finished seasons. Local only. */
const KEY = 'eclipse-court:season'

type Listener = () => void
const listeners = new Set<Listener>()

export interface SeasonRecord {
  season: number
  tiers: number
  banner: boolean
}

export interface SeasonState {
  /** The season (a `seasonId`) the XP belongs to; 0 before the first visit. */
  season: number
  xp: number
  /** Tiers whose reward was taken. */
  claimed: readonly number[]
  /** Finished seasons, newest first. */
  history: readonly SeasonRecord[]
}

const EMPTY: SeasonState = { season: 0, xp: 0, claimed: [], history: [] }
const MAX_HISTORY = 24
const MAX_XP = SEASON_TIERS * 1000

const count = (x: unknown, max: number) => (typeof x === 'number' && Number.isInteger(x) && x >= 0 ? Math.min(x, max) : 0)
const validSeason = (x: unknown) => (typeof x === 'number' && Number.isInteger(x) && x >= 200001 && x <= 999912 && x % 100 >= 1 && x % 100 <= 12 ? x : 0)

export function parseSeason(raw: unknown): SeasonState {
  const o = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const claimed = Array.isArray(o.claimed) ? [...new Set(o.claimed.filter((t): t is number => Number.isInteger(t) && t >= 1 && t <= SEASON_TIERS))].sort((a, b) => a - b) : []
  const history: SeasonRecord[] = []
  if (Array.isArray(o.history))
    for (const h of o.history as Record<string, unknown>[]) {
      const season = h && validSeason(h.season)
      if (season && !history.some((x) => x.season === season)) history.push({ season, tiers: count(h.tiers, SEASON_TIERS), banner: h.banner === true })
    }
  return { season: validSeason(o.season), xp: count(o.xp, MAX_XP), claimed, history: history.slice(0, MAX_HISTORY) }
}

/** The state as it stands in `season`: a new month files the old track in the history and starts over. */
export function forSeason(s: SeasonState, season: number): SeasonState {
  if (s.season === season) return s
  const filed: SeasonRecord[] = s.season > 0 ? [{ season: s.season, tiers: tierReached(s.xp), banner: s.claimed.includes(SEASON_TIERS) }, ...s.history] : [...s.history]
  return { season, xp: 0, claimed: [], history: filed.slice(0, MAX_HISTORY) }
}

export const addXp = (s: SeasonState, n: number): SeasonState => (n > 0 ? { ...s, xp: Math.min(MAX_XP, s.xp + n) } : s)

/** Tiers reached but not yet claimed. */
export const claimable = (s: SeasonState) => Array.from({ length: tierReached(s.xp) }, (_, i) => i + 1).filter((t) => !s.claimed.includes(t))

/** Every banner earned: the finished seasons' and this one's if its top tier was claimed. */
export const bannersEarned = (s: SeasonState): string[] => [...(s.claimed.includes(SEASON_TIERS) ? [bannerFor(s.season)] : []), ...s.history.filter((h) => h.banner).map((h) => bannerFor(h.season))]

function load(): SeasonState {
  try {
    return parseSeason(JSON.parse(localStorage.getItem(KEY) ?? 'null'))
  } catch {
    return EMPTY
  }
}

let state = load()

function commit(next: SeasonState) {
  state = next
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    // Without storage the track lasts for the visit.
  }
  listeners.forEach((l) => l())
}

export const seasonSnapshot = () => state
export function subscribeSeason(l: Listener) {
  listeners.add(l)
  return () => { listeners.delete(l) }
}

const current = () => forSeason(state, seasonId())

/** Starts the month's track if it has not started. */
export function refreshSeason() {
  const next = current()
  if (next !== state) commit(next)
}

/** Counts something the player did towards the track. */
export function recordSeasonEvent(e: QuestEvent) {
  commit(addXp(current(), xpFor(e)))
}

export function recordQuestXp(period: QuestPeriod) {
  commit(addXp(current(), xpForQuest(period)))
}

export interface TierClaim {
  shards: number
  item?: SeasonItem
  /** A cosmetic or shelf item already held, paid in Shards instead. */
  duplicate?: boolean
}

/** Shards in place of a cosmetic or consumable the player cannot take. */
const FALLBACK_SHARDS = 40

/** Takes one reached tier's reward; null if it is not reached or already taken. */
export function claimTier(tier: number): TierClaim | null {
  const s = current()
  if (!claimable(s).includes(tier)) return null
  const reward = rewardFor(s.season, tier)
  let shards = reward.shards
  let duplicate = false
  const item = reward.item
  if (item?.kind === 'cosmetic') {
    if (owns(item.cosmetic)) { shards += Math.round(item.cosmetic.cost / 2); duplicate = true } else award(item.cosmetic)
  } else if (item?.kind === 'freeze' && !grantFreeze()) { shards += FALLBACK_SHARDS; duplicate = true }
  else if (item?.kind === 'hints' && !grantHints()) { shards += FALLBACK_SHARDS; duplicate = true }
  commit({ ...s, claimed: [...s.claimed, tier].sort((a, b) => a - b) })
  earnShards(shards)
  return { shards, ...(item ? { item } : {}), ...(duplicate ? { duplicate } : {}) }
}

/** Takes every reached tier; the total Shards. */
export const claimAllTiers = () => claimable(current()).reduce((n, t) => n + (claimTier(t)?.shards ?? 0), 0)
