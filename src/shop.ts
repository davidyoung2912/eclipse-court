import { COSMETICS, cosmeticKey, defaultOf, findCosmetic, KINDS, type Cosmetic, type CosmeticKind } from './engine/data/cosmetics'
import type { Difficulty } from './engine/data/difficulty'

/** Shards, what they bought and what is equipped; kept apart from the campaign's progress. */
const KEY = 'eclipse-court:shop'

type Listener = () => void
const listeners = new Set<Listener>()

export interface ShopState {
  shards: number
  /** All the Shards ever earned. */
  earned: number
  /** Keys (`kind:id`) of the paid cosmetics bought. */
  owned: readonly string[]
  /** The id equipped for each kind but theme, which lives in the settings. */
  equipped: Readonly<Partial<Record<CosmeticKind, string>>>
}

const EMPTY: ShopState = { shards: 0, earned: 0, owned: [], equipped: {} }

const count = (x: unknown) => (typeof x === 'number' && Number.isInteger(x) && x >= 0 ? x : 0)

export function parseShop(raw: unknown): ShopState {
  const o = (raw && typeof raw === 'object' ? raw : {}) as Partial<Record<keyof ShopState, unknown>>
  const owned = Array.isArray(o.owned)
    ? [...new Set(o.owned.filter((k): k is string => typeof k === 'string' && COSMETICS.some((c) => c.cost > 0 && cosmeticKey(c) === k)))]
    : []
  const equipped: Partial<Record<CosmeticKind, string>> = {}
  if (o.equipped && typeof o.equipped === 'object')
    for (const kind of KINDS) {
      const id = (o.equipped as Record<string, unknown>)[kind]
      const item = typeof id === 'string' ? findCosmetic(kind, id) : undefined
      if (item && kind !== 'theme' && (item.cost === 0 || owned.includes(cosmeticKey(item)))) equipped[kind] = item.id
    }
  const shards = count(o.shards)
  return { shards, earned: Math.max(count(o.earned), shards), owned, equipped }
}

function load(): ShopState {
  try {
    return parseShop(JSON.parse(localStorage.getItem(KEY) ?? 'null'))
  } catch {
    return EMPTY
  }
}

/** Held in memory too, so a device without storage still remembers for the visit. */
let state = load()

function commit(next: ShopState) {
  state = next
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    // Without storage the wallet simply starts over next visit.
  }
  listeners.forEach((l) => l())
}

export const shopSnapshot = () => state
export function subscribeShop(l: Listener) {
  listeners.add(l)
  return () => { listeners.delete(l) }
}

export const owns = (c: Cosmetic, s: ShopState = state) => c.cost === 0 || s.owned.includes(cosmeticKey(c))
export const equippedId = (kind: CosmeticKind, s: ShopState = state) => s.equipped[kind] ?? defaultOf(kind)

export function earnShards(n: number) {
  if (n <= 0) return
  commit({ ...state, shards: state.shards + n, earned: state.earned + n })
}

/** Spends Shards on a cosmetic; false if it is already owned or too dear. */
export function buy(c: Cosmetic): boolean {
  if (owns(c) || state.shards < c.cost) return false
  commit({ ...state, shards: state.shards - c.cost, owned: [...state.owned, cosmeticKey(c)] })
  return true
}

/** Equips an owned cosmetic of any kind but theme (the Collection sets themes through the settings). */
export function equip(c: Cosmetic): boolean {
  if (c.kind === 'theme' || !owns(c)) return false
  commit({ ...state, equipped: { ...state.equipped, [c.kind]: c.id } })
  return true
}

// ---- Earning ----

export interface Earning {
  won: boolean
  draw: boolean
  difficulty: Difficulty
  /** A campaign battle won for the first time, or a scenario. */
  firstClear: boolean
  campaign: boolean
  scenario: boolean
  dailyScored: boolean
  achievements: number
  /** The match's modifier multiplier (`shardMultiplier`); 1 when absent. */
  multiplier?: number
}

const BY_DIFFICULTY: Record<Difficulty, number> = { easy: 8, normal: 12, hard: 18 }

/** Shards for a finished game against the computer: more for harder opponents and first clears. */
export function shardsForGame(e: Earning): number {
  let n = e.won ? BY_DIFFICULTY[e.difficulty] : e.draw ? 3 : 2
  if (e.won && e.campaign) n += 4
  if (e.won && e.scenario) n += 6
  if (e.won && e.firstClear) n += 20
  if (e.dailyScored) n += 15
  return Math.round(n * (e.multiplier ?? 1)) + e.achievements * 10
}

export const SHARDS_PUZZLE = 5
export const SHARDS_DAILY_PUZZLE = 10
export const SHARDS_GAUNTLET_STAGE = 10
export const SHARDS_GAUNTLET_WIN = 60
