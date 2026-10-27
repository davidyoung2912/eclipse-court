import { rngNext } from '../rng'
import type { Placement, Role } from '../rules/types'

/** Every role except the Leader, who is always fielded and costs nothing. */
export const DRAFT_ROLES: readonly Role[] = ['footsoldier', 'flier', 'marksman', 'bruiser', 'charger', 'aura']

/** The classic army costs 39, so it is always a legal draft. */
export const DRAFT_BUDGET = 40

export const ROLE_COST: Record<Role, number> = {
  footsoldier: 2, flier: 4, marksman: 4, bruiser: 6, charger: 5, aura: 4, leader: 0,
}

export const ROLE_MAX: Record<Role, number> = {
  footsoldier: 6, flier: 3, marksman: 3, bruiser: 2, charger: 3, aura: 2, leader: 1,
}

/** The two home columns hold 14 pieces, the Leader among them. */
export const MAX_DRAFTED = 13
export const MIN_DRAFTED = 4

export const CLASSIC_ROLES: readonly Role[] = [
  'footsoldier', 'footsoldier', 'footsoldier', 'footsoldier', 'flier', 'flier',
  'marksman', 'marksman', 'bruiser', 'charger', 'aura',
]

export const draftCost = (roles: readonly Role[]) => roles.reduce((n, r) => n + ROLE_COST[r], 0)

export const countRole = (roles: readonly Role[], role: Role) => roles.filter((r) => r === role).length

/** Why a draft cannot be fielded, or null if it can. */
export function draftProblem(roles: readonly Role[]): string | null {
  if (roles.some((r) => !DRAFT_ROLES.includes(r))) return 'Only the Leader is fixed; draft the other roles.'
  if (roles.length < MIN_DRAFTED) return `Draft at least ${MIN_DRAFTED} pieces.`
  if (roles.length > MAX_DRAFTED) return `At most ${MAX_DRAFTED} pieces fit on the home columns.`
  if (draftCost(roles) > DRAFT_BUDGET) return `Over the budget of ${DRAFT_BUDGET}.`
  for (const r of DRAFT_ROLES) if (countRole(roles, r) > ROLE_MAX[r]) return `Too many of one role (limit ${ROLE_MAX[r]}).`
  return null
}

/** Whether one more of `role` can be added to a draft. */
export const canAdd = (roles: readonly Role[], role: Role) =>
  roles.length < MAX_DRAFTED && countRole(roles, role) < ROLE_MAX[role] && draftCost(roles) + ROLE_COST[role] <= DRAFT_BUDGET

// Rows ordered from the middle of the board outwards, so a small army huddles around its Leader.
const ROWS = [3, 2, 4, 1, 5, 0, 6]
const FRONT: readonly Role[] = ['footsoldier', 'bruiser', 'charger']

/**
 * Places a draft on the two home columns (x = 0 is the back): the Leader on the home beacon,
 * melee pieces in front, the rest behind, each centred on the middle row.
 */
export function arrange(roles: readonly Role[]): Placement[] {
  const taken = new Set<string>(['0,3'])
  const free = (x: number) => ROWS.map((y) => ({ x, y })).filter((p) => !taken.has(`${p.x},${p.y}`))
  const out: Placement[] = [{ role: 'leader', x: 0, y: 3 }]
  const place = (role: Role, order: readonly number[]) => {
    const spot = order.flatMap((x) => free(x))[0]
    taken.add(`${spot.x},${spot.y}`)
    out.push({ role, ...spot })
  }
  for (const role of roles.filter((r) => FRONT.includes(r))) place(role, [1, 0])
  for (const role of roles.filter((r) => !FRONT.includes(r))) place(role, [0, 1])
  return out
}

/** A random legal draft that spends nearly the whole budget. */
export function randomDraft(seed: number): Role[] {
  const roles: Role[] = []
  let rng = seed >>> 0
  for (;;) {
    const open = DRAFT_ROLES.filter((r) => roles.length < MAX_DRAFTED && canAdd(roles, r))
    if (!open.length) return roles
    const [roll, next] = rngNext(rng)
    rng = next
    roles.push(open[Math.floor(roll * open.length)])
  }
}
