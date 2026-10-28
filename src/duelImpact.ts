/** Fight feel: pure numbers for hit-stop, the camera punch, the trailing health bar and the K.O. slow-motion. */

/** How long the simulation freezes on a hit: heavier blows linger, and the killing blow lingers most. */
export function hitStopFor(damage: number, ko: boolean): number {
  if (ko) return 0.22
  return Math.min(0.13, 0.05 + Math.max(0, damage) * 0.02)
}

/** How far the camera punches in on a hit (a share of the zoom); none when motion is reduced. */
export function punchFor(damage: number, ko: boolean, reduceMotion: boolean): number {
  if (reduceMotion) return 0
  if (ko) return 0.09
  return Math.min(0.06, 0.014 + Math.max(0, damage) * 0.012)
}

/** How fast the camera settles back from a punch, per second. */
export const PUNCH_RETURN = 9

/** Effects run at this share of real time once a fighter has fallen, for KO_SLOW_SECONDS of real time. */
export const KO_SLOW = 0.3
export const KO_SLOW_SECONDS = 0.9
/** The pause after a K.O. before the result is handed on, a little longer than an ordinary finish. */
export const KO_END_DELAY = 1.7

/** Seconds the pale "ghost" health segment waits after a hit before it drains, and how fast it then drains (health share per second). */
export const GHOST_HOLD = 0.35
export const GHOST_DRAIN = 0.7

export interface Ghost {
  /** The share of health the trailing segment shows; never below the real share. */
  value: number
  /** Seconds left before it starts to drain. */
  hold: number
}

/** Advances the trailing health segment: it holds after a loss, then drains down to the real health. */
export function stepGhost(g: Ghost, health: number, dt: number): Ghost {
  if (health >= g.value) return { value: health, hold: 0 }
  const hold = g.hold > 0 ? g.hold : 0
  if (hold > 0) return { value: g.value, hold: Math.max(0, hold - dt) }
  return { value: Math.max(health, g.value - GHOST_DRAIN * dt), hold: 0 }
}

/** Restarts the hold when a hit lands. */
export function struck(g: Ghost): Ghost {
  return { value: g.value, hold: GHOST_HOLD }
}

/** The colour of a health bar: green while healthy, amber when hurt, red when low. */
export function healthColor(share: number): string {
  if (share <= 0.34) return '#ff5a64'
  if (share <= 0.6) return '#f2c14e'
  return '#6fe08a'
}

/** The red pulse at the screen edge for the player's own fighter when low: its strength (0..1) and speed in beats per second. */
export function lowHealthPulse(share: number): { strength: number; hz: number } | null {
  if (share <= 0 || share > 0.34) return null
  const need = 1 - share / 0.34
  return { strength: 0.35 + 0.65 * need, hz: 1.2 + 1.6 * need }
}

/** The radius (in arena units) of the shockwave ring a hit sends out. */
export function shockwaveRadius(damage: number): number {
  return Math.min(3, 1 + Math.max(0, damage) * 0.5)
}

/** How many chunky debris sparks a hit throws, on top of the ordinary ones; none when motion is reduced. */
export function debrisCount(damage: number, reduceMotion: boolean): number {
  return reduceMotion ? 0 : 2 + Math.round(Math.max(0, damage) * 1.5)
}
