/** Game feel: pure rules for capture streaks, screen shake and how far the music has built toward the Eclipse. */
import type { Step } from './engine/log'
import type { Court, GameState } from './engine/rules/types'

/** How many pieces the move into `next` removed from the board. */
export function piecesLost(prev: GameState, next: GameState): number {
  return Math.max(0, prev.pieces.length - next.pieces.length)
}

export interface Streak {
  court: Court
  /** Consecutive turns of that court, ending with the latest, that each took a piece. */
  count: number
}

/**
 * The capture streak of the court that just acted. A turn that takes nothing (a quiet move, a spell or a pass)
 * ends it, and the other court's turns in between do not count against it.
 */
export function streakAfter(steps: readonly Step[]): Streak | null {
  const counts: Record<Court, number> = { solari: 0, umbral: 0 }
  let last: Court | null = null
  for (let i = 1; i < steps.length; i++) {
    const court = steps[i - 1].state.turn
    counts[court] = piecesLost(steps[i - 1].state, steps[i].state) > 0 ? counts[court] + 1 : 0
    last = court
  }
  return last ? { court: last, count: counts[last] } : null
}

const STREAK_LABELS = ['', '', 'Double Capture', 'Triple Capture', 'Rampage', 'Unstoppable']

/** The words shown for a streak; a single capture is the ordinary case and says nothing. */
export function streakLabel(count: number): string | null {
  if (count < 2) return null
  return STREAK_LABELS[Math.min(count, STREAK_LABELS.length - 1)]
}

export interface Shake {
  /** Peak offset of the board in pixels. */
  px: number
  ms: number
}

/** The shake for a capture: stronger for more pieces lost and the heaviest for a Leader; none when motion is reduced. */
export function shakeFor(lost: number, leaderFell: boolean, reduceMotion: boolean): Shake | null {
  if (reduceMotion || lost <= 0) return null
  if (leaderFell) return { px: 12, ms: 520 }
  return { px: Math.min(9, 3 + lost * 2), ms: 280 + Math.min(2, lost) * 60 }
}

/** The pull of the music, from 0 at the first round to 1 once the Eclipse has fallen. */
export function musicLevel(state: Pick<GameState, 'round' | 'eclipse' | 'config' | 'winner'>): number {
  if (state.winner) return 0
  if (state.eclipse) return 1
  const span = Math.max(1, state.config.eclipseRound - 1)
  return Math.min(0.9, Math.max(0, (state.round - 1) / span) * 0.9)
}
