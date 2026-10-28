import type { Action, GameState } from '../engine/rules/types'
import type { PersonalityId } from '../engine/data/personality'
import type { AiLevel } from './profile'
import { chooseAction, judgeMove, type Judgement } from './strategy'

export interface SearchRequest {
  id: number
  state: GameState
  difficulty: AiLevel
  seed: number
  personality?: PersonalityId
}

export interface SearchResponse {
  id: number
  action: Action
}

/** A request to judge one move that was played, for the game review. */
export interface JudgeRequest {
  kind: 'judge'
  id: number
  state: GameState
  played: Action
  difficulty: AiLevel
}

export interface JudgeResponse {
  kind: 'judge'
  id: number
  judgement: Judgement
}

self.onmessage = (e: MessageEvent<SearchRequest | JudgeRequest>) => {
  if ('kind' in e.data) {
    const { id, state, played, difficulty } = e.data
    const response: JudgeResponse = { kind: 'judge', id, judgement: judgeMove(state, played, difficulty) }
    self.postMessage(response)
    return
  }
  const { id, state, difficulty, seed, personality } = e.data
  const response: SearchResponse = { id, action: chooseAction(state, difficulty, seed, personality) }
  self.postMessage(response)
}
