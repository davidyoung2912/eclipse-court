import { QUESTS, QUESTS_PER_PERIOD, questById, type Quest, type QuestEvent, type QuestPeriod } from './engine/data/quests'
import { dailySeed } from './engine/data/setups'
import { weekStart } from './engine/data/weekly'
import { rngNext } from './engine/rng'
import { earnShards } from './shop'

/** Three daily and three weekly quests, seeded by date so they match offline; progress and claims are kept here. */
const KEY = 'eclipse-court:quests'

type Listener = () => void
const listeners = new Set<Listener>()

export interface QuestSlot {
  id: string
  n: number
  claimed: boolean
}

export interface QuestsState {
  /** The `dailySeed` the daily slots belong to, and the Monday (as a `dailySeed`) the weekly ones do; 0 before the first visit. */
  day: number
  week: number
  daily: readonly QuestSlot[]
  weekly: readonly QuestSlot[]
  /** The day on which the one reroll was spent. */
  rerolled: number
}

const EMPTY: QuestsState = { day: 0, week: 0, daily: [], weekly: [], rerolled: 0 }

const count = (x: unknown) => (typeof x === 'number' && Number.isInteger(x) && x >= 0 ? x : 0)

const parseSlots = (raw: unknown, period: QuestPeriod): QuestSlot[] => {
  if (!Array.isArray(raw)) return []
  const out: QuestSlot[] = []
  for (const s of raw as Record<string, unknown>[]) {
    const q = s && typeof s.id === 'string' ? questById(s.id) : undefined
    if (q && q.period === period && !out.some((x) => x.id === q.id)) out.push({ id: q.id, n: Math.min(count(s.n), q.target), claimed: s.claimed === true })
  }
  return out.slice(0, QUESTS_PER_PERIOD)
}

export function parseQuests(raw: unknown): QuestsState {
  const o = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  return { day: count(o.day), week: count(o.week), daily: parseSlots(o.daily, 'daily'), weekly: parseSlots(o.weekly, 'weekly'), rerolled: count(o.rerolled) }
}

/** `n` quests of `period` drawn from `seed` without repeats and skipping `avoid`. */
export function drawQuests(period: QuestPeriod, seed: number, n: number, avoid: readonly string[] = []): Quest[] {
  let state = (seed * 31 + (period === 'daily' ? 5 : 11)) >>> 0
  const pool = QUESTS.filter((q) => q.period === period && !avoid.includes(q.id))
  const out: Quest[] = []
  while (out.length < n && pool.length > 0) {
    const [v, next] = rngNext(state)
    state = next
    out.push(pool.splice(Math.floor(v * pool.length), 1)[0])
  }
  return out
}

const fresh = (period: QuestPeriod, seed: number): QuestSlot[] => drawQuests(period, seed, QUESTS_PER_PERIOD).map((q) => ({ id: q.id, n: 0, claimed: false }))

/** The state as it stands on `day` and in `week`: a new day or week deals new quests. */
export function forDate(s: QuestsState, day: number, week: number): QuestsState {
  const dayNew = s.day !== day || s.daily.length < QUESTS_PER_PERIOD
  const weekNew = s.week !== week || s.weekly.length < QUESTS_PER_PERIOD
  if (!dayNew && !weekNew) return s
  return { ...s, day, week, daily: dayNew ? fresh('daily', day) : s.daily, weekly: weekNew ? fresh('weekly', week) : s.weekly }
}

const advance = (slots: readonly QuestSlot[], e: QuestEvent): QuestSlot[] =>
  slots.map((s) => {
    const q = questById(s.id)
    return q && !s.claimed ? { ...s, n: Math.min(q.target, s.n + q.gain(e)) } : s
  })

/** Counts `e` towards every open quest. */
export const applyEvent = (s: QuestsState, e: QuestEvent): QuestsState => ({ ...s, daily: advance(s.daily, e), weekly: advance(s.weekly, e) })

export const questDone = (slot: QuestSlot) => {
  const q = questById(slot.id)
  return !!q && slot.n >= q.target
}

/** Whether today's reroll is still unspent. */
export const canRerollQuest = (s: QuestsState, day: number) => s.rerolled !== day

/** Swaps an unclaimed quest of `period` at `index` for another of its period, once a day; null if it cannot. */
export function rerollSlot(s: QuestsState, period: QuestPeriod, index: number, day: number): QuestsState | null {
  const slots = period === 'daily' ? s.daily : s.weekly
  const slot = slots[index]
  if (!slot || slot.claimed || !canRerollQuest(s, day)) return null
  const [next] = drawQuests(period, day * 7 + index + 1, 1, [...slots.map((x) => x.id)])
  if (!next) return null
  const swapped = slots.map((x, i) => (i === index ? { id: next.id, n: 0, claimed: false } : x))
  return { ...s, rerolled: day, ...(period === 'daily' ? { daily: swapped } : { weekly: swapped }) }
}

function load(): QuestsState {
  try {
    return parseQuests(JSON.parse(localStorage.getItem(KEY) ?? 'null'))
  } catch {
    return EMPTY
  }
}

let state = load()

function commit(next: QuestsState) {
  state = next
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    // Without storage the quests last for the visit.
  }
  listeners.forEach((l) => l())
}

export const questsSnapshot = () => state
export function subscribeQuests(l: Listener) {
  listeners.add(l)
  return () => { listeners.delete(l) }
}

const current = () => forDate(state, dailySeed(), weekStart())

/** Deals today's and this week's quests if they are not dealt yet. */
export function refreshQuests() {
  const next = current()
  if (next !== state) commit(next)
}

/** Counts something the player did towards the open quests. */
export function recordQuestEvent(e: QuestEvent) {
  commit(applyEvent(current(), e))
}

/** Pays a finished quest; returns its Shards, or 0 if it is open, claimed or unknown. */
export function claimQuest(period: QuestPeriod, index: number): number {
  const s = current()
  const slots = period === 'daily' ? s.daily : s.weekly
  const slot = slots[index]
  const q = slot && questById(slot.id)
  if (!slot || !q || slot.claimed || slot.n < q.target) return 0
  const marked = slots.map((x, i) => (i === index ? { ...x, claimed: true } : x))
  commit({ ...s, ...(period === 'daily' ? { daily: marked } : { weekly: marked }) })
  earnShards(q.shards)
  return q.shards
}

export function rerollQuest(period: QuestPeriod, index: number): boolean {
  const next = rerollSlot(current(), period, index, dailySeed())
  if (!next) return false
  commit(next)
  return true
}
