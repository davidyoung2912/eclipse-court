import type { Odds } from '../../engine/reducer'
import type { Piece } from '../../engine/rules/types'

export interface Advice {
  text: string
  tone: 'go' | 'even' | 'stop'
}

/** One short line saying whether the attack is worth making, from the attacker's odds. Kept brief so it fits on one line. */
export function adviceFor(odds: Odds, defender: Piece): Advice {
  const win = odds.attacker
  const lose = odds.defender
  if (win >= 0.85) return { text: 'Clear advantage: attack with confidence', tone: 'go' }
  if (win >= 0.5 && defender.role === 'leader') return { text: 'Their Leader is exposed: strike now', tone: 'go' }
  if (win >= 0.65) return { text: 'Favourable odds: this attack is worth it', tone: 'go' }
  if (lose >= 0.6) return { text: 'Heavy risk: withdraw and rethink', tone: 'stop' }
  if (odds.other >= 0.5 && lose < 0.3) return { text: 'Likely stalemate: little to gain here', tone: 'even' }
  if (lose >= 0.4) return { text: 'Risky odds: withdraw unless it is vital', tone: 'stop' }
  return { text: 'Close call: attack only if it pays off', tone: 'even' }
}
