import { ROLE_STATS } from './roster'
import type { Scenario } from './scenarios'
import type { Difficulty } from './difficulty'
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

type Spec1 = Omit<Scenario, 'difficulty' | 'setup' | 'bonus'> & { bonus: readonly [string, Scenario['bonus']['met']]; solari: readonly Spec[]; umbral: readonly Spec[]; spells?: Parameters<typeof lineup>[2] }

/** An escort goal is kept free: whatever the foe has parked on it starts in the corner instead. */
const clear = (foes: readonly Spec[], goal: Pos | null): readonly Spec[] =>
  foes.map((f): Spec => (goal && f[1] === goal.x && f[2] === goal.y ? [f[0], 6, 6, f[3]] : f))

export const builder = (difficulty: Difficulty) => ({ bonus, solari, umbral, spells, ...rest }: Spec1): Scenario => ({
  ...rest, difficulty, bonus: { text: bonus[0], met: bonus[1] },
  setup: lineup(solari, clear(umbral, rest.objective.kind === 'escort' ? rest.objective.goal : null), spells),
})

export const taken = (n: number) => [`Take ${n} enemy piece${n === 1 ? '' : 's'}`, (s: { taken: number }) => s.taken >= n] as const
export const within = (n: number) => [`Win within ${n} rounds`, (s: { turns: number }) => s.turns <= n] as const
export const lose = (n: number) => [n === 0 ? 'Win without losing a piece' : `Lose no more than ${n} piece${n === 1 ? '' : 's'}`, (s: { lost: number }) => s.lost <= n] as const
