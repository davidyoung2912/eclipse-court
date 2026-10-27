import { SCENARIOS, scenarioGame } from '../scenarios'
import type { GameState } from '../../rules/types'
import type { CharacterId, CharacterState, StoryBattle } from './types'

type States = Partial<Record<CharacterId, CharacterState>>

export const scenarioOf = (battle: StoryBattle) => SCENARIOS.find((s) => s.id === battle.scenario)

/** The characters a battle binds to pieces, in the order they are listed. */
export const boundCharacters = (battle: StoryBattle) => Object.keys(battle.bind) as CharacterId[]

/** The scenario's opening position with the story's carry-over applied: the wounded start one HP short and the fallen are absent. */
export function storyBattleGame(battle: StoryBattle, states: States, seed: number): GameState | null {
  const scenario = scenarioOf(battle)
  if (!scenario) return null
  const game = scenarioGame(scenario, seed)
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

/** How each bound character stands after a won fight: a taken piece wounds them, or kills them if they are mortal. Other characters keep their state. */
export function afterVictory(battle: StoryBattle, final: GameState, before: States): States {
  const next: States = { ...before }
  for (const who of boundCharacters(battle)) {
    if (before[who] === 'fallen') continue
    const alive = final.pieces.some((p) => p.id === battle.bind[who])
    next[who] = alive ? 'ready' : battle.mortal?.includes(who) ? 'fallen' : 'wounded'
  }
  return next
}
