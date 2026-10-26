import { createDuel, runDuel } from '../engine/duel/sim'
import type { DuelOutcome, Piece } from '../engine/rules/types'
import { createDuelAi } from './duelAi'
import { profileForSkill } from './profile'

/**
 * Settles a duel without anyone playing it: both fighters are driven by the duel AI at the given
 * skills (index 0 attacks). Pure function of its arguments, so a replay gives the same result.
 */
export function autoDuel(
  attacker: Piece,
  defender: Piece,
  luminance: number,
  skills: [number, number],
  seed: number,
): DuelOutcome {
  const state = createDuel(attacker, defender, luminance)
  const ais = [createDuelAi(profileForSkill(skills[0]), seed), createDuelAi(profileForSkill(skills[1]), seed + 1)]
  return runDuel(state, (s, i) => ais[i](s, i))
}
