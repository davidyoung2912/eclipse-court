import { COSMETICS } from './engine/data/cosmetics'
import { addTally, duelTally, emptyTally, goalDone, GOAL_ROLES, ROLE_GOALS, type Tally } from './engine/data/roleGoals'
import type { GameRecord } from './engine/log'
import type { Court } from './engine/rules/types'
import { earnShards, grant } from './shop'

/** Duels won by each role and the goals already claimed; kept apart from the campaign's progress. */
const KEY = 'eclipse-court:role-goals'

export interface RoleGoalState {
  tally: Tally
  /** Ids of the goals whose Shards have been paid. */
  claimed: readonly string[]
}

const count = (x: unknown) => (typeof x === 'number' && Number.isInteger(x) && x >= 0 ? x : 0)

export function parseRoleGoals(raw: unknown): RoleGoalState {
  const o = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const t = (o.tally && typeof o.tally === 'object' ? o.tally : {}) as Record<string, Record<string, unknown> | undefined>
  const tally = emptyTally()
  for (const r of GOAL_ROLES) tally[r] = { wins: count(t[r]?.wins), dark: count(t[r]?.dark), light: count(t[r]?.light) }
  const claimed = Array.isArray(o.claimed)
    ? [...new Set(o.claimed.filter((id): id is string => typeof id === 'string' && ROLE_GOALS.some((g) => g.id === id)))]
    : []
  return { tally, claimed }
}

type Listener = () => void
const listeners = new Set<Listener>()

function load(): RoleGoalState {
  try {
    return parseRoleGoals(JSON.parse(localStorage.getItem(KEY) ?? 'null'))
  } catch {
    return parseRoleGoals(null)
  }
}

/** Held in memory too, so a device without storage still remembers for the visit. */
let state = load()

function commit(next: RoleGoalState) {
  state = next
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    // Without storage the tallies last for the visit.
  }
  listeners.forEach((l) => l())
}

export const roleGoalsSnapshot = () => state
export function subscribeRoleGoals(l: Listener) {
  listeners.add(l)
  return () => { listeners.delete(l) }
}

/** Adds the duels `human` won in a finished game to the tallies. */
export function recordRoleDuels(record: GameRecord, human: Court) {
  const won = duelTally(record, human)
  if (won) commit({ ...state, tally: addTally(state.tally, won) })
}

/** Goals complete and not yet claimed. */
export const unclaimedGoals = (s: RoleGoalState = state) => ROLE_GOALS.filter((g) => goalDone(g, s.tally) && !s.claimed.includes(g.id))

/** The cosmetics earned with `n` goals complete. */
export const rewardsFor = (n: number) => COSMETICS.filter((c) => c.goals !== undefined && c.goals <= n)

export interface GoalClaim {
  shards: number
  /** Names of the cosmetics newly earned. */
  cosmetics: string[]
}

/** Pays every finished goal and hands over any cosmetic the completed total has reached. */
export function claimRoleGoals(): GoalClaim {
  const done = unclaimedGoals()
  const claimed = [...state.claimed, ...done.map((g) => g.id)]
  const shards = done.reduce((n, g) => n + g.shards, 0)
  if (done.length > 0) commit({ ...state, claimed })
  earnShards(shards)
  const cosmetics = rewardsFor(ROLE_GOALS.filter((g) => goalDone(g, state.tally)).length).filter(grant).map((c) => c.name)
  return { shards, cosmetics }
}
