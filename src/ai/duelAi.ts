import { rngNext } from '../engine/rng'
import {
  LOB_MAX, LOB_MIN, LOB_SPEED, PULSE_BASE, PULSE_CHARGE, RUSH_BASE_TIME, RUSH_CHARGE_TIME, RUSH_SPEED,
  SHOT_SPEED, SLAM_REACH, styleOf,
} from '../engine/duel/duel'
import { ARENA_H, ARENA_W, NO_INPUT, PICKUP_LIFE, type DuelInput, type DuelState, type Projectile, type Vec } from '../engine/duel/types'
import type { AiProfile } from './profile'

export type DuelController = (state: DuelState, i: 0 | 1) => DuelInput

/** What the AI last saw of its opponent; refreshed once per reaction interval. */
interface Look {
  foe: Vec
  foeVel: Vec
  foeCharge: number
  shots: Pick<Projectile, 'kind' | 'pos' | 'vel' | 'target' | 'ttl'>[]
}

const STANDOFF = 4.6
const DODGE_TIME = 0.35
const THREAT_MARGIN = 0.5
/** Speed ratio needed before running from a melee attack beats trading blows. */
const OUTPACE = 1.15
/** How far away an orb can be and still tempt it. */
const PICKUP_RANGE = 4.5

const dist = (a: Vec, b: Vec) => Math.hypot(a.x - b.x, a.y - b.y)
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

/**
 * Per-role duel opponent built as a small state machine: it looks at the opponent every
 * `reaction` seconds, then approaches or kites, dodges noticed threats, and charges an attack
 * sized to the range. Seeded, so a duel with the same seed and inputs always plays out the same.
 */
export function createDuelAi(profile: AiProfile, seed: number): DuelController {
  let rng = seed >>> 0
  const rand = () => {
    const [v, next] = rngNext(rng)
    rng = next
    return v
  }
  /** Roughly bell-shaped, in -1..1. */
  const noise = () => rand() + rand() - 1

  let look: Look | null = null
  let nextLook = 0
  /** The orb it has decided to go for, if any. */
  let goalId = -1
  let dodgeDir: Vec | null = null
  let dodgeUntil = 0
  let strafe = 1
  let strafeUntil = 0
  let holdTarget = 0
  let wantCharge = false
  let holdOffUntil = 0
  const calm = 1 - profile.aggression

  const notice = (state: DuelState, i: 0 | 1) => {
    const me = state.fighters[i]
    const foe = state.fighters[1 - i]
    look = {
      foe: { ...foe.pos },
      foeVel: { ...foe.vel },
      foeCharge: foe.charge,
      shots: state.projectiles
        .filter((p) => p.owner !== i)
        .map((p) => ({ kind: p.kind, pos: { ...p.pos }, vel: { ...p.vel }, target: { ...p.target }, ttl: p.ttl })),
    }
    // Sometimes spot a nearby orb it can reach before it fades, and head for it; sharper fighters do so more often.
    if (goalId < 0 || !state.pickups.some((o) => o.id === goalId)) {
      goalId = -1
      let best = PICKUP_RANGE
      for (const o of state.pickups) {
        const gap = dist(o.pos, me.pos)
        const left = PICKUP_LIFE - (state.t - o.born)
        if (gap < best && gap / (styleOf(me.role).speed || 1) < left && rand() < 0.35 + 0.5 * profile.lead) { best = gap; goalId = o.id }
      }
    }
    const threat = findThreat(state, i, look, me.pos)
    if (threat && rand() < profile.dodge) {
      dodgeDir = threat
      dodgeUntil = state.t + DODGE_TIME
    }
  }

  return (state, i) => {
    const me = state.fighters[i]
    if (state.done) return NO_INPUT
    if (!look || state.t >= nextLook) {
      notice(state, i)
      nextLook = state.t + profile.reaction
    }
    const seen = look!
    const st = styleOf(me.role)
    const ranged = st.kind === 'shot'
    const dx = seen.foe.x - me.pos.x
    const dy = seen.foe.y - me.pos.y
    const d = Math.hypot(dx, dy) || 1
    const ux = dx / d
    const uy = dy / d

    if (state.t >= strafeUntil) {
      strafe = rand() < 0.5 ? -1 : 1
      strafeUntil = state.t + 0.8 + rand() * 1.2
    }
    // Keep away from walls: lean towards the middle of the arena when close to an edge.
    const cx = ARENA_W / 2
    const cy = ARENA_H / 2
    const hw = (ARENA_W * state.arena) / 2
    const hh = (ARENA_H * state.arena) / 2
    const wall = Math.max(Math.abs(me.pos.x - cx) / hw, Math.abs(me.pos.y - cy) / hh)
    const lean = wall > 0.75 ? (wall - 0.75) * 4 : 0
    const toMidX = (cx - me.pos.x) / (Math.hypot(cx - me.pos.x, cy - me.pos.y) || 1)
    const toMidY = (cy - me.pos.y) / (Math.hypot(cx - me.pos.x, cy - me.pos.y) || 1)

    let mx = 0
    let my = 0
    let aimAt = Math.atan2(dy, dx)
    let range: number // distance at which the attack is worth starting
    let power = 0.4 // charge fraction wanted

    if (ranged) {
      const gap = d - (STANDOFF + calm * 1.5)
      const radial = Math.abs(gap) < 0.7 ? 0 : Math.sign(gap)
      mx = ux * radial - uy * strafe * 0.8
      my = uy * radial + ux * strafe * 0.8
      range = LOB_MAX - 0.5
      const flight = d / (me.court === 'solari' ? SHOT_SPEED : LOB_SPEED)
      const px = seen.foe.x + seen.foeVel.x * flight * profile.lead
      const py = seen.foe.y + seen.foeVel.y * flight * profile.lead
      aimAt = Math.atan2(py - me.pos.y, px - me.pos.x)
      if (me.court === 'umbral') {
        const shotRange = clamp(Math.hypot(px - me.pos.x, py - me.pos.y), LOB_MIN, LOB_MAX)
        power = (shotRange - LOB_MIN) / (LOB_MAX - LOB_MIN)
      } else power = 0.3 + 0.4 * rand()
    } else {
      const reach = st.reach + me.radius + 0.45
      let stand = reach * 0.85
      range = reach
      if (st.kind === 'rush') {
        stand = 2.6
        range = 5
        const dash = clamp((d + 0.4) / RUSH_SPEED, RUSH_BASE_TIME, RUSH_BASE_TIME + RUSH_CHARGE_TIME)
        power = (dash - RUSH_BASE_TIME) / RUSH_CHARGE_TIME
      } else if (st.kind === 'pulse') {
        stand = (PULSE_BASE + PULSE_CHARGE * 0.3) * 0.8
        range = PULSE_BASE + PULSE_CHARGE * 0.3 + 0.45
        power = 0.3
      } else if (st.kind === 'slam') {
        stand = SLAM_REACH
        power = 0.3 + 0.4 * rand()
      } else power = 0.15 + 0.5 * rand()
      // Hit and run: a careful fighter backs off while its own attack recovers.
      const faster = st.speed > styleOf(state.fighters[1 - i].role).speed * OUTPACE
      const closing = faster && me.cooldown > 0 && d < range + 1 ? -profile.dodge : d > stand ? 0.25 + 0.75 * profile.aggression : 0
      // Circle a little when in range so the opponent's swings are harder to land.
      const orbit = closing ? 0.25 : 0.7
      mx = ux * closing - uy * strafe * orbit
      my = uy * closing + ux * strafe * orbit
      aimAt = Math.atan2(dy, dx)
    }

    // A gentle opponent also holds back the size of its blows.
    power *= 0.6 + 0.4 * profile.aggression
    mx += toMidX * lean
    my += toMidY * lean
    const goal = goalId < 0 ? undefined : state.pickups.find((o) => o.id === goalId)
    if (goal) {
      const gx = goal.pos.x - me.pos.x
      const gy = goal.pos.y - me.pos.y
      const gd = Math.hypot(gx, gy) || 1
      mx = (gx / gd) * 0.85 + mx * 0.15
      my = (gy / gd) * 0.85 + my * 0.15
    }
    aimAt += noise() * profile.aimError

    let attack = false
    if (state.t < dodgeUntil && dodgeDir) {
      mx = dodgeDir.x
      my = dodgeDir.y
    } else {
      dodgeDir = null
      const inRange = d <= range
      if (inRange && me.cooldown <= 0 && (wantCharge || state.t >= holdOffUntil)) {
        if (!wantCharge) {
          holdTarget = Math.max(0.05, power * st.chargeTime)
          wantCharge = true
        }
        attack = me.charge < holdTarget
        if (!attack) {
          wantCharge = false
          // Pause before the next attack; the less aggressive, the longer.
          holdOffUntil = state.t + calm * (0.6 + 2.4 * rand())
        }
      } else wantCharge = false
    }
    return { mx, my, attack, aim: aimAt }
  }
}

/** A sideways or backward step that avoids what the opponent is doing, or null if nothing threatens. */
function findThreat(state: DuelState, i: 0 | 1, look: Look, me: Vec): Vec | null {
  const self = state.fighters[i]
  for (const p of look.shots) {
    if (p.kind === 'lob') {
      const gap = dist(p.target, me)
      if (gap < 0.9 + self.radius + THREAT_MARGIN) {
        const away = gap < 1e-6 ? { x: 0, y: 1 } : { x: (me.x - p.target.x) / gap, y: (me.y - p.target.y) / gap }
        return away
      }
      continue
    }
    const speed = Math.hypot(p.vel.x, p.vel.y) || 1
    const rx = p.pos.x - me.x
    const ry = p.pos.y - me.y
    const tca = -(rx * p.vel.x + ry * p.vel.y) / (speed * speed)
    if (tca <= 0 || tca > 1.2) continue
    const missX = rx + p.vel.x * tca
    const missY = ry + p.vel.y * tca
    if (Math.hypot(missX, missY) > self.radius + THREAT_MARGIN) continue
    // Step perpendicular to the shot, towards the side we are already off-centre on.
    const nx = -p.vel.y / speed
    const ny = p.vel.x / speed
    const side = missX * nx + missY * ny > 0 ? -1 : 1
    return { x: nx * side, y: ny * side }
  }
  const foe = state.fighters[1 - i]
  const foeStyle = styleOf(foe.role)
  const d = dist(look.foe, me)
  // Only run from a melee attacker we can outpace; a slower fighter is better off trading blows.
  if (look.foeCharge > 0 && foeStyle.kind !== 'shot' && styleOf(self.role).speed > foeStyle.speed * OUTPACE) {
    const reach = foeStyle.kind === 'rush' ? 5.5 : foeStyle.reach + foe.radius + self.radius + 1
    if (d < reach) {
      const ux = (me.x - look.foe.x) / (d || 1)
      const uy = (me.y - look.foe.y) / (d || 1)
      // Radial attacks and swings are outrun; a straight rush is sidestepped.
      if (foeStyle.kind !== 'rush') return { x: ux, y: uy }
      const side = ((state.t * 7) | 0) % 2 === 0 ? 1 : -1
      return { x: -uy * side, y: ux * side }
    }
  }
  return null
}
