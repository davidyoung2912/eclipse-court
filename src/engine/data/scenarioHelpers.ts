import { ROLE_STATS } from './roster'
import type { Court, GameState, Piece, Pos, Role, Spell } from '../rules/types'

/** [role, x, y, hp?] in board coordinates; Umbral's x is written as it stands, not mirrored. */
export type Spec = readonly [Role, number, number, number?]

function army(court: Court, specs: readonly Spec[]): Piece[] {
  const counts: Record<string, number> = {}
  return specs.map(([role, x, y, hp]) => {
    const key = `${court}-${role}`
    counts[key] = (counts[key] ?? 0) + 1
    const max = ROLE_STATS[role].hp
    return { id: `${key}-${counts[key]}`, court, role, hp: hp ?? max, maxHp: max, pos: { x, y }, rest: 0, moved: false, bound: false }
  })
}

/** The opening position as listed, replacing the classic armies, with the spells Solari may cast. */
export const lineup = (solari: readonly Spec[], umbral: readonly Spec[], spells?: readonly Spell[]) => (s: GameState): GameState => ({
  ...s,
  pieces: [...army('solari', solari), ...army('umbral', umbral)],
  spells: spells ? { ...s.spells, solari: [...spells] } : s.spells,
})

export const at = (x: number, y: number): Pos => ({ x, y })

export const FULL_UMBRAL: readonly Spec[] = [
  ['flier', 6, 0], ['marksman', 6, 1], ['aura', 6, 2], ['leader', 6, 3], ['bruiser', 6, 4], ['marksman', 6, 5], ['flier', 6, 6],
  ['footsoldier', 5, 1], ['footsoldier', 5, 2], ['charger', 5, 3], ['footsoldier', 5, 4], ['footsoldier', 5, 5],
]
