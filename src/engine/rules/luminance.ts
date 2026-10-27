import { eventAt } from './events'
import { fixedCourt, ringOf } from './board'
import type { Court, GameState, Pos } from './types'

/** One 8-round day, from deep dark (-2) to full light (+2). */
export const DAY = [-2, -1, 0, 1, 2, 1, 0, -1] as const

/** Alternative days: a quick six-round cycle and a slow ten-round one. */
export const DAYS = {
  standard: DAY,
  swift: [-2, -1, 1, 2, 1, -1],
  long: [-2, -1, -1, 0, 1, 2, 2, 1, 0, -1],
} as const satisfies Record<string, readonly number[]>

export type CycleId = keyof typeof DAYS

const mod = (n: number, m: number) => ((n % m) + m) % m

/**
 * Luminance of a cycling ring at a phase. Each ring lags the inner one by a step,
 * so light ripples outward whichever way the cycle runs.
 */
export function ringLuminance(phase: number, dir: 1 | -1, ring: number, day: readonly number[] = DAY): number {
  return day[mod(phase - dir * ring, day.length)]
}

export function squareLuminance(
  state: Pick<GameState, 'phase' | 'dir' | 'eclipse' | 'config'> & { round?: number },
  p: Pos,
): number {
  const fixed = fixedCourt(p)
  if (fixed) return fixed === 'solari' ? 2 : -2
  if (state.eclipse) return 0
  const lum = ringLuminance(state.phase, state.dir, ringOf(p), state.config.day)
  const event = state.config.events && state.round ? eventAt(state.config, state.round) : null
  if (event === 'flare') return Math.min(2, lum + 1)
  if (event === 'gloaming') return Math.max(-2, lum - 1)
  return lum
}

/** Center-ring luminance for the next `count` steps, as shown on the dial. */
export function forecast(state: GameState, count = 3): number[] {
  if (state.eclipse) return Array(count).fill(0)
  return Array.from({ length: count }, (_, i) => ringLuminance(state.phase + state.dir * (i + 1), state.dir, 0, state.config.day))
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
