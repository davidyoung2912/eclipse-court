import type { Court, Role } from '../rules/types'

/** Player-facing description of a role: how it moves on the board and how it fights in a duel. */
export interface RoleInfo {
  label: string
  move: string
  /** Court-neutral part of the duel style; `courtFight` adds the Solari/Umbral difference. */
  fight: string
}

export const ROLE_INFO: Record<Role, RoleInfo> = {
  footsoldier: { label: 'Footsoldier', move: '1 square, any direction', fight: 'Quick swings' },
  flier: { label: 'Flier', move: 'Up to 3 squares, flies over pieces', fight: 'Fast, dashes with each swing' },
  marksman: { label: 'Marksman', move: 'Up to 2 squares, any direction', fight: 'Ranged shots' },
  bruiser: { label: 'Bruiser', move: '1 square, any direction', fight: 'Slow and tough, heavy slam' },
  charger: { label: 'Charger', move: 'Knight jumps (L-shape)', fight: 'Charges across the arena' },
  aura: { label: 'Aura', move: 'Up to 3 squares, flies over pieces', fight: 'Pulse around it, heals neighbours' },
  leader: { label: 'Leader', move: 'Teleports up to 4 squares', fight: 'Strong all-rounder, casts spells' },
}

/** How the court changes the way a role fights in a duel. */
export function courtFight(court: Court, role: Role): string {
  if (court === 'umbral') return role === 'marksman' ? 'lobbed shells, regenerates' : 'regenerates'
  return role === 'marksman' ? 'straight shots' : role === 'flier' ? '' : 'dashes in'
}

/** The light-tied gift a court gives a role, or an empty string if it gives none. */
export function courtPassive(court: Court, role: Role): string {
  if (court === 'umbral') return 'Heals +1 each round it ends on a dark square'
  return role === 'flier' ? 'Reaches 4 squares while standing in full light' : ''
}
