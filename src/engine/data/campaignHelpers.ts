import type { PersonalityId } from '../../ai/personality'
import type { Difficulty } from '../../ai/profile'
import type { Court, GameState, MatchConfig, Piece, Role } from '../rules/types'

export interface Opponent {
  /** Stable key for saved progress; unique among battles. */
  id: string
  name: string
  blurb: string
  difficulty: Difficulty
  personality: PersonalityId
  /** Board variant id; classic when absent. */
  board?: string
  /** Match settings beyond the board (win condition, events, showdown, ...). */
  rules?: Partial<MatchConfig>
  /** The Umbral army when it is not the classic one. */
  army?: readonly Role[]
  /** Rewrites the opening position; `foe` is the court the AI plays. */
  setup?: (state: GameState, foe: Court) => GameState
  /** A rule only this opponent plays by; the config and setup above already carry it out. */
  boss?: string
}

export const mapFoe = (s: GameState, foe: Court, f: (p: Piece) => Piece): GameState => ({
  ...s,
  pieces: s.pieces.map((p) => (p.court === foe ? f(p) : p)),
})
export const withHp = (p: Piece, delta: number): Piece => ({ ...p, hp: p.hp + delta, maxHp: p.maxHp + delta })

/** Changes the HP of the foe's pieces of the given roles. */
export const hpOf = (roles: readonly Role[], delta: number) => (s: GameState, foe: Court) =>
  mapFoe(s, foe, (p) => (roles.includes(p.role) ? withHp(p, delta) : p))

/** Changes the HP of every piece the foe has. */
export const hpAll = (delta: number) => (s: GameState, foe: Court) => mapFoe(s, foe, (p) => withHp(p, delta))
