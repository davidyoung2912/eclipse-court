import type { CellMods, DuelCells } from '../rules/cells'
import { perkMods } from '../rules/growth'
import { duelMods } from '../rules/luminance'
import type { DuelOutcome, Piece, Role } from '../rules/types'
import {
  ARENA_H, ARENA_W, DT, DUEL_SECONDS, MIN_ARENA_SCALE, NO_INPUT, SUDDEN_DEATH_AT,
  type DuelConfig, type DuelEvent, type DuelInput, type DuelState, type Fighter, type Vec,
} from './types'

interface Style {
  /** How the attack lands: a swing, a ground slam, a shot, a self-centred pulse or a charging dash. */
  kind: 'swing' | 'slam' | 'shot' | 'pulse' | 'rush'
  /** Distance (beyond body radii for melee kinds) at which the AI starts attacking. */
  reach: number
  /** Dashes forward on every swing instead of only for the Solari court. */
  dashAlways?: boolean
  speed: number
  radius: number
  cooldown: number
  /** Seconds of holding for a full charge. */
  chargeTime: number
  damage: number
  /** Damage multiplier at full charge. */
  chargeBonus: number
}

/** Tuned with the balance simulator (`npm run sim`); regenerate the matchup table after changing these. Unlisted roles borrow the footsoldier. */
const STYLE: Record<Role, Style> = {
  footsoldier: { kind: 'swing', reach: 1.1, speed: 3.2, radius: 0.45, cooldown: 0.4, chargeTime: 0.8, damage: 1.5, chargeBonus: 2 },
  flier: { kind: 'swing', reach: 1.0, dashAlways: true, speed: 4.2, radius: 0.4, cooldown: 0.4, chargeTime: 0.7, damage: 1.4, chargeBonus: 1.8 },
  marksman: { kind: 'shot', reach: 8, speed: 2.8, radius: 0.45, cooldown: 0.6, chargeTime: 0.9, damage: 1.4, chargeBonus: 2 },
  bruiser: { kind: 'slam', reach: 1.6, speed: 2.0, radius: 0.6, cooldown: 1.4, chargeTime: 1.0, damage: 1.6, chargeBonus: 1.5 },
  charger: { kind: 'rush', reach: 3.5, speed: 3.0, radius: 0.5, cooldown: 1.1, chargeTime: 0.6, damage: 1.9, chargeBonus: 1.6 },
  aura: { kind: 'pulse', reach: 1.6, speed: 2.6, radius: 0.5, cooldown: 0.8, chargeTime: 0.9, damage: 1.6, chargeBonus: 2 },
  leader: { kind: 'swing', reach: 1.3, speed: 3.0, radius: 0.5, cooldown: 0.55, chargeTime: 0.8, damage: 1.15, chargeBonus: 1.8 },
}
export const styleOf = (role: Role): Style => STYLE[role]

const MELEE_ARC = Math.PI / 3
export const SLAM_REACH = 1.2
export const SLAM_RADIUS = 1.6
export const SHOT_SPEED = 9
export const LOB_SPEED = 5
export const LOB_SPLASH = 0.9
export const LOB_MIN = 2
export const LOB_MAX = 7
const UMBRAL_REGEN = 0.1
const DASH_TIME = 0.15
const DASH_SPEED = 6
export const RUSH_SPEED = 11
export const RUSH_BASE_TIME = 0.15
export const RUSH_CHARGE_TIME = 0.35
export const PULSE_BASE = 1.4
export const PULSE_CHARGE = 0.9

export const DEFAULT_CONFIG: DuelConfig = { aimCone: (50 * Math.PI) / 180 }

export function createFighter(piece: Piece, pos: Vec, facing: number, lum: number, cell: CellMods = { dealt: 1, taken: 1 }): Fighter {
  const mods = duelMods(piece.court, lum)
  const perk = perkMods(piece)
  return {
    court: piece.court, role: piece.role, pos, vel: { x: 0, y: 0 }, facing,
    hp: piece.hp, maxHp: piece.maxHp, radius: styleOf(piece.role).radius,
    charge: 0, cooldown: 0, dash: 0, rushDamage: 0, dealt: mods.dealt * perk.dealt * cell.dealt, taken: mods.taken * perk.taken * cell.taken, wasHeld: false,
  }
}

/** The attacker starts at the bottom of the portrait arena, the defender at the top. */
export function createDuel(
  attacker: Piece,
  defender: Piece,
  lum: number,
  config: DuelConfig = DEFAULT_CONFIG,
  cells?: DuelCells,
): DuelState {
  const a = createFighter(attacker, { x: ARENA_W / 2, y: ARENA_H * 0.8 }, -Math.PI / 2, lum, cells?.attacker)
  const d = createFighter(defender, { x: ARENA_W / 2, y: ARENA_H * 0.2 }, Math.PI / 2, lum, cells?.defender)
  return { fighters: [a, d], projectiles: [], t: 0, arena: 1, done: false, config }
}

const dist = (a: Vec, b: Vec) => Math.hypot(a.x - b.x, a.y - b.y)
const angleTo = (from: Vec, to: Vec) => Math.atan2(to.y - from.y, to.x - from.x)
const angleDiff = (a: number, b: number) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)))

function bounds(arena: number) {
  const w = (ARENA_W * arena) / 2
  const h = (ARENA_H * arena) / 2
  return { minX: ARENA_W / 2 - w, maxX: ARENA_W / 2 + w, minY: ARENA_H / 2 - h, maxY: ARENA_H / 2 + h }
}

function clampToArena(f: Fighter, arena: number) {
  const b = bounds(arena)
  f.pos.x = Math.min(b.maxX - f.radius, Math.max(b.minX + f.radius, f.pos.x))
  f.pos.y = Math.min(b.maxY - f.radius, Math.max(b.minY + f.radius, f.pos.y))
}

function damage(state: DuelState, from: 0 | 1, to: 0 | 1, base: number, at: Vec, events: DuelEvent[]) {
  const dmg = base * state.fighters[from].dealt * state.fighters[to].taken
  state.fighters[to].hp -= dmg
  events.push({ type: 'hit', target: to, damage: dmg, at })
}

function aim(state: DuelState, i: 0 | 1, input: DuelInput) {
  const me = state.fighters[i]
  const foe = state.fighters[1 - i]
  if (input.aim !== undefined) {
    me.facing = input.aim
    return
  }
  const moving = Math.hypot(input.mx, input.my) > 0.1
  const heading = moving ? Math.atan2(input.my, input.mx) : me.facing
  const toFoe = angleTo(me.pos, foe.pos)
  const cone = state.config.aimCone
  if (cone > 0 && angleDiff(heading, toFoe) <= cone) me.facing = toFoe
  else if (moving) me.facing = heading
}

function fire(state: DuelState, i: 0 | 1, power: number, events: DuelEvent[]) {
  const me = state.fighters[i]
  const foe = state.fighters[1 - i] as Fighter
  const st = styleOf(me.role)
  const base = st.damage * (1 + (st.chargeBonus - 1) * power)
  me.cooldown = st.cooldown
  const dir = { x: Math.cos(me.facing), y: Math.sin(me.facing) }

  const foeIdx = (1 - i) as 0 | 1
  if (st.kind === 'slam') {
    const at = { x: me.pos.x + dir.x * SLAM_REACH, y: me.pos.y + dir.y * SLAM_REACH }
    events.push({ type: 'slam', by: i, at })
    if (dist(at, foe.pos) <= SLAM_RADIUS + foe.radius) damage(state, i, foeIdx, base, foe.pos, events)
  } else if (st.kind === 'pulse') {
    const radius = PULSE_BASE + PULSE_CHARGE * power
    events.push({ type: 'slam', by: i, at: { ...me.pos } })
    if (dist(me.pos, foe.pos) <= radius + foe.radius) damage(state, i, foeIdx, base, foe.pos, events)
  } else if (st.kind === 'rush') {
    events.push({ type: 'swing', by: i })
    me.dash = RUSH_BASE_TIME + RUSH_CHARGE_TIME * power
    me.vel = { x: dir.x * RUSH_SPEED, y: dir.y * RUSH_SPEED }
    me.rushDamage = base
  } else if (st.kind === 'shot') {
    events.push({ type: 'shoot', by: i })
    if (me.court === 'solari') {
      state.projectiles.push({
        owner: i, kind: 'straight', damage: base, ttl: 2, target: me.pos,
        pos: { x: me.pos.x + dir.x * me.radius, y: me.pos.y + dir.y * me.radius },
        vel: { x: dir.x * SHOT_SPEED, y: dir.y * SHOT_SPEED },
      })
    } else {
      const range = LOB_MIN + (LOB_MAX - LOB_MIN) * power
      const target = { x: me.pos.x + dir.x * range, y: me.pos.y + dir.y * range }
      state.projectiles.push({
        owner: i, kind: 'lob', damage: base, ttl: range / LOB_SPEED, target,
        pos: { ...me.pos }, vel: { x: dir.x * LOB_SPEED, y: dir.y * LOB_SPEED },
      })
    }
  } else {
    events.push({ type: 'swing', by: i })
    if (me.court === 'solari' || st.dashAlways) {
      me.dash = DASH_TIME
      me.vel = { x: dir.x * DASH_SPEED, y: dir.y * DASH_SPEED }
    }
    const inArc = angleDiff(me.facing, angleTo(me.pos, foe.pos)) <= MELEE_ARC
    if (inArc && dist(me.pos, foe.pos) <= st.reach + me.radius + foe.radius)
      damage(state, i, foeIdx, base, foe.pos, events)
  }
}

function stepFighter(state: DuelState, i: 0 | 1, input: DuelInput, events: DuelEvent[]) {
  const me = state.fighters[i]
  const st = styleOf(me.role)
  aim(state, i, input)

  if (me.dash > 0) {
    me.dash -= DT
    const foe = state.fighters[1 - i]
    if (me.rushDamage > 0 && dist(me.pos, foe.pos) <= me.radius + foe.radius + 0.3) {
      damage(state, i, (1 - i) as 0 | 1, me.rushDamage, foe.pos, events)
      me.rushDamage = 0
      me.dash = 0
    }
    if (me.dash <= 0) {
      me.vel = { x: 0, y: 0 }
      me.rushDamage = 0
    }
  } else {
    const len = Math.hypot(input.mx, input.my)
    const k = len > 1 ? 1 / len : 1
    // Charging slows movement so a held shot is a commitment.
    const slow = me.charge > 0 ? 0.6 : 1
    me.vel = { x: input.mx * k * st.speed * slow, y: input.my * k * st.speed * slow }
  }
  me.pos.x += me.vel.x * DT
  me.pos.y += me.vel.y * DT

  me.cooldown = Math.max(0, me.cooldown - DT)
  if (input.attack && me.cooldown <= 0) me.charge = Math.min(st.chargeTime, me.charge + DT)
  const released = !input.attack && me.wasHeld
  if (released && me.charge > 0) {
    fire(state, i, me.charge / st.chargeTime, events)
    me.charge = 0
  }
  if (!input.attack) me.charge = 0
  me.wasHeld = input.attack

  if (me.court === 'umbral') me.hp = Math.min(me.maxHp, me.hp + UMBRAL_REGEN * DT)
}

function stepProjectiles(state: DuelState, events: DuelEvent[]) {
  const b = bounds(1)
  state.projectiles = state.projectiles.filter((p) => {
    p.pos.x += p.vel.x * DT
    p.pos.y += p.vel.y * DT
    p.ttl -= DT
    const foeIdx = (1 - p.owner) as 0 | 1
    const foe = state.fighters[foeIdx]
    if (p.kind === 'straight') {
      if (dist(p.pos, foe.pos) <= foe.radius + 0.15) {
        damage(state, p.owner, foeIdx, p.damage, foe.pos, events)
        return false
      }
      return p.ttl > 0 && p.pos.x >= b.minX && p.pos.x <= b.maxX && p.pos.y >= b.minY && p.pos.y <= b.maxY
    }
    if (p.ttl > 0) return true
    if (dist(p.target, foe.pos) <= LOB_SPLASH + foe.radius) damage(state, p.owner, foeIdx, p.damage, foe.pos, events)
    return false
  })
}

/**
 * Advance one fixed 60 Hz tick. Mutates `state` in place for speed and returns the events of the tick.
 * Deterministic: the same inputs from the same start always produce the same duel.
 */
export function stepDuel(state: DuelState, inputs: [DuelInput, DuelInput]): DuelEvent[] {
  const events: DuelEvent[] = []
  if (state.done) return events
  const before = state.t
  state.t += DT
  if (before < SUDDEN_DEATH_AT && state.t >= SUDDEN_DEATH_AT) events.push({ type: 'suddenDeath' })
  if (state.t > SUDDEN_DEATH_AT) {
    const k = Math.min(1, (state.t - SUDDEN_DEATH_AT) / (DUEL_SECONDS - SUDDEN_DEATH_AT))
    state.arena = 1 - (1 - MIN_ARENA_SCALE) * k
  }

  stepFighter(state, 0, inputs[0], events)
  stepFighter(state, 1, inputs[1], events)
  stepProjectiles(state, events)

  // Soft body collision so fighters cannot overlap.
  const [a, d] = state.fighters
  const gap = dist(a.pos, d.pos)
  const min = a.radius + d.radius
  if (gap < min && gap > 1e-6) {
    const push = (min - gap) / 2
    const nx = (a.pos.x - d.pos.x) / gap
    const ny = (a.pos.y - d.pos.y) / gap
    a.pos.x += nx * push; a.pos.y += ny * push
    d.pos.x -= nx * push; d.pos.y -= ny * push
  }
  clampToArena(a, state.arena)
  clampToArena(d, state.arena)

  if (a.hp <= 0 || d.hp <= 0 || state.t >= DUEL_SECONDS) {
    state.done = true
    events.push({ type: 'end' })
  }
  return events
}

/**
 * Final HP of each side. A fighter at 0 HP is dead. On the time limit the side with the larger
 * share of its HP left wins and the other falls; an exact tie is a draw (the defender holds).
 */
export function duelOutcome(state: DuelState): DuelOutcome {
  const [a, d] = state.fighters
  const keep = (f: Fighter) => (f.hp <= 0 ? 0 : Math.max(1, Math.min(f.maxHp, Math.ceil(f.hp - 1e-9))))
  let attackerHp = keep(a)
  let defenderHp = keep(d)
  if (attackerHp > 0 && defenderHp > 0) {
    const fa = a.hp / a.maxHp
    const fd = d.hp / d.maxHp
    if (Math.abs(fa - fd) > 1e-9) {
      if (fa > fd) defenderHp = 0
      else attackerHp = 0
    }
  }
  return { attackerHp, defenderHp }
}

/** Run a whole duel headlessly from two input functions. */
export function runDuel(
  state: DuelState,
  control: (s: DuelState, i: 0 | 1) => DuelInput,
): DuelOutcome {
  while (!state.done) stepDuel(state, [control(state, 0), control(state, 1)])
  return duelOutcome(state)
}

export { NO_INPUT }
