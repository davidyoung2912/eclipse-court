import { getSettings } from './settings'

/** Vibration patterns in milliseconds (on, off, on, ...) for the shared effect vocabulary. */
export const HAPTIC_PATTERNS = {
  select: [8],
  move: [14],
  capture: [30, 40, 20],
  confirm: [10, 30, 10],
  deny: [40, 50, 40],
  reward: [12, 40, 12, 40, 24],
  danger: [50, 60, 50],
  hit: [18],
  heavyHit: [40],
  ko: [60, 50, 120],
  unlock: [10, 30, 10, 30, 30],
  coin: [8, 24, 8],
  rumble: [40, 30, 60, 30, 80, 30, 100, 30, 120],
} as const

export type HapticKind = keyof typeof HAPTIC_PATTERNS

/** The pattern for a duel hit: a tick for a light one, a thud for a heavy one and a long double for the knock-out. */
export const hitHaptic = (damage: number, ko: boolean): HapticKind => (ko ? 'ko' : damage >= 2 ? 'heavyHit' : 'hit')

/** A short vibration outside the duel, where the device supports it and the player has not switched it off. */
export function haptic(kind: HapticKind) {
  if (!getSettings().haptics) return
  try {
    navigator.vibrate?.([...HAPTIC_PATTERNS[kind]])
  } catch {
    // Some browsers refuse vibration without a recent gesture; it is only a nicety.
  }
}
