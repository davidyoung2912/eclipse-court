import { fixedCourt, ringOf } from './board'
import type { Court, GameState, Pos } from './types'

/** One 8-round day, from deep dark (-2) to full light (+2). */
export const DAY = [-2, -1, 0, 1, 2, 1, 0, -1] as const

const mod = (n: number, m: number) => ((n % m) + m) % m

/**
 * Luminance of a cycling ring at a phase. Each ring lags the inner one by a step,
 * so light ripples outward whichever way the cycle runs.
 */
export function ringLuminance(phase: number, dir: 1 | -1, ring: number): number {
  return DAY[mod(phase - dir * ring, DAY.length)]
}

export function squareLuminance(
  state: Pick<GameState, 'phase' | 'dir' | 'eclipse'>,
  p: Pos,
): number {
  const fixed = fixedCourt(p)
  if (fixed) return fixed === 'solari' ? 2 : -2
  if (state.eclipse) return 0
  return ringLuminance(state.phase, state.dir, ringOf(p))
}

/** Center-ring luminance for the next `count` steps, as shown on the dial. */
export function forecast(state: GameState, count = 3): number[] {
  if (state.eclipse) return Array(count).fill(0)
  return Array.from({ length: count }, (_, i) => ringLuminance(state.phase + state.dir * (i + 1), state.dir, 0))
}

/** Which court a luminance favours; null at dusk. */
export function favouredCourt(lum: number): Court | null {
  return lum > 0 ? 'solari' : lum < 0 ? 'umbral' : null
}

/**
 * Duel multipliers for a court on a square of luminance `lum`: the favoured court
 * deals 15% more and takes 10% less per step of |L| (capped at +30% / -20%).
 */
export function duelMods(court: Court, lum: number): { dealt: number; taken: number } {
  if (favouredCourt(lum) !== court) return { dealt: 1, taken: 1 }
  const steps = Math.min(Math.abs(lum), 2)
  return { dealt: 1 + 0.15 * steps, taken: 1 - 0.1 * steps }
}
