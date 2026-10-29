import { bountiesFor } from './engine/data/bounties'
import { GOAL_ROLE_NAMES, goalDone, progressOf, ROLE_GOALS } from './engine/data/roleGoals'
import { ACHIEVEMENTS, type Progress } from './progress'
import { LEVEL_POINTS, standings, type MasteryState } from './mastery'
import type { RoleGoalState } from './roleGoals'

/** The screen that moves a goal forward. */
export type GoalTarget = 'stats' | 'skirmish' | 'campaign' | 'puzzles' | 'gauntlet' | 'online'

export type GoalSource = 'mastery' | 'piece' | 'achievement' | 'bounty'

export interface Goal {
  id: string
  source: GoalSource
  title: string
  /** What is left or what is owed, in a few words. */
  detail: string
  /** How far along it is, 0 to 1. */
  fraction: number
  /** Done and waiting to be claimed. */
  claimable: boolean
  target: GoalTarget
}

/** Goals shown from any one source, so a long list of piece goals cannot crowd out the rest. */
export const PER_SOURCE = 3
export const MAX_GOALS = 10

export interface GoalInputs {
  progress: Progress
  mastery: MasteryState
  roles: RoleGoalState
  /** Ids of today's bounties already claimed. */
  bounties: readonly string[]
  /** The day number the bounties are drawn for. */
  day: number
}

const TRACK_TARGET: Record<string, GoalTarget> = { campaign: 'campaign', scenarios: 'campaign', puzzles: 'puzzles', gauntlet: 'gauntlet', grand: 'campaign', online: 'online' }
const BADGE_STEPS = [10, 25, 50, 75]

/** Every open goal, claimable first and then the nearest to done, a few from each source. */
export function openGoals({ progress, mastery, roles, bounties, day }: GoalInputs): Goal[] {
  const list: Goal[] = []

  for (const s of standings(progress, mastery)) {
    if (s.owed > 0) list.push({ id: `mastery-claim-${s.track.id}`, source: 'mastery', title: `${s.track.title} level ${s.level} reached`, detail: `${s.owed} Shards to claim`, fraction: 1, claimable: true, target: 'stats' })
    if (s.next !== null) {
      const floor = s.level === 0 ? 0 : LEVEL_POINTS[s.level - 1]
      list.push({
        id: `mastery-${s.track.id}`, source: 'mastery', title: `${s.track.title} level ${s.level + 1}`, detail: `${s.points} of ${s.next} ${s.track.unit}`,
        fraction: (s.points - floor) / (s.next - floor), claimable: false, target: TRACK_TARGET[s.track.id] ?? 'stats',
      })
    }
  }

  for (const g of ROLE_GOALS) {
    if (roles.claimed.includes(g.id)) continue
    const done = goalDone(g, roles.tally)
    list.push({
      id: `piece-${g.id}`, source: 'piece', title: g.text, detail: done ? `${g.shards} Shards to claim` : `${progressOf(g, roles.tally)} of ${g.target} · ${GOAL_ROLE_NAMES[g.role]}`,
      fraction: progressOf(g, roles.tally) / g.target, claimable: done, target: done ? 'stats' : 'skirmish',
    })
  }

  const have = progress.achievements.length
  for (const n of BADGE_STEPS) {
    const a = ACHIEVEMENTS.find((x) => x.id === `badges-${n}`)
    if (a && !progress.achievements.includes(a.id) && have < n) {
      list.push({ id: `achievement-${a.id}`, source: 'achievement', title: `${a.name}: ${a.text}`, detail: `${have} of ${n} achievements`, fraction: have / n, claimable: false, target: 'stats' })
      break
    }
  }

  for (const b of bountiesFor(day)) {
    if (!bounties.includes(b.id)) list.push({ id: `bounty-${b.id}`, source: 'bounty', title: `Bounty: ${b.text}`, detail: `${b.shards} Shards, in a skirmish today`, fraction: 0, claimable: false, target: 'skirmish' })
  }

  const rank = (g: Goal) => (g.claimable ? 2 : 0) + g.fraction
  const sorted = [...list].sort((a, b) => rank(b) - rank(a))
  const taken: Record<GoalSource, number> = { mastery: 0, piece: 0, achievement: 0, bounty: 0 }
  return sorted.filter((g) => (taken[g.source]++ < PER_SOURCE)).slice(0, MAX_GOALS)
}
