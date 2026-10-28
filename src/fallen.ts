import { VALUE } from './ai/strategy'
import type { Court, GameState, Piece } from './engine/rules/types'

/** The pieces a court has lost, in the order they fell. Read from the capture list; the engine is untouched. */
export function fallenOf(state: Pick<GameState, 'captured'>, court: Court): Piece[] {
  return state.captured.filter((p) => p.court === court)
}

/** What a court's fallen pieces were worth, by the same scale the AI weighs trades with. */
export const worthOf = (pieces: readonly Piece[]): number => pieces.reduce((sum, p) => sum + VALUE[p.role], 0)

/**
 * How far ahead in material each court is: the value of the enemy pieces it has taken less its own losses.
 * Only the leading court gets a number; level material gives both zero.
 */
export function materialLead(state: Pick<GameState, 'captured'>): Record<Court, number> {
  const diff = worthOf(fallenOf(state, 'umbral')) - worthOf(fallenOf(state, 'solari'))
  return { solari: Math.max(0, diff), umbral: Math.max(0, -diff) }
}
