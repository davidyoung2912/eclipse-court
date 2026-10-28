import type { Action, GameState } from '../engine/rules/types'
import type { PersonalityId } from '../engine/data/personality'
import type { AiLevel } from './profile'
import { chooseAction, judgeMove, type Judgement } from './strategy'
import type { JudgeRequest, JudgeResponse, SearchRequest, SearchResponse } from './worker'

let worker: Worker | null = null
let nextId = 1
const waiting = new Map<number, { resolve: (a: Action) => void; fallback: () => Action }>()
const judging = new Map<number, { resolve: (j: Judgement) => void; fallback: () => Judgement }>()

function getWorker(): Worker | null {
  if (worker) return worker
  if (typeof Worker === 'undefined') return null
  worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' })
  worker.onmessage = (e: MessageEvent<SearchResponse | JudgeResponse>) => {
    if ('kind' in e.data) {
      judging.get(e.data.id)?.resolve(e.data.judgement)
      judging.delete(e.data.id)
      return
    }
    waiting.get(e.data.id)?.resolve(e.data.action)
    waiting.delete(e.data.id)
  }
  worker.onerror = () => {
    // A broken worker must not freeze the game: answer everything pending on this thread.
    for (const p of waiting.values()) p.resolve(p.fallback())
    waiting.clear()
    for (const p of judging.values()) p.resolve(p.fallback())
    judging.clear()
    worker = null
  }
  return worker
}

/** Searches in a Web Worker so the board stays responsive; falls back to the main thread without one. */
export function requestAction(state: GameState, difficulty: AiLevel, seed: number, personality?: PersonalityId): Promise<Action> {
  const fallback = () => chooseAction(state, difficulty, seed, personality)
  const w = getWorker()
  if (!w) return Promise.resolve(fallback())
  const id = nextId++
  const request: SearchRequest = { id, state, difficulty, seed, personality }
  return new Promise((resolve) => {
    waiting.set(id, { resolve, fallback })
    w.postMessage(request)
  })
}

/** Judges a move that was played (for the game review) in the worker, or on this thread without one. */
export function requestJudgement(state: GameState, played: Action, difficulty: AiLevel): Promise<Judgement> {
  const fallback = () => judgeMove(state, played, difficulty)
  const w = getWorker()
  if (!w) return Promise.resolve(fallback())
  const id = nextId++
  const request: JudgeRequest = { kind: 'judge', id, state, played, difficulty }
  return new Promise((resolve) => {
    judging.set(id, { resolve, fallback })
    w.postMessage(request)
  })
}
