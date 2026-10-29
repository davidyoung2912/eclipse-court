import type { EndReason } from './net/session'
import type { Court, DuelOutcome } from './engine/rules/types'

export const COURT_NAME: Record<Court, string> = { solari: 'Solari', umbral: 'Umbral' }

/** How long "Your Turn" / "AI Turn" stays up between players. */
export const TURN_BANNER_MS = 1000

/** How long the player may think before a named opponent says something. */
export const IDLE_MS = 45_000

export function describeDuel({ attackerHp, defenderHp }: DuelOutcome): string {
  if (defenderHp <= 0) return attackerHp > 0 ? 'attacker won' : 'both fell'
  return attackerHp <= 0 ? 'defender won' : 'draw, defender holds'
}

export const DROPPED_TEXT: Partial<Record<EndReason, string>> = {
  'opponent-left': 'Your opponent left',
  desync: 'The games disagreed',
  illegal: 'The games disagreed',
  version: 'Different game versions',
}
