import type { Court, Role } from '../rules/types'

export const DT = 1 / 60
export const DUEL_SECONDS = 20
export const SUDDEN_DEATH_AT = 12
/** Smallest arena scale reached at the time limit. */
export const MIN_ARENA_SCALE = 0.4
export const ARENA_W = 8
export const ARENA_H = 12

export interface Vec {
  x: number
  y: number
}

/** One fighter's controls for a tick. Movement is a vector of length <= 1; attack is held state. */
export interface DuelInput {
  mx: number
  my: number
  attack: boolean
}

export const NO_INPUT: DuelInput = { mx: 0, my: 0, attack: false }

export interface DuelConfig {
  /** Auto-aim cone half-angle in radians; 0 turns aim assist off. */
  aimCone: number
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
  | { type: 'suddenDeath' }
  | { type: 'end' }

export interface DuelState {
  /** Index 0 is the attacker, 1 the defender. */
  fighters: [Fighter, Fighter]
  projectiles: Projectile[]
  /** Elapsed seconds. */
  t: number
  /** Current arena scale in (MIN_ARENA_SCALE..1]. */
  arena: number
  done: boolean
  config: DuelConfig
}
