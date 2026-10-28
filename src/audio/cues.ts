import { ringLuminance } from '../engine/rules/luminance'
import type { GameState } from '../engine/rules/types'

export type UiCue = 'tap' | 'confirm' | 'deny'

/** Which interface sound a press on a button makes: a lit primary button confirms, a disabled one denies, the rest tap. */
export function uiCueFor(button: { primary: boolean; disabled: boolean }): UiCue {
  if (button.disabled) return 'deny'
  return button.primary ? 'confirm' : 'tap'
}

/** The shortest gap between two interface sounds, so a double tap or a held key does not chatter. */
export const CUE_GAP_MS = 60

export function cueDue(now: number, last: number): boolean {
  return now - last >= CUE_GAP_MS
}

/** The ambient bed's colour for an Hour: the upper shimmer's pitch and loudness, and the note beside the drone. */
export interface HourBed {
  shimmerHz: number
  /** Multiplies the shimmer's loudness. */
  shimmerMul: number
  fifthHz: number
}

const SHIMMER_HZ = 659.25
const FIFTH_HZ = 82.41
const MINOR_HZ = 65.41

/** A bright, rising day lifts the shimmer and keeps the open fifth; a waning or dark one sinks it and turns the fifth minor; the Eclipse hushes it. */
export function hourBed(state: Pick<GameState, 'phase' | 'dir' | 'eclipse'>): HourBed {
  if (state.eclipse) return { shimmerHz: SHIMMER_HZ * Math.pow(2, -4 / 12), shimmerMul: 0.2, fifthHz: MINOR_HZ }
  const lum = ringLuminance(state.phase, state.dir, 0)
  return {
    shimmerHz: SHIMMER_HZ * Math.pow(2, (lum * 2) / 12),
    shimmerMul: 0.7 + lum * 0.15,
    fifthHz: state.dir > 0 ? FIFTH_HZ : MINOR_HZ,
  }
}
