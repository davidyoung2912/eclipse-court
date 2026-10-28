import { replaySteps, type GameRecord } from '../log'
import type { Court, Role } from '../rules/types'

/** Piece mastery: duels won by each role, in the light and in the dark, and the goals set on them. */
export const GOAL_ROLES: readonly Role[] = ['footsoldier', 'flier', 'marksman', 'bruiser', 'charger', 'aura', 'leader']

export const GOAL_ROLE_NAMES: Record<Role, string> = {
  footsoldier: 'Footsoldier', flier: 'Flier', marksman: 'Marksman', bruiser: 'Bruiser', charger: 'Charger', aura: 'Aura', leader: 'Leader',
}

export interface RoleTally {
  /** Duels the role's pieces won: the foe fell and the piece lived. */
  wins: number
  /** Of those, duels on a square in the dark (luminance below 0) and in the light (above 0). */
  dark: number
  light: number
}

export type Tally = Record<Role, RoleTally>

export const emptyTally = (): Tally =>
  Object.fromEntries(GOAL_ROLES.map((r) => [r, { wins: 0, dark: 0, light: 0 }])) as Tally

/** The duels `human` won in a game, counted by role. Null if the record is not a legal game. */
export function duelTally(record: GameRecord, human: Court): Tally | null {
  const steps = replaySteps(record.initial, record.actions)
  if (!steps) return null
  const tally = emptyTally()
  for (let i = 1; i < steps.length; i++) {
    const duel = steps[i].state.lastDuel
    if (!duel || steps[i].action?.type !== 'move') continue
    const before = steps[i - 1].state.pieces
    const attacker = before.find((p) => p.id === duel.attackerId)
    const defender = before.find((p) => p.id === duel.defenderId)
    if (!attacker || !defender) continue
    const mine = attacker.court === human ? attacker : defender.court === human ? defender : null
    if (!mine) continue
    const won = mine === attacker ? duel.defenderHp <= 0 && duel.attackerHp > 0 : duel.attackerHp <= 0 && duel.defenderHp > 0
    if (!won) continue
    const t = tally[mine.role]
    t.wins++
    if (duel.luminance < 0) t.dark++
    else if (duel.luminance > 0) t.light++
  }
  return tally
}

export const addTally = (a: Tally, b: Tally): Tally =>
  Object.fromEntries(GOAL_ROLES.map((r) => [r, { wins: a[r].wins + b[r].wins, dark: a[r].dark + b[r].dark, light: a[r].light + b[r].light }])) as Tally

export type GoalKind = 'wins' | 'dark' | 'light'

export interface RoleGoal {
  id: string
  role: Role
  kind: GoalKind
  target: number
  text: string
  /** Shards paid when the goal is claimed. */
  shards: number
}

/** Leaders duel rarely, so their goals are set lower. */
const TARGETS: Record<Role, { first: number; big: number; side: number }> = {
  footsoldier: { first: 10, big: 30, side: 10 },
  flier: { first: 10, big: 30, side: 10 },
  marksman: { first: 10, big: 30, side: 10 },
  bruiser: { first: 10, big: 30, side: 10 },
  charger: { first: 10, big: 30, side: 10 },
  aura: { first: 8, big: 24, side: 8 },
  leader: { first: 5, big: 15, side: 5 },
}

export const ROLE_GOALS: readonly RoleGoal[] = GOAL_ROLES.flatMap((role) => {
  const t = TARGETS[role]
  const name = GOAL_ROLE_NAMES[role]
  return [
    { id: `${role}-wins-${t.first}`, role, kind: 'wins', target: t.first, text: `Win ${t.first} duels with a ${name}`, shards: 15 },
    { id: `${role}-dark-${t.side}`, role, kind: 'dark', target: t.side, text: `Win ${t.side} duels with a ${name} in the dark`, shards: 25 },
    { id: `${role}-light-${t.side}`, role, kind: 'light', target: t.side, text: `Win ${t.side} duels with a ${name} in the light`, shards: 25 },
    { id: `${role}-wins-${t.big}`, role, kind: 'wins', target: t.big, text: `Win ${t.big} duels with a ${name}`, shards: 40 },
  ] satisfies RoleGoal[]
})

export const progressOf = (goal: RoleGoal, tally: Tally) => Math.min(goal.target, tally[goal.role][goal.kind])
export const goalDone = (goal: RoleGoal, tally: Tally) => tally[goal.role][goal.kind] >= goal.target
