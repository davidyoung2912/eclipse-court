import { reduce } from './reducer'
import type { Action, GameState } from './rules/types'

/** A whole game: the position it began from and every action taken since, in order. */
export interface GameRecord {
  initial: GameState
  actions: Action[]
}

/** A position along with the action that led to it (null for the opening position). */
export interface Step {
  state: GameState
  action: Action | null
}

/**
 * Every position of a game, from the opening on. Returns null if any action is refused by the
 * rules, since a record containing one cannot have been played.
 */
export function replaySteps(initial: GameState, actions: readonly Action[]): Step[] | null {
  const steps: Step[] = [{ state: initial, action: null }]
  let state = initial
  for (const action of actions) {
    const next = reduce(state, action)
    if (next === state) return null
    steps.push({ state: next, action })
    state = next
  }
  return steps
}

/** The position a record ends in, or null if it is not a legal game. */
export function replay(record: GameRecord): GameState | null {
  const steps = replaySteps(record.initial, record.actions)
  return steps && steps[steps.length - 1].state
}

/** The record of a game from its steps. */
export function recordOf(steps: readonly Step[]): GameRecord {
  return { initial: steps[0].state, actions: steps.slice(1).map((s) => s.action!) }
}
