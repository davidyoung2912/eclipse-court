import { ROLE_STATS } from '../engine/data/roster'
import type { Court, Piece, Role } from '../engine/rules/types'
import { autoDuel } from '../ai/autoDuel'
import type { Matchup, MatchupTable } from '../engine/data/matchups'

export const ROLES: readonly Role[] = ['footsoldier', 'flier', 'marksman', 'bruiser', 'charger', 'aura', 'leader']
export const COURTS: readonly Court[] = ['solari', 'umbral']
export const LUMS = [-2, -1, 0, 1, 2] as const

/** Half-width of the skill range sampled around the target skill. */
export const SKILL_SPREAD = 0.3

/** Cheap deterministic 0..1 hash so the table is reproducible. */
const hash = (n: number) => {
  let x = (n + 1) * 2654435761
  x = Math.imul(x ^ (x >>> 15), 2246822519)
  return ((x ^ (x >>> 13)) >>> 0) / 4294967296
}

const other = (c: Court): Court => (c === 'solari' ? 'umbral' : 'solari')

export function fresh(court: Court, role: Role, id: string): Piece {
  const { hp } = ROLE_STATS[role]
  return { id, court, role, hp, maxHp: hp, pos: { x: 0, y: 0 }, rest: 0, moved: false, bound: false }
}

/** Plays `samples` AI-vs-AI duels for one pairing at one square luminance. */
export function measure(court: Court, attacker: Role, defender: Role, lum: number, samples: number, skill: number): Matchup {
  const a = fresh(court, attacker, 'a')
  const d = fresh(other(court), defender, 'd')
  let aWins = 0
  let dWins = 0
  let aKeep = 0
  let dKeep = 0
  for (let i = 0; i < samples; i++) {
    // Players are not clones of each other: each side's skill wanders around the target.
    const jitter = (k: number) => Math.min(1, Math.max(0, skill + (hash(i * 2 + k) - 0.5) * 2 * SKILL_SPREAD))
    const o = autoDuel(a, d, lum, [jitter(0), jitter(1)], 1000 + i * 7)
    if (o.attackerHp > 0 && o.defenderHp <= 0) {
      aWins++
      aKeep += o.attackerHp / a.maxHp
    } else if (o.defenderHp > 0 && o.attackerHp <= 0) {
      dWins++
      dKeep += o.defenderHp / d.maxHp
    }
  }
  const round = (x: number) => Math.round(x * 1000) / 1000
  return {
    attacker: round(aWins / samples),
    defender: round(dWins / samples),
    attackerKeeps: round(aWins ? aKeep / aWins : 0),
    defenderKeeps: round(dWins ? dKeep / dWins : 0),
  }
}

export function buildTable(samples: number, skill: number, onRow?: (court: Court, attacker: Role) => void): MatchupTable {
  const table = {} as MatchupTable
  for (const court of COURTS) {
    table[court] = {} as MatchupTable[Court]
    for (const att of ROLES) {
      table[court][att] = {} as MatchupTable[Court][Role]
      for (const def of ROLES) table[court][att][def] = LUMS.map((l) => measure(court, att, def, l, samples, skill))
      onRow?.(court, att)
    }
  }
  return table
}

/** Win rate of a role averaged over every matchup, both as attacker and defender, at lum 0. */
export function roleStrength(table: MatchupTable, role: Role): number {
  let sum = 0
  let n = 0
  for (const court of COURTS)
    for (const opp of ROLES) {
      sum += table[court][role][opp][2].attacker
      sum += table[other(court)][opp][role][2].defender
      n += 2
    }
  return sum / n
}
