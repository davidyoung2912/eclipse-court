import { CLASSIC_ROLES, countRole, ROLE_MAX } from './draft'
import type { Role, Spell } from '../rules/types'

/** Campaign stars needed to carry a spell; the classic seven are always open. */
export const SPELL_STARS: Partial<Record<Spell, number>> = {
  hasten: 1, exchange: 3, hold: 5, shroud: 5, mirror: 8, sacrifice: 8,
}

export const spellStars = (spell: Spell) => SPELL_STARS[spell] ?? 0
export const spellUnlocked = (stars: number, spell: Spell) => stars >= spellStars(spell)

/**
 * Extra copies of a role the draft allows beyond the classic army, each opening at a number of
 * stars. Every role is in the classic army, so nothing is locked outright, only the bigger armies.
 */
const EXTRA_COPIES: readonly { role: Role; stars: number }[] = [
  { role: 'footsoldier', stars: 2 },
  { role: 'bruiser', stars: 4 },
  { role: 'charger', stars: 5 },
  { role: 'aura', stars: 6 },
  { role: 'flier', stars: 7 },
  { role: 'marksman', stars: 8 },
  { role: 'footsoldier', stars: 9 },
  { role: 'charger', stars: 11 },
]

/** How many of `role` a draft may field with this many stars (never above the rules' own limit). */
export function roleLimit(role: Role, stars: number): number {
  const base = countRole(CLASSIC_ROLES, role)
  const extra = EXTRA_COPIES.filter((e) => e.role === role && stars >= e.stars).length
  return Math.min(ROLE_MAX[role], base + extra)
}

/** The stars at which the next copy of `role` opens, or null if none is waiting. */
export function nextRoleStars(role: Role, stars: number): number | null {
  const now = roleLimit(role, stars)
  const full = Math.min(ROLE_MAX[role], countRole(CLASSIC_ROLES, role) + EXTRA_COPIES.filter((e) => e.role === role).length)
  if (now >= full) return null
  return EXTRA_COPIES.filter((e) => e.role === role)[now - countRole(CLASSIC_ROLES, role)].stars
}
