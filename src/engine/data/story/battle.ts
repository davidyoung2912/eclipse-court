import { SCENARIOS, scenarioGame, type Scenario } from '../scenarios'
import { campaignGame, type Opponent } from '../campaign'
import type { Court, GameState } from '../../rules/types'
import { umbralFightById } from './umbralFights'
import type { CharacterId, CharacterState, StoryBattle } from './types'

type States = Partial<Record<CharacterId, CharacterState>>

export const battleCourt = (battle: StoryBattle): Court => battle.court ?? 'solari'

/** The scenario or Umbral fight a battle is built from. */
export const scenarioOf = (battle: StoryBattle): Scenario | Opponent | undefined =>
  battle.court === 'umbral' ? umbralFightById(battle.scenario) : SCENARIOS.find((s) => s.id === battle.scenario)

/** Raised characters stand in their fight even though they fell in an earlier act. */
const withRaised = (battle: StoryBattle, states: States): States => {
  const next = { ...states }
  for (const who of battle.raised ?? []) if (next[who] === 'fallen') next[who] = 'ready'
  return next
}

/** The characters a battle binds to pieces, in the order they are listed. */
export const boundCharacters = (battle: StoryBattle) => Object.keys(battle.bind) as CharacterId[]

/** The scenario's opening position with the story's carry-over applied: the wounded start one HP short and the fallen are absent. */
export function storyBattleGame(battle: StoryBattle, carried: States, seed: number): GameState | null {
  const scenario = scenarioOf(battle)
  if (!scenario) return null
  const states = withRaised(battle, carried)
  const game = 'bonus' in scenario ? scenarioGame(scenario, seed) : campaignGame(scenario, seed)
  const gone = new Set<string>()
  const hurt = new Set<string>()
  for (const who of boundCharacters(battle)) {
    const id = battle.bind[who]!
    if (states[who] === 'fallen') gone.add(id)
    else if (states[who] === 'wounded') hurt.add(id)
  }
  return {
    ...game,
    pieces: game.pieces
      .filter((p) => !gone.has(p.id))
      .map((p) => (hurt.has(p.id) ? { ...p, hp: Math.max(1, p.hp - 1) } : p)),
  }
}

/** How each bound character stands after a won fight: a taken piece wounds them, or kills them if they are mortal, and the doomed die either way. Other characters keep their state. */
export function afterVictory(battle: StoryBattle, final: GameState, carried: States): States {
  const before = withRaised(battle, carried)
  const next: States = { ...carried }
  for (const who of boundCharacters(battle)) {
    if (before[who] === 'fallen') continue
    const alive = final.pieces.some((p) => p.id === battle.bind[who])
    next[who] = battle.doomed?.includes(who) ? 'fallen' : alive ? 'ready' : battle.mortal?.includes(who) ? 'fallen' : 'wounded'
  }
  return next
}
