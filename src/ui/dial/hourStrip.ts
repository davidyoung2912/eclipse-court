import type { GameState } from '../../engine/rules/types'

export type Hour = 'rising' | 'waning' | 'eclipse'

/** The Hour the HUD wears (the same one that washes the board) and how far along the dawn-to-Eclipse strip the match is, 0 to 1. */
export function hourStrip(state: Pick<GameState, 'round' | 'eclipse' | 'dir' | 'config'>): { hour: Hour; at: number } {
  if (state.eclipse) return { hour: 'eclipse', at: 1 }
  const span = Math.max(1, state.config.eclipseRound - 1)
  const at = Math.min(1, Math.max(0, (state.round - 1) / span))
  return { hour: state.dir > 0 ? 'rising' : 'waning', at }
}
