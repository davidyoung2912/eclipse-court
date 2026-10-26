import type { Court, Piece, Role } from '../rules/types'

/** Placeholder stats; real numbers come from the balance simulator. */
export const ROLE_STATS: Record<Role, { hp: number; power: number }> = {
  footsoldier: { hp: 4, power: 1 },
  flier: { hp: 5, power: 1 },
  marksman: { hp: 5, power: 1.2 },
  bruiser: { hp: 10, power: 1.5 },
  charger: { hp: 6, power: 2 },
  aura: { hp: 6, power: 1.2 },
  leader: { hp: 7, power: 1.3 },
}

export const ROLE_NAMES: Record<Court, Record<Role, string>> = {
  solari: {
    footsoldier: 'Lumen Knight',
    flier: 'Sunhawk',
    marksman: 'Gilded Archer',
    bruiser: 'Dawn Golem',
    charger: 'Radiant Stag',
    aura: 'Seraph',
    leader: 'Solarch',
  },
  umbral: {
    footsoldier: 'Gloom Ghoul',
    flier: 'Night Raven',
    marksman: 'Bone Slinger',
    bruiser: 'Mire Troll',
    charger: 'Shadow Panther',
    aura: 'Wraith',
    leader: 'Duskmother',
  },
}

/** Solari layout in board coordinates (x = column from the Solari edge); Umbral mirrors it. */
const SETUP: { role: Role; x: number; y: number }[] = [
  { role: 'flier', x: 0, y: 0 },
  { role: 'marksman', x: 0, y: 1 },
  { role: 'aura', x: 0, y: 2 },
  { role: 'leader', x: 0, y: 3 },
  { role: 'bruiser', x: 0, y: 4 },
  { role: 'marksman', x: 0, y: 5 },
  { role: 'flier', x: 0, y: 6 },
  { role: 'footsoldier', x: 1, y: 1 },
  { role: 'footsoldier', x: 1, y: 2 },
  { role: 'charger', x: 1, y: 3 },
  { role: 'footsoldier', x: 1, y: 4 },
  { role: 'footsoldier', x: 1, y: 5 },
]

export function startingPieces(): Piece[] {
  const counts: Record<string, number> = {}
  return (['solari', 'umbral'] as Court[]).flatMap((court) =>
    SETUP.map(({ role, x, y }) => {
      const key = `${court}-${role}`
      counts[key] = (counts[key] ?? 0) + 1
      const { hp } = ROLE_STATS[role]
      return {
        id: `${key}-${counts[key]}`,
        court,
        role,
        hp,
        maxHp: hp,
        pos: { x: court === 'solari' ? x : 6 - x, y },
        rest: 0,
        moved: false,
      }
    }),
  )
}
