import type { Court, Role } from '../rules/types'

export const DT = 1 / 60
export const DUEL_SECONDS = 20
export const SUDDEN_DEATH_AT = 12
/** Smallest arena scale reached at the time limit. */
export const MIN_ARENA_SCALE = 0.4
export const ARENA_W = 8
export const ARENA_H = 12

/** Bonus orbs that pop up in a live fight: heal over time, hit harder, or take less damage. */
export type PickupKind = 'heal' | 'attack' | 'defense'
export const PICKUP_KINDS: readonly PickupKind[] = ['heal', 'attack', 'defense']
/** Seconds an orb stays in the arena, and seconds its benefit lasts once collected. */
export const PICKUP_LIFE = 4
export const BUFF_SECONDS = 3
export const PICKUP_RADIUS = 0.35

export interface Vec {
  x: number
  y: number
}

/** One fighter's controls for a tick. Movement is a vector of length <= 1; attack is held state. */
export interface DuelInput {
  mx: number
  my: number
  attack: boolean
  /** Absolute facing in radians that bypasses aim assist; the AI sets it, touch controls never do. */
  aim?: number
}

export const NO_INPUT: DuelInput = { mx: 0, my: 0, attack: false }

export interface DuelConfig {
  /** Auto-aim cone half-angle in radians; 0 turns aim assist off. */
  aimCone: number
  /** Live fights only: the AI's walking speed grows by `perSecond` of its base for every second of the duel. */
  foeSpeedRamp?: { side: 0 | 1; perSecond: number }
  /** Live fights only: bonus orbs appear at random, from a stream seeded with `seed`. */
  pickups?: { seed: number }
}

export interface Fighter {
  court: Court
  role: Role
  pos: Vec
  vel: Vec
  /** Radians. */
  facing: number
  hp: number
  maxHp: number
  radius: number
  /** Seconds the attack button has been held for the current charge; 0 when idle. */
  charge: number
  /** Seconds until the next attack may start. */
  cooldown: number
  /** Remaining forced-motion time (lunge dash). */
  dash: number
  /** Damage the current rush deals on contact; 0 once spent or when not rushing. */
  rushDamage: number
  /** Damage multiplier for hits this fighter lands, and for hits it takes (luminance). */
  dealt: number
  taken: number
  wasHeld: boolean
  /** Seconds left of each collected benefit. */
  buffs: Record<PickupKind, number>
}

export interface Pickup {
  id: number
  kind: PickupKind
  pos: Vec
  /** Duel time it appeared at. */
  born: number
}

export interface Projectile {
  owner: 0 | 1
  kind: 'straight' | 'lob'
  pos: Vec
  vel: Vec
  damage: number
  /** Lob only: seconds of flight left, and the landing point. */
  ttl: number
  target: Vec
}

export type DuelEvent =
  | { type: 'swing'; by: 0 | 1 }
  | { type: 'shoot'; by: 0 | 1 }
  | { type: 'slam'; by: 0 | 1; at: Vec }
  | { type: 'hit'; target: 0 | 1; damage: number; at: Vec }
  | { type: 'pickup'; by: 0 | 1; kind: PickupKind; at: Vec }
  | { type: 'suddenDeath' }
  | { type: 'end' }

export interface DuelState {
  /** Index 0 is the attacker, 1 the defender. */
  fighters: [Fighter, Fighter]
  projectiles: Projectile[]
  /** Orbs waiting to be collected; always empty unless the config turns pickups on. */
  pickups: Pickup[]
  /** Random stream, next spawn time and next orb id for the pickups. */
  pickupRng: number
  nextPickup: number
  pickupId: number
  /** Elapsed seconds. */
  t: number
  /** Current arena scale in (MIN_ARENA_SCALE..1]. */
  arena: number
  done: boolean
  config: DuelConfig
}
