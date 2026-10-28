/** Fight presentation: pure numbers for the follow-zoom camera, charge auras, arena light, the combo pitch and the loser's fade. */

const clamp01 = (n: number) => Math.min(1, Math.max(0, n))

/** The share of zoom the camera holds: tighter as the fighters close in and as the weaker one runs low; none when motion is reduced. */
export function followZoom(gap: number, lowestHealth: number, reduceMotion: boolean): number {
  if (reduceMotion) return 0
  const close = 1 - clamp01((gap - 1.5) / 6)
  const hurt = 1 - clamp01(lowestHealth / 0.5)
  return 0.045 * close + 0.035 * hurt
}

/** Eases `value` toward `target` at `rate` per second without overshooting. */
export function easeTo(value: number, target: number, rate: number, dt: number): number {
  return target + (value - target) * Math.exp(-Math.max(0, rate) * Math.max(0, dt))
}

/** The glow around a charging fighter: its radius as a multiple of the fighter's and its strength (0..1); null when idle. */
export function chargeAura(charge: number): { radius: number; strength: number } | null {
  if (charge <= 0) return null
  const k = clamp01(charge)
  return { radius: 1.15 + 0.7 * k, strength: 0.25 + 0.65 * k }
}

/** The share a lob's landing decal has filled, from the shot's time left and its starting time. */
export function telegraphFill(ttl: number, start: number): number {
  return start > 0 ? clamp01(1 - ttl / start) : 1
}

/** Ambient arena light (0..1): a slow pulse with the clock that quickens toward the end, plus a flare that decays after each hit. */
export function ambientLight(t: number, shareLeft: number, flare: number): number {
  const hz = 0.25 + 0.75 * (1 - clamp01(shareLeft))
  return clamp01(0.35 + 0.15 * Math.sin(t * hz * Math.PI * 2) + flare)
}

/** The flare a hit adds to the arena light. */
export const flareFor = (damage: number): number => Math.min(0.5, 0.15 + Math.max(0, damage) * 0.1)

/** How far the background floor shifts for a given screen shake, so it trails the fighters a little. */
export const PARALLAX = 0.45

/** Hits in a row by one fighter: it carries on while hits keep landing within the window and the other side does not reply. */
export const COMBO_WINDOW = 2.5
export interface Combo { by: 0 | 1 | null; count: number; left: number }

export const NO_COMBO: Combo = { by: null, count: 0, left: 0 }

export function comboHit(c: Combo, by: 0 | 1): Combo {
  return c.by === by && c.left > 0 ? { by, count: c.count + 1, left: COMBO_WINDOW } : { by, count: 1, left: COMBO_WINDOW }
}

export function comboTick(c: Combo, dt: number): Combo {
  if (c.by === null) return c
  const left = c.left - dt
  return left > 0 ? { ...c, left } : NO_COMBO
}

/** The pitch ratio of a hit's sound: a semitone higher for each hit in the combo, up to an octave. */
export function comboPitch(count: number): number {
  return Math.pow(2, Math.min(12, Math.max(0, count - 1)) / 12)
}

/** The loser's medallion after the fall: opacity and size (1 down to 0) over about a second. */
export function loserFade(t: number): { alpha: number; scale: number } {
  const k = clamp01(t / 1)
  return { alpha: 1 - k, scale: 1 - 0.25 * k }
}
