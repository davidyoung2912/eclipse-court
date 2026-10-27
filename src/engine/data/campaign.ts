import type { Difficulty } from '../../ai/profile'
import { CLASSIC_SPELLS } from '../rules/spells'
import type { Court, GameState, Piece, Role } from '../rules/types'

export interface Opponent {
  name: string
  blurb: string
  difficulty: Difficulty
  /** Rewrites the opening position; `foe` is the court the AI plays. */
  setup: (state: GameState, foe: Court) => GameState
}

const mapFoe = (s: GameState, foe: Court, f: (p: Piece) => Piece): GameState => ({
  ...s,
  pieces: s.pieces.map((p) => (p.court === foe ? f(p) : p)),
})
const withHp = (p: Piece, delta: number): Piece => ({ ...p, hp: p.hp + delta, maxHp: p.maxHp + delta })
const dropRole = (s: GameState, foe: Court, role: Role): GameState => ({
  ...s,
  pieces: s.pieces.filter((p) => !(p.court === foe && p.role === role)),
})

/** Eight opponents, easiest first; each bends the opening position in a different way. */
export const CAMPAIGN: readonly Opponent[] = [
  {
    name: 'The Novice',
    blurb: 'Fragile Footsoldiers: 1 HP less each.',
    difficulty: 'easy',
    setup: (s, foe) => mapFoe(s, foe, (p) => (p.role === 'footsoldier' ? withHp(p, -1) : p)),
  },
  {
    name: 'The Archerless',
    blurb: 'No Marksmen at all.',
    difficulty: 'easy',
    setup: (s, foe) => dropRole(s, foe, 'marksman'),
  },
  {
    name: 'The Tongue-Tied',
    blurb: 'Their Leader knows only three spells.',
    difficulty: 'normal',
    setup: (s, foe) => ({ ...s, spells: { ...s.spells, [foe]: CLASSIC_SPELLS.slice(0, 3) } }),
  },
  {
    name: 'The Wall',
    blurb: 'Footsoldiers with 2 extra HP.',
    difficulty: 'normal',
    setup: (s, foe) => mapFoe(s, foe, (p) => (p.role === 'footsoldier' ? withHp(p, 2) : p)),
  },
  {
    name: 'The Troll Court',
    blurb: 'Both Marksmen stand as Bruisers.',
    difficulty: 'normal',
    setup: (s, foe) => mapFoe(s, foe, (p) => (p.role === 'marksman' ? { ...p, role: 'bruiser', hp: 10, maxHp: 10 } : p)),
  },
  {
    name: 'The Backwards Hour',
    blurb: 'The day begins in reverse.',
    difficulty: 'hard',
    setup: (s) => ({ ...s, dir: -1 }),
  },
  {
    name: 'The Iron Court',
    blurb: 'Every piece has 1 extra HP.',
    difficulty: 'hard',
    setup: (s, foe) => mapFoe(s, foe, (p) => withHp(p, 1)),
  },
  {
    name: 'The Eclipse Queen',
    blurb: 'Every piece has 2 extra HP.',
    difficulty: 'hard',
    setup: (s, foe) => mapFoe(s, foe, (p) => withHp(p, 2)),
  },
]
