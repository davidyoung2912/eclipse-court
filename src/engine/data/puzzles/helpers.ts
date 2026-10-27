import type { Difficulty } from '../../../ai/profile'
import { newGame } from '../../reducer'
import { ROLE_STATS } from '../roster'
import type { Action, Court, GameState, MatchConfig, Piece, Pos, Role, Spell } from '../../rules/types'

export type PuzzleTier = 'beginner' | 'normal' | 'expert'

/** An authored position with a goal: win within `limit` of your own turns, playing Solari. */
export interface Puzzle {
  id: string
  name: string
  /** The goal and the idea, in a sentence or two. */
  text: string
  tier: PuzzleTier
  /** Turns you have; a win on the last one still counts. */
  limit: number
  /** How well the Umbral side plays its replies and its duels. */
  difficulty: Difficulty
  build: () => GameState
  /** One way to win, as the player's actions; a capture carries the duel result it needs. */
  solution: readonly Action[]
  /** True when the Umbral replies decide the puzzle, so a rival that simply passes could be beaten faster than the real one. */
  rivalMatters?: boolean
  /** Two nudges for the Hint button: what to look at, then the idea in words. A third tap shows the move itself. */
  hints: readonly [string, string]
}

const piece = (court: Court, role: Role, n: number, x: number, y: number, hp = ROLE_STATS[role].hp): Piece => ({
  id: `${court}-${role}-${n}`, court, role, hp, maxHp: ROLE_STATS[role].hp, pos: { x, y }, rest: 0, moved: false, bound: false,
})
export const solari = (role: Role, n: number, x: number, y: number, hp?: number) => piece('solari', role, n, x, y, hp)
export const umbral = (role: Role, n: number, x: number, y: number, hp?: number) => piece('umbral', role, n, x, y, hp)

/** A puzzle position: only the listed pieces, with the beacons and rules a puzzle needs. */
export function position(
  seed: number, beacons: readonly Pos[], pieces: Piece[], spells: readonly Spell[], rules: Partial<MatchConfig> = {},
): GameState {
  return {
    ...newGame({ seed, beacons, setup: 'puzzle', ...rules }),
    pieces,
    spells: { solari: [...spells], umbral: [] },
  }
}

export const at = (x: number, y: number): Pos => ({ x, y })
export const move = (pieceId: string, x: number, y: number): Action => ({ type: 'move', pieceId, to: at(x, y) })

export const cast = (spell: Spell, target: { piece?: string; to?: Pos } = {}): Action => ({ type: 'cast', spell, pieceId: target.piece, to: target.to })

const ROLE_WORDS: Record<string, Role> = {
  foot: 'footsoldier', flier: 'flier', mark: 'marksman', brute: 'bruiser', stag: 'charger', aura: 'aura', lead: 'leader',
}

/**
 * Pieces from a short spec such as `'lead 0,3; foot 1,1 hp2; stag 4,2'`: a role word, a square and an optional `hpN`.
 * Ids are numbered per role in the order listed, like `solari-footsoldier-2`.
 */
export function army(court: Court, spec: string): Piece[] {
  const counts: Record<string, number> = {}
  return spec.split(';').map((s) => s.trim()).filter(Boolean).map((entry) => {
    const [word, square, hp] = entry.split(/\s+/)
    const role = ROLE_WORDS[word]
    if (!role) throw new Error(`unknown role "${word}"`)
    const [x, y] = square.split(',').map(Number)
    counts[role] = (counts[role] ?? 0) + 1
    return piece(court, role, counts[role], x, y, hp ? Number(hp.slice(2)) : undefined)
  })
}

export interface PuzzleDef extends Omit<Puzzle, 'build' | 'difficulty'> {
  seed: number
  beacons: readonly Pos[]
  solari: string
  umbral: string
  spells?: readonly Spell[]
  rules?: Partial<MatchConfig>
  /** Fallen Solari pieces waiting for Revive, as an army spec (the last one listed is the first to return). */
  fallen?: string
  /** What Umbral cast last, for Mirror to copy. */
  lastUmbral?: Spell
  /** Spells the Duskmother holds; she casts them as the AI sees fit. */
  umbralSpells?: readonly Spell[]
}

/** Defines a puzzle from short specs; its Umbral difficulty follows the tier. */
export function puzzle(def: PuzzleDef): Puzzle {
  const { seed, beacons, solari: s, umbral: u, spells = [], rules, fallen, lastUmbral, umbralSpells = [], ...rest } = def
  const difficulty: Difficulty = rest.tier === 'beginner' ? 'easy' : rest.tier === 'normal' ? 'normal' : 'hard'
  return {
    ...rest,
    difficulty,
    build: () => {
      const state = position(seed, beacons, [...army('solari', s), ...army('umbral', u)], spells, { passives: false, ...rules })
      return {
        ...state,
        spells: { ...state.spells, umbral: [...umbralSpells] },
        captured: fallen ? army('solari', fallen).map((p) => ({ ...p, hp: 0 })) : [],
        lastCast: { solari: null, umbral: lastUmbral ?? null },
      }
    },
  }
}
