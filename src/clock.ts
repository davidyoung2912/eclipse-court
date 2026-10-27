import type { TurnClock } from './engine/rules/types'

/** Seconds a turn clock may be set to; links from outside are held to this. */
export const CLOCK_MIN = 3
export const CLOCK_MAX = 600
export const CLOCK_WARNING = 5

/** The extra time Blitz offers when "extra time" is on: a pool per court that is spent only after a turn runs out. */
export const BANK_SECONDS = 30

export interface ClockReading {
  /** Whole seconds left in this turn's own allowance (0 once it has run out). */
  turn: number
  /** Whole seconds of banked time left once the allowance is used up. */
  bank: number
  /** Whole seconds left in all, which is what the countdown shows. */
  total: number
  /** The turn is over: pass for the player. */
  expired: boolean
  /** Within the last few seconds, when the clock pulses and ticks. */
  urgent: boolean
}

/** What the clock shows after `elapsedMs` of a turn, with `bankMs` of banked time to draw on. */
export function readClock(clock: TurnClock, elapsedMs: number, bankMs: number): ClockReading {
  const allowance = clock.seconds * 1000
  const leftMs = allowance + bankMs - elapsedMs
  const expired = leftMs <= 0
  const turn = Math.max(0, Math.ceil((allowance - elapsedMs) / 1000))
  const bank = Math.max(0, Math.ceil((bankMs - Math.max(0, elapsedMs - allowance)) / 1000))
  const total = Math.max(0, Math.ceil(leftMs / 1000))
  return { turn, bank, total, expired, urgent: !expired && total <= CLOCK_WARNING }
}

/** The bank that remains once a turn of `elapsedMs` is over: only time beyond the allowance is spent. */
export function bankAfter(clock: TurnClock, elapsedMs: number, bankMs: number): number {
  return Math.max(0, bankMs - Math.max(0, elapsedMs - clock.seconds * 1000))
}

/** Each court starts the match with the clock's whole bank. */
export const startingBank = (clock: TurnClock) => (clock.bank ?? 0) * 1000
