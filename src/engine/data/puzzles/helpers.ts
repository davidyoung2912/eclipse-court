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
