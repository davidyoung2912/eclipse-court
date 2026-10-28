/** Board move feel: pure numbers for the capture lunge, the cascade of move dots and the turn tint. */
import type { Court, Pos } from './engine/rules/types'

/** How far (in squares) a capturing piece pushes past its landing before it settles back. */
export const LUNGE_REACH = 0.16

/** The unit step of a move on screen, scaled to the lunge; none for a move that went nowhere. */
export function lungeOffset(from: Pos, to: Pos, reach = LUNGE_REACH): { dx: number; dy: number } {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const len = Math.hypot(dx, dy)
  return len === 0 ? { dx: 0, dy: 0 } : { dx: (dx / len) * reach, dy: (dy / len) * reach }
}

/** Milliseconds between one ring of move dots popping in and the next. */
export const CASCADE_STEP_MS = 20
const CASCADE_MAX_STEPS = 9

/** The delay before the dot at `to` pops in, growing with its distance from the lifted piece. */
export function cascadeDelay(from: Pos | undefined, to: Pos): number {
  if (!from) return 0
  const steps = Math.min(CASCADE_MAX_STEPS, Math.max(Math.abs(to.x - from.x), Math.abs(to.y - from.y)))
  return steps * CASCADE_STEP_MS
}

/** The colour of the ambient glow around the board for the court to move. */
export function turnGlow(court: Court): string {
  return court === 'solari' ? 'rgba(232, 182, 74, 0.55)' : 'rgba(140, 110, 255, 0.55)'
}
