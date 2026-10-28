/** Eclipse and spell spectacle: pure numbers for the Eclipse cinematic, each spell's signature effect and the beacon pickup flight. */
import { samePos } from './engine/rules/board'
import { leaderOf } from './engine/rules/spells'
import type { Court, GameState, Pos, Spell } from './engine/rules/types'

/** Rotate so the Solari edge (x = 0) is at the bottom of the portrait screen; the board and the pickup flight share it. */
export const toScreen = ({ x, y }: Pos, flip: boolean, size: number) =>
  flip ? { cx: size - y - 0.5, cy: x + 0.5 } : { cx: y + 0.5, cy: size - x - 0.5 }

/** Milliseconds the Eclipse cinematic holds the screen: the dim, the dark disc crossing the sun, the boom; none when motion is reduced. */
export const ECLIPSE_CINEMA_MS = 2600
export const eclipseCinemaMs = (reduceMotion: boolean) => (reduceMotion ? 0 : ECLIPSE_CINEMA_MS)

/** A spell's look: a bolt flies to the target, a beam links caster and target, a bloom opens on the spot. */
export type SpellStyle = 'bolt' | 'beam' | 'bloom'

export const SPELL_FX: Record<Spell, { style: SpellStyle; hue: string }> = {
  blink: { style: 'bolt', hue: '#ffe08a' },
  mend: { style: 'bloom', hue: '#7be39a' },
  turn: { style: 'bolt', hue: '#c9a2ff' },
  swap: { style: 'beam', hue: '#8fd4ff' },
  conjure: { style: 'bloom', hue: '#ffd36b' },
  revive: { style: 'bloom', hue: '#f4fff0' },
  bind: { style: 'beam', hue: '#a58cff' },
  hold: { style: 'bloom', hue: '#9fc4ff' },
  hasten: { style: 'bloom', hue: '#ffb36b' },
  shroud: { style: 'bloom', hue: '#6e5ad0' },
  exchange: { style: 'beam', hue: '#8fd4ff' },
  mirror: { style: 'bloom', hue: '#e6eef8' },
  sacrifice: { style: 'bolt', hue: '#ff6b6b' },
}

/** Milliseconds of the caster's charge-up, the bolt or beam crossing, and the impact bloom. */
export const CHARGE_MS = 320
export const TRAVEL_MS = 260
export const BLOOM_MS = 520

/** When the impact bloom starts: straight after the charge for a bloom, after the crossing for a bolt or beam. */
export const impactDelayMs = (style: SpellStyle) => CHARGE_MS + (style === 'bloom' ? 0 : TRAVEL_MS)

/** A cast on the board: where the charge gathers and where the effect lands (the same square for a spell on its own caster). */
export interface CastFx {
  key: number
  spell: Spell
  from: Pos
  to: Pos
}

/** The squares a cast joins, read from the state it was cast in; null when the caster has no Leader to gather at. */
export function castPath(state: GameState, court: Court, spell: Spell, pieceId?: string, to?: Pos): { from: Pos; to: Pos } | null {
  const leader = leaderOf(state, court)
  if (!leader) return null
  const piece = pieceId ? state.pieces.find((p) => p.id === pieceId) : undefined
  if (spell === 'exchange' && piece && to) return { from: piece.pos, to }
  return { from: leader.pos, to: piece?.pos ?? to ?? leader.pos }
}

/** Beacon squares a piece stepped onto between two states. */
export function beaconPickups(before: GameState, after: GameState): { pos: Pos; court: Court }[] {
  return after.pieces
    .filter((p) => after.config.beacons.some((b) => samePos(b, p.pos)) && before.pieces.some((q) => q.id === p.id && !samePos(q.pos, p.pos)))
    .map((p) => ({ pos: p.pos, court: p.court }))
}

/** Dots in a pickup's trail, the gap between them and the flight time of each. */
export const PICKUP_DOTS = 4
export const PICKUP_STEP_MS = 45
export const PICKUP_FLIGHT_MS = 650

/** A point `t` (0 to 1) along an arc from `from` to `to` that bows upward by `lift` pixels, so the pickup curves toward the HUD. */
export function arcPoint(from: { x: number; y: number }, to: { x: number; y: number }, t: number, lift = 60): { x: number; y: number } {
  return { x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t - Math.sin(Math.PI * t) * lift }
}
