import type { Difficulty } from './ai/profile'
import { aiDraft, aiLoadout } from './engine/data/aiDraft'
import { withLegacy } from './engine/data/legacy'
import { skirmishConfig, type SetupChoice } from './engine/data/setups'
import type { GameRecord } from './engine/log'
import { newGame } from './engine/reducer'
import { otherCourt } from './engine/rules/board'
import type { Court } from './engine/rules/types'

/** The match a skirmish setup describes, for starting it or sending it as a challenge. */
export function skirmishRecord(setup: SetupChoice, human: Court, difficulty: Difficulty, hotSeat: boolean, seed: number): GameRecord {
  const config = skirmishConfig(setup, human, seed, hotSeat ? {} : {
    roles: aiDraft(seed, difficulty),
    loadout: (setup.loadout || setup.legacy) && aiLoadout(seed, otherCourt(human)),
  })
  const initial = newGame(config)
  return { initial: config.setup === 'legacy' && setup.legacy ? withLegacy(initial, setup.legacy, human) : initial, actions: [] }
}
