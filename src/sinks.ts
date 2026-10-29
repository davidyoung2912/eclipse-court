import { cosmeticKey, type Cosmetic } from './engine/data/cosmetics'
import { owns, shopSnapshot, spend } from './shop'

/** What the Shards buy besides cosmetics: streak freezes, puzzle hint packs and cosmetic prestige. */
const KEY = 'eclipse-court:sinks'

type Listener = () => void
const listeners = new Set<Listener>()

export interface SinksState {
  /** Streak freezes held; each covers one missed day of the daily match streak. */
  freezes: number
  /** Extra puzzle hints held. */
  hints: number
  /** Prestige tier (1 to MAX_PRESTIGE) of each cosmetic key that has one. */
  prestige: Readonly<Record<string, number>>
}

const EMPTY: SinksState = { freezes: 0, hints: 0, prestige: {} }

export const MAX_FREEZES = 2
export const MAX_PACK_HINTS = 9
export const MAX_PRESTIGE = 3
export const PRICE_REROLL = 25
export const PRICE_FREEZE = 60
export const HINT_PACK = 3
export const PRICE_HINT_PACK = 40

export const PRESTIGE_NAMES: readonly string[] = ['', 'Bright', 'Radiant', 'Mythic']

const count = (x: unknown, max: number) => (typeof x === 'number' && Number.isInteger(x) && x >= 0 ? Math.min(x, max) : 0)

export function parseSinks(raw: unknown): SinksState {
  const o = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const prestige: Record<string, number> = {}
  if (o.prestige && typeof o.prestige === 'object')
    for (const [k, v] of Object.entries(o.prestige as Record<string, unknown>)) {
      const tier = count(v, MAX_PRESTIGE)
      if (tier > 0 && /^[a-z]+:[a-z0-9-]+$/.test(k)) prestige[k] = tier
    }
  return { freezes: count(o.freezes, MAX_FREEZES), hints: count(o.hints, MAX_PACK_HINTS), prestige }
}

function load(): SinksState {
  try {
    return parseSinks(JSON.parse(localStorage.getItem(KEY) ?? 'null'))
  } catch {
    return EMPTY
  }
}

let state = load()

function commit(next: SinksState) {
  state = next
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    // Without storage the purchases last for the visit.
  }
  listeners.forEach((l) => l())
}

export const sinksSnapshot = () => state
export function subscribeSinks(l: Listener) {
  listeners.add(l)
  return () => { listeners.delete(l) }
}

export const prestigeOf = (c: Cosmetic, s: SinksState = state) => s.prestige[cosmeticKey(c)] ?? 0

/** Cosmetics given free at the start have nothing to prestige; the rest start from their price (or 100 if earned by goals). */
export const canPrestige = (c: Cosmetic) => c.cost > 0 || !!c.goals || !!c.arc

/** Shards for the next prestige tier of `c`: its price (100 if earned) times the tier, so three tiers cost 6x. */
export const prestigeCost = (c: Cosmetic, tier: number) => (c.cost || 100) * tier

/** Buys the next prestige tier of an owned cosmetic; false if it is not owned, maxed or too dear. */
export function buyPrestige(c: Cosmetic): boolean {
  const tier = prestigeOf(c) + 1
  if (!canPrestige(c) || !owns(c, shopSnapshot()) || tier > MAX_PRESTIGE || !spend(prestigeCost(c, tier))) return false
  commit({ ...state, prestige: { ...state.prestige, [cosmeticKey(c)]: tier } })
  return true
}

export function buyFreeze(): boolean {
  if (state.freezes >= MAX_FREEZES || !spend(PRICE_FREEZE)) return false
  commit({ ...state, freezes: state.freezes + 1 })
  return true
}

/** Uses up one freeze; false if none is held. */
export function consumeFreeze(): boolean {
  if (state.freezes <= 0) return false
  commit({ ...state, freezes: state.freezes - 1 })
  return true
}

export function buyHintPack(): boolean {
  if (state.hints + HINT_PACK > MAX_PACK_HINTS || !spend(PRICE_HINT_PACK)) return false
  commit({ ...state, hints: state.hints + HINT_PACK })
  return true
}

/** Uses up one extra puzzle hint; false if none is held. */
export function consumePackHint(): boolean {
  if (state.hints <= 0) return false
  commit({ ...state, hints: state.hints - 1 })
  return true
}

/** Buys a Gauntlet reroll token's worth of Shards; the run itself counts the tokens used. */
export const payReroll = () => spend(PRICE_REROLL)

/** Adds a freeze or a hint pack as a reward; false if the shelf is already full. */
export function grantFreeze(): boolean {
  if (state.freezes >= MAX_FREEZES) return false
  commit({ ...state, freezes: state.freezes + 1 })
  return true
}

export function grantHints(): boolean {
  if (state.hints >= MAX_PACK_HINTS) return false
  commit({ ...state, hints: Math.min(MAX_PACK_HINTS, state.hints + HINT_PACK) })
  return true
}
