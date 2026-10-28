import { describe, expect, it } from 'vitest'
import { createDuelAi } from '../../ai/duelAi'
import { profileForSkill } from '../../ai/profile'
import { startingPieces } from '../data/roster'
import { createDuel, duelOutcome, runDuel, stepDuel } from './duel'
import { ARENA_H, ARENA_W, BUFF_SECONDS, DT, DUEL_SECONDS, MIN_ARENA_SCALE, NO_INPUT, PICKUP_LIFE } from './types'
import type { Role } from '../rules/types'

const piece = (court: 'solari' | 'umbral', role: Role) => {
  const p = startingPieces().find((x) => x.court === court && x.role === role)
  if (!p) throw new Error('missing piece')
  return p
}

const bothAi = () => {
  const ais = [createDuelAi(profileForSkill(0.5), 1), createDuelAi(profileForSkill(0.5), 2)]
  return (s: Parameters<typeof runDuel>[0], i: 0 | 1) => ais[i](s, i)
}

describe('duel sim', () => {
  it('is deterministic for the same inputs', () => {
    const run = () => {
      const s = createDuel(piece('solari', 'footsoldier'), piece('umbral', 'marksman'), 1)
      const out = runDuel(s, bothAi())
      return { out, hp: s.fighters.map((f) => f.hp), t: s.t }
    }
    expect(run()).toEqual(run())
  })

  it('ends by the time limit and idle fighters draw', () => {
    const s = createDuel(piece('solari', 'footsoldier'), piece('umbral', 'footsoldier'), 0)
    const out = runDuel(s, () => NO_INPUT)
    expect(s.t).toBeGreaterThanOrEqual(DUEL_SECONDS)
    expect(s.t).toBeLessThan(DUEL_SECONDS + 0.05)
    expect(out.attackerHp).toBeGreaterThan(0)
    expect(out.defenderHp).toBeGreaterThan(0)
  })

  it('shrinks the arena in sudden death and keeps fighters inside', () => {
    const s = createDuel(piece('solari', 'footsoldier'), piece('umbral', 'footsoldier'), 0)
    runDuel(s, () => NO_INPUT)
    expect(s.arena).toBeCloseTo(MIN_ARENA_SCALE, 1)
    for (const f of s.fighters) {
      expect(Math.abs(f.pos.x - ARENA_W / 2)).toBeLessThanOrEqual((ARENA_W * s.arena) / 2)
      expect(Math.abs(f.pos.y - ARENA_H / 2)).toBeLessThanOrEqual((ARENA_H * s.arena) / 2)
    }
  })

  it('never reports negative or oversized HP across roles', () => {
    const roles: Role[] = ['footsoldier', 'flier', 'marksman', 'bruiser', 'charger', 'aura', 'leader']
    for (const a of roles) for (const d of roles) for (const court of ['solari', 'umbral'] as const) {
      const s = createDuel(piece(court, a), piece(court === 'solari' ? 'umbral' : 'solari', d), 1)
      const out = runDuel(s, bothAi())
      for (const [hp, f] of [[out.attackerHp, s.fighters[0]], [out.defenderHp, s.fighters[1]]] as const) {
        expect(hp).toBeGreaterThanOrEqual(0)
        expect(hp).toBeLessThanOrEqual(f.maxHp)
      }
      expect(out.attackerHp > 0 && out.defenderHp > 0 && s.t < DUEL_SECONDS).toBe(false)
    }
  })

  it('a swing in range hurts, scaled by luminance', () => {
    const hitDamage = (lum: number) => {
      const s = createDuel(piece('solari', 'footsoldier'), piece('umbral', 'footsoldier'), lum)
      s.fighters[1].pos = { x: s.fighters[0].pos.x, y: s.fighters[0].pos.y - 1.2 }
      stepDuel(s, [{ mx: 0, my: 0, attack: true }, NO_INPUT])
      s.fighters[0].cooldown = 0
      const events = stepDuel(s, [NO_INPUT, NO_INPUT])
      const hit = events.find((e) => e.type === 'hit')
      return hit && hit.type === 'hit' ? hit.damage : 0
    }
    expect(hitDamage(0)).toBeGreaterThan(0)
    expect(hitDamage(2)).toBeGreaterThan(hitDamage(0))
    expect(hitDamage(-2)).toBeLessThan(hitDamage(0))
  })

  it('a fully charged bruiser slam outdamages an uncharged one', () => {
    const slam = (ticks: number) => {
      const s = createDuel(piece('solari', 'bruiser'), piece('umbral', 'bruiser'), 0)
      s.fighters[1].pos = { x: s.fighters[0].pos.x, y: s.fighters[0].pos.y - 1.5 }
      for (let i = 0; i < ticks; i++) stepDuel(s, [{ mx: 0, my: 0, attack: true }, NO_INPUT])
      const ev = stepDuel(s, [NO_INPUT, NO_INPUT])
      const hit = ev.find((e) => e.type === 'hit')
      return hit && hit.type === 'hit' ? hit.damage : 0
    }
    expect(slam(70)).toBeGreaterThan(slam(2))
  })

  it('outcome favours the side with more HP share at the limit', () => {
    const s = createDuel(piece('solari', 'footsoldier'), piece('umbral', 'footsoldier'), 0)
    s.fighters[1].hp = 1
    s.done = true
    const out = duelOutcome(s)
    expect(out.defenderHp).toBe(0)
    expect(out.attackerHp).toBe(4)
  })

  describe('pickups', () => {
    const live = (seed = 5) => createDuel(piece('solari', 'footsoldier'), piece('umbral', 'footsoldier'), 0, { aimCone: 0, pickups: { seed } })
    const idle = [NO_INPUT, NO_INPUT] as [typeof NO_INPUT, typeof NO_INPUT]

    it('never appear unless the config turns them on', () => {
      const s = createDuel(piece('solari', 'footsoldier'), piece('umbral', 'footsoldier'), 0)
      for (let i = 0; i < 600; i++) stepDuel(s, idle)
      expect(s.pickups).toEqual([])
    })

    it('appear, stay within the arena and expire after their life', () => {
      const s = live()
      let seen = 0
      while (!s.done && s.pickups.length === 0) stepDuel(s, idle)
      const orb = s.pickups[0]
      expect(orb).toBeDefined()
      expect(orb.pos.x).toBeGreaterThan(0)
      expect(orb.pos.x).toBeLessThan(ARENA_W)
      expect(orb.pos.y).toBeGreaterThan(0)
      expect(orb.pos.y).toBeLessThan(ARENA_H)
      while (s.t - orb.born < PICKUP_LIFE + 2 * DT) { stepDuel(s, idle); seen++ }
      expect(s.pickups.find((o) => o.id === orb.id)).toBeUndefined()
      expect(seen).toBeGreaterThan(0)
    })

    it('are the same for the same seed', () => {
      const run = () => { const s = live(9); for (let i = 0; i < 480; i++) stepDuel(s, idle); return s.pickups }
      expect(run()).toEqual(run())
    })

    const take = (kind: 'heal' | 'attack' | 'defense') => {
      const s = live()
      s.pickups.push({ id: 99, kind, pos: { ...s.fighters[0].pos }, born: 0 })
      const events = stepDuel(s, idle)
      return { s, events }
    }

    it('give a fighter that touches one a timed benefit', () => {
      const { s, events } = take('attack')
      expect(events.some((e) => e.type === 'pickup' && e.by === 0 && e.kind === 'attack')).toBe(true)
      expect(s.pickups.find((o) => o.id === 99)).toBeUndefined()
      expect(s.fighters[0].buffs.attack).toBeGreaterThan(BUFF_SECONDS - 0.1)
      for (let i = 0; i < Math.ceil((BUFF_SECONDS + 0.2) / DT); i++) stepDuel(s, idle)
      expect(s.fighters[0].buffs.attack).toBe(0)
    })

    it('attack makes hits land harder and defence makes them softer', () => {
      const hitFor = (attackBuff: boolean, defenseBuff: boolean) => {
        const s = createDuel(piece('solari', 'bruiser'), piece('umbral', 'footsoldier'), 0)
        s.fighters[0].pos = { x: 4, y: 6 }
        s.fighters[1].pos = { x: 4, y: 5.2 }
        s.fighters[0].facing = -Math.PI / 2
        if (attackBuff) s.fighters[0].buffs.attack = 3
        if (defenseBuff) s.fighters[1].buffs.defense = 3
        for (let i = 0; i < 90; i++) stepDuel(s, [{ mx: 0, my: 0, attack: true }, NO_INPUT])
        stepDuel(s, idle)
        return s.fighters[1].hp
      }
      expect(hitFor(true, false)).toBeLessThan(hitFor(false, false))
      expect(hitFor(false, true)).toBeGreaterThan(hitFor(false, false))
    })

    it('heal restores HP over time without passing the maximum', () => {
      const { s } = take('heal')
      s.fighters[0].hp = 1
      for (let i = 0; i < Math.ceil(1 / DT); i++) stepDuel(s, idle)
      expect(s.fighters[0].hp).toBeGreaterThan(1.3)
      s.fighters[0].hp = s.fighters[0].maxHp
      stepDuel(s, idle)
      expect(s.fighters[0].hp).toBeLessThanOrEqual(s.fighters[0].maxHp)
    })
  })
})
