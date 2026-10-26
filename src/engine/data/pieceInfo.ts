import type { Court, Role } from '../rules/types'

/** Player-facing description of a role: how it moves on the board and how it fights in a duel. */
export interface RoleInfo {
  label: string
  move: string
  /** Court-neutral part of the duel style; `courtFight` adds the Solari/Umbral difference. */
  fight: string
}

export const ROLE_INFO: Record<Role, RoleInfo> = {
  footsoldier: { label: 'Footsoldier', move: '1 square in any direction', fight: 'Quick sword swings. Fragile but cheap.' },
  flier: { label: 'Flier', move: 'Up to 3 squares, flying over other pieces', fight: 'Fast and agile; dashes with every swing.' },
  marksman: { label: 'Marksman', move: 'Up to 2 squares in any direction', fight: 'Fires shots from range; hold to charge a bigger one.' },
  bruiser: { label: 'Bruiser', move: '1 square in any direction', fight: 'Slow, tough and heavy: a ground slam hits hard.' },
  charger: { label: 'Charger', move: 'Knight jumps (L-shape), landing on empty or enemy squares', fight: 'Charges across the arena; hold longer for a faster dash.' },
  aura: { label: 'Aura', move: 'Up to 3 squares, flying over other pieces', fight: 'Releases a pulse around itself. Heals adjacent allies each round.' },
  leader: { label: 'Leader', move: 'Teleports to any empty square within 4 steps', fight: 'A strong all-rounder. Casts one-use spells (1 HP, ends your turn).' },
}

/** How the court changes the way a role fights in a duel. */
export function courtFight(court: Court, role: Role): string {
  if (court === 'umbral') return role === 'marksman' ? 'Lobs shells that burst where they land. Regenerates in duels.' : 'Regenerates slowly during duels.'
  return role === 'marksman' ? 'Fires straight, fast shots.' : role === 'flier' ? '' : 'Dashes forward with each attack.'
}
