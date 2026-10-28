import { chebyshev, otherCourt } from '../rules/board'
import type { Court, GameState, MatchConfig, Piece } from '../rules/types'

/** How far, in squares, a piece sees under fog of war. */
export const FOG_SIGHT = 2

/** Rounds at which sudden death can begin. */
export const SUDDEN_DEATH_ROUNDS: readonly number[] = [8, 15, 25]

/** Extra HP per piece for the AI, one step per head start. */
export const HEAD_START_LEVELS: readonly number[] = [1, 2, 3]

/** True if `court` can see `piece`: its own pieces always, an enemy only within `FOG_SIGHT` of one of its own. */
export const visibleTo = (state: GameState, court: Court, piece: Piece) =>
  !state.config.fog || piece.court === court || state.pieces.some((p) => p.court === court && chebyshev(p.pos, piece.pos) <= FOG_SIGHT)

/** What each switch adds to the Shards of a game, as a fraction. */
const FOG_BONUS = 0.25
const SUDDEN_DEATH_BONUS = 0.1
const HEAD_START_BONUS = 0.2
const CLOCK_BONUS = (seconds: number) => (seconds <= 15 ? 0.15 : seconds <= 30 ? 0.1 : 0.05)

/** The Shard multiplier a match's modifiers earn for `human`; 1 without any. A head start for the human's own court earns nothing. */
export function shardMultiplier(config: MatchConfig, human: Court): number {
  let bonus = 0
  if (config.fog) bonus += FOG_BONUS
  if (config.suddenDeath) bonus += SUDDEN_DEATH_BONUS
  if (config.edge && config.edge.court === otherCourt(human)) bonus += HEAD_START_BONUS * config.edge.hp
  if (config.turnClock) bonus += CLOCK_BONUS(config.turnClock.seconds)
  return Math.round((1 + bonus) * 100) / 100
}
