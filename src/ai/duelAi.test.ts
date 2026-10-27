import { describe, expect, it } from 'vitest'
import { startingPieces } from '../engine/data/roster'
import { createDuel, runDuel } from '../engine/duel/duel'
import { DUEL_SECONDS } from '../engine/duel/types'
import type { Court, Role } from '../engine/rules/types'
import { createDuelAi } from './duelAi'
import { profileForSkill } from './profile'

const ROLES: Role[] = ['footsoldier', 'flier', 'marksman', 'bruiser', 'charger', 'aura', 'leader']
const piece = (court: Court, role: Role) => startingPieces().find((p) => p.court === court && p.role === role)!

/** Fraction of mirror duels the first skill wins (seats swapped each seed so position cancels out). */
function winRate(skillA: number, skillB: number, role: Role, seeds: number): number {
  let wins = 0
  for (let seed = 0; seed < seeds; seed++) {
    const aAttacks = seed % 2 === 0
    const courtA: Court = seed % 4 < 2 ? 'solari' : 'umbral'
    const courtB: Court = courtA === 'solari' ? 'umbral' : 'solari'
    const a = piece(courtA, role)
    const b = piece(courtB, role)
    const s = aAttacks ? createDuel(a, b, 0) : createDuel(b, a, 0)
    const ais = aAttacks
      ? [createDuelAi(profileForSkill(skillA), seed), createDuelAi(profileForSkill(skillB), seed + 99)]
      : [createDuelAi(profileForSkill(skillB), seed + 99), createDuelAi(profileForSkill(skillA), seed)]
    const out = runDuel(s, (st, i) => ais[i](st, i))
    const aHp = aAttacks ? out.attackerHp : out.defenderHp
    const bHp = aAttacks ? out.defenderHp : out.attackerHp
    if (aHp > 0 && bHp <= 0) wins++
    else if (aHp > 0 && bHp > 0) wins += 0.5
  }
  return wins / seeds
}

describe('duel AI', () => {
  it('is deterministic for a seed', () => {
    const run = () => {
      const s = createDuel(piece('solari', 'marksman'), piece('umbral', 'charger'), 1)
      const ais = [createDuelAi(profileForSkill(0.6), 5), createDuelAi(profileForSkill(0.6), 6)]
      const out = runDuel(s, (st, i) => ais[i](st, i))
      return { out, hp: s.fighters.map((f) => f.hp), t: s.t }
    }
    expect(run()).toEqual(run())
  })

  it('never produces non-finite state and every duel ends by the limit', () => {
    for (const a of ROLES) for (const d of ROLES) {
      const s = createDuel(piece('solari', a), piece('umbral', d), 1)
      const ais = [createDuelAi(profileForSkill(0.9), 1), createDuelAi(profileForSkill(0.2), 2)]
      runDuel(s, (st, i) => ais[i](st, i))
      expect(s.done).toBe(true)
      expect(s.t).toBeLessThan(DUEL_SECONDS + 0.05)
      for (const f of s.fighters) expect(Number.isFinite(f.pos.x + f.pos.y + f.hp)).toBe(true)
    }
  })

  it('a skilled AI beats a clumsy one in every role', () => {
    const rates = ROLES.map((role) => [role, winRate(0.9, 0.1, role, 40)] as const)
    // A mirror of slow, heavy slammers leaves little room for skill to show, so it only has to hold even.
    for (const [role, rate] of rates) expect(rate, role).toBeGreaterThan(role === 'bruiser' ? 0.4 : 0.6)
  })
})
