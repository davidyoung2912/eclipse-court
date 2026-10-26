import type { Court, Piece, Role } from '../rules/types'
import { MATCHUP_DATA } from './matchupData'

/** One cell of the matchup table: how a full-health attacker fares against a full-health defender. */
export interface Matchup {
  /** Chance (0..1) the attacker wins, and the defender wins; the rest is mutual loss or a hold. */
  attacker: number
  defender: number
  /** Mean share of max HP the winner keeps. */
  attackerKeeps: number
  defenderKeeps: number
}

/** Indexed by the attacker's court, attacker role, defender role, then luminance + 2. */
export type MatchupTable = Record<Court, Record<Role, Record<Role, Matchup[]>>>

/** Looks up a pairing at a square luminance (rounded and clamped to the table's -2..2). */
export function matchup(attacker: Piece, defender: Piece, lum: number): Matchup {
  const i = Math.min(4, Math.max(0, Math.round(lum) + 2))
  return (MATCHUP_DATA as MatchupTable)[attacker.court][attacker.role][defender.role][i]
}
