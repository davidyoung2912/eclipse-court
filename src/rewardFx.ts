/** Rewards and feel: pure numbers for shard bursts, confetti and the rarity flip, and the flash gate. */
import type { Rarity } from './engine/data/cosmetics'

/** How many coins fly for a Shard payout: a few for a little, a fuller burst for a lot, never a flood. */
export function burstCount(shards: number): number {
  if (shards <= 0) return 0
  return Math.min(18, 4 + Math.round(Math.sqrt(shards) * 2))
}

/** Milliseconds a coin takes to fly to the wallet, and the gap between one coin and the next. */
export const COIN_FLIGHT_MS = 720
export const COIN_STEP_MS = 40

/** Confetti pieces for a win: a fuller shower for a first win, and none when flashes are reduced. */
export function confettiCount(firstWin: boolean, reduced: boolean): number {
  if (reduced) return 0
  return firstWin ? 36 : 0
}

export interface ConfettiPiece { angle: number; dist: number; hue: number; delay: number; spin: number }

/** Evenly fanned confetti with varied reach, hue and delay; the same every time so it is testable. */
export function confettiPieces(n: number): ConfettiPiece[] {
  return Array.from({ length: Math.max(0, n) }, (_, i) => ({
    angle: -90 + ((i + 0.5) / n - 0.5) * 200,
    dist: 120 + (i * 37) % 90,
    hue: (i * 47) % 360,
    delay: (i % 6) * 35,
    spin: ((i % 5) - 2) * 180,
  }))
}

/** How long the flip reveal of a new cosmetic takes: bigger rarities linger. */
export const FLIP_MS: Record<Rarity, number> = { common: 450, uncommon: 550, rare: 700, epic: 900, legend: 1200 }

/** Sparkles a reveal sheds, by rarity. */
export const REVEAL_SPARKS: Record<Rarity, number> = { common: 0, uncommon: 4, rare: 8, epic: 12, legend: 18 }

/** A flash's strength after the Reduce flashes gate: full normally, none when reduced. */
export const flashScale = (reduced: boolean): number => (reduced ? 0 : 1)

/** A pulsing warning's speed in beats per second: capped well under three a second, and still when flashes are reduced. */
export function pulseHz(hz: number, reduced: boolean): number {
  return reduced ? 0 : Math.min(hz, 2.4)
}

/** Shards a reward line pays, from "Shards: +12." or "... +5 Shards."; 0 for any other line. */
export function shardsIn(line: string): number {
  const m = /^Shards: \+(\d+)/.exec(line) ?? /\+(\d+) Shards/.exec(line)
  return m ? Number(m[1]) : 0
}

let claimed = false
/** The result dialog will fly the coins itself, so the toast skips its own burst for the next payout. */
export const claimFlight = () => { claimed = true }
/** True once if a flight was claimed; the toast calls this on every payout so a claim never lingers. */
export function takeFlightClaim(): boolean {
  const was = claimed
  claimed = false
  return was
}
