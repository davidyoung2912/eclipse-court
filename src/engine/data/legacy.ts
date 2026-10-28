import { VETERAN_WINS } from '../rules/growth'
import { spellPool } from '../rules/spells'
import type { Court, GameState, MatchConfig, Piece, Role, Spell } from '../rules/types'
import { MAX_BONUS, relicRules, type RelicId, type Run, type RunPiece } from './gauntlet'
import { DEFAULT_CONFIG } from './matchConfig'
import { ROLE_STATS } from './roster'

/** The army a finished Gauntlet run leaves behind, for the Legacy army option in Skirmish. */
export interface Legacy {
  leader: RunPiece
  /** Everyone but the Leader. */
  army: RunPiece[]
  loadout: Spell[]
  relics: RelicId[]
}

/** The pieces of a run that would join a Legacy army, or null when no piece earned veteran rank. */
export function legacyOf(run: Pick<Run, 'leader' | 'army' | 'loadout' | 'relics'>): Legacy | null {
  const veteran = [run.leader, ...run.army].some((p) => p.wins >= VETERAN_WINS)
  return veteran ? { leader: run.leader, army: run.army, loadout: run.loadout, relics: run.relics } : null
}

/** How much a Legacy has earned, so a weaker run never replaces a stronger one. */
export const legacyPower = (l: Legacy) =>
  [l.leader, ...l.army].reduce((n, p) => n + p.wins + p.bonus + (p.perk ? 2 : 0), 0) + 3 * l.relics.length

export const legacyRoles = (l: Legacy): Role[] => l.army.map((p) => p.role)

/** The spells the Leader carries on `court`: the run's own, less any that court cannot cast. */
export const legacyLoadout = (l: Legacy, court: Court): Spell[] => l.loadout.filter((s) => spellPool(court).includes(s))

/** The match settings the relics switch on (Dawnstone also lengthens the game). */
export function legacyRules(l: Legacy): Partial<MatchConfig> {
  const rules = relicRules(l.relics)
  if (!l.relics.includes('dawnstone')) return rules
  return { ...rules, eclipseRound: (rules.eclipseRound ?? DEFAULT_CONFIG.eclipseRound) + 8, roundLimit: DEFAULT_CONFIG.roundLimit + 8 }
}

const maxHpOf = (p: RunPiece) => ROLE_STATS[p.role].hp + Math.min(p.bonus, MAX_BONUS) + (p.wins >= VETERAN_WINS ? 1 : 0)

/** `state` with the human's pieces given the Legacy's record, perks and HP; the nth piece of a role is the nth of that role. */
export function withLegacy(state: GameState, l: Legacy, human: Court): GameState {
  const slots = [l.leader, ...l.army]
  const used = new Set<number>()
  return {
    ...state,
    pieces: state.pieces.map((p): Piece => {
      if (p.court !== human) return p
      const i = slots.findIndex((r, k) => r.role === p.role && !used.has(k))
      if (i < 0) return p
      used.add(i)
      const r = slots[i]
      const maxHp = maxHpOf(r)
      return { ...p, hp: maxHp, maxHp, wins: r.wins, ...(r.perk ? { perk: r.perk } : {}) }
    }),
  }
}
