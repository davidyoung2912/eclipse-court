import type { Action, GameState } from '../engine/rules/types'
import type { Difficulty } from './profile'
import { chooseAction } from './strategy'

export interface SearchRequest {
  id: number
  state: GameState
  difficulty: Difficulty
  seed: number
}

export interface SearchResponse {
  id: number
  action: Action
}

self.onmessage = (e: MessageEvent<SearchRequest>) => {
  const { id, state, difficulty, seed } = e.data
  const response: SearchResponse = { id, action: chooseAction(state, difficulty, seed) }
  self.postMessage(response)
}
