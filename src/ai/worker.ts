import type { Action, GameState } from '../engine/rules/types'
import type { PersonalityId } from '../engine/data/personality'
import type { Difficulty } from './profile'
import { chooseAction } from './strategy'

export interface SearchRequest {
  id: number
  state: GameState
  difficulty: Difficulty
  seed: number
  personality?: PersonalityId
}

export interface SearchResponse {
  id: number
  action: Action
}

self.onmessage = (e: MessageEvent<SearchRequest>) => {
  const { id, state, difficulty, seed, personality } = e.data
  const response: SearchResponse = { id, action: chooseAction(state, difficulty, seed, personality) }
  self.postMessage(response)
}
