import { grandBattles } from './engine/data/campaign'
import { PUZZLES } from './engine/data/puzzles'
import { SCENARIOS } from './engine/data/scenarios'
import { ACHIEVEMENTS, clearedCount, scenarioStars, STAR_WIN, totalStars, type Progress } from './progress'
import { earnShards } from './shop'
import type { Court } from './engine/rules/types'

/** Mastery levels and the showcase badges; kept apart from the campaign's progress. */
const KEY = 'eclipse-court:mastery'

export const SHOWCASE_SLOTS = 3

export type TrackId = 'campaign' | 'scenarios' | 'puzzles' | 'gauntlet' | 'grand' | 'online'

export interface Track {
  id: TrackId
  title: string
  /** What the points count, shown under the level. */
  unit: string
  points: (p: Progress) => number
}

export const TRACKS: readonly Track[] = [
  { id: 'campaign', title: 'Campaign', unit: 'battles beaten and stars', points: (p) => clearedCount(p) + totalStars(p) },
  { id: 'scenarios', title: 'Scenarios', unit: 'scenarios cleared and stars', points: (p) => SCENARIOS.filter((x) => (p.scenarios[x.id] ?? 0) & STAR_WIN).length + scenarioStars(p) },
  { id: 'puzzles', title: 'Puzzles', unit: 'puzzles solved', points: (p) => PUZZLES.filter((z) => p.puzzles.includes(z.id)).length },
  { id: 'gauntlet', title: 'Gauntlet', unit: 'runs, depth and wins', points: (p) => p.gauntlet.runs + p.gauntlet.best * 2 + p.gauntlet.won * 10 },
  {
    id: 'grand', title: 'Grand board', unit: 'Grand Court battles and stars',
    points: (p) => grandBattles().reduce((n, o) => n + (((p.battles[o.id] ?? 0) & STAR_WIN) ? 1 + [1, 2, 4].filter((b) => (p.battles[o.id] ?? 0) & b).length : 0), 0),
  },
  { id: 'online', title: 'Online', unit: 'games played and won', points: (p) => p.areas.online.games + p.areas.online.wins * 2 },
]

/** Points needed for each level, from level 1; every track climbs the same ladder. */
export const LEVEL_POINTS: readonly number[] = [3, 8, 15, 25, 40, 60, 90, 130]
export const levelReward = (level: number) => 20 * level

/** The level reached with `points`, 0 to the top. */
export const levelOf = (points: number) => LEVEL_POINTS.filter((n) => points >= n).length

/** Shards for levels 1 to `level` all told. */
export const rewardUpTo = (level: number) => Array.from({ length: level }, (_, i) => levelReward(i + 1)).reduce((a, b) => a + b, 0)

export interface Standing {
  track: Track
  points: number
  level: number
  /** Points for the next level, or null at the top. */
  next: number | null
  /** Shards waiting to be claimed. */
  owed: number
}

export interface MasteryState {
  /** The level whose reward has been paid, per track. */
  claimed: Readonly<Partial<Record<TrackId, number>>>
  /** Up to three achievement ids pinned to the Stats page. */
  showcase: readonly string[]
  /** The side the player took in the game last finished, so its review can be judged for them. */
  lastCourt: Court | null
}

const EMPTY: MasteryState = { claimed: {}, showcase: [], lastCourt: null }

export function parseMastery(raw: unknown): MasteryState {
  const o = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const claimed: Partial<Record<TrackId, number>> = {}
  const c = (o.claimed && typeof o.claimed === 'object' ? o.claimed : {}) as Record<string, unknown>
  for (const t of TRACKS) {
    const n = c[t.id]
    if (typeof n === 'number' && Number.isInteger(n) && n > 0) claimed[t.id] = Math.min(n, LEVEL_POINTS.length)
  }
  const showcase = Array.isArray(o.showcase)
    ? [...new Set(o.showcase.filter((id): id is string => typeof id === 'string' && ACHIEVEMENTS.some((a) => a.id === id)))].slice(0, SHOWCASE_SLOTS)
    : []
  return { claimed, showcase, lastCourt: o.lastCourt === 'solari' || o.lastCourt === 'umbral' ? o.lastCourt : null }
}

type Listener = () => void
const listeners = new Set<Listener>()

function load(): MasteryState {
  try {
    return parseMastery(JSON.parse(localStorage.getItem(KEY) ?? 'null'))
  } catch {
    return EMPTY
  }
}

/** Held in memory too, so a device without storage still remembers for the visit. */
let state = load()

function commit(next: MasteryState) {
  state = next
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    // Without storage the levels simply start over next visit.
  }
  listeners.forEach((l) => l())
}

export const masterySnapshot = () => state
export function subscribeMastery(l: Listener) {
  listeners.add(l)
  return () => { listeners.delete(l) }
}

export function standings(p: Progress, s: MasteryState = state): Standing[] {
  return TRACKS.map((track) => {
    const points = track.points(p)
    const level = levelOf(points)
    const paid = s.claimed[track.id] ?? 0
    return { track, points, level, next: LEVEL_POINTS[level] ?? null, owed: Math.max(0, rewardUpTo(level) - rewardUpTo(paid)) }
  })
}

/** Pays every level reached and not yet paid; returns the Shards earned. */
export function claimMastery(p: Progress): number {
  const list = standings(p)
  const owed = list.reduce((n, x) => n + x.owed, 0)
  if (owed === 0) return 0
  commit({ ...state, claimed: Object.fromEntries(list.map((x) => [x.track.id, Math.max(x.level, state.claimed[x.track.id] ?? 0)])) })
  earnShards(owed)
  return owed
}

/** Pins or unpins an achievement; a full showcase refuses a new pin. */
export function togglePin(id: string): boolean {
  if (state.showcase.includes(id)) {
    commit({ ...state, showcase: state.showcase.filter((x) => x !== id) })
    return true
  }
  if (state.showcase.length >= SHOWCASE_SLOTS || !ACHIEVEMENTS.some((a) => a.id === id)) return false
  commit({ ...state, showcase: [...state.showcase, id] })
  return true
}

export function rememberCourt(court: Court) {
  if (state.lastCourt !== court) commit({ ...state, lastCourt: court })
}

