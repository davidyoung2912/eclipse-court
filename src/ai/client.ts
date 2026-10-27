import type { Action, GameState } from '../engine/rules/types'
import type { PersonalityId } from '../engine/data/personality'
import type { Difficulty } from './profile'
import { chooseAction } from './strategy'
import type { SearchRequest, SearchResponse } from './worker'

let worker: Worker | null = null
let nextId = 1
const waiting = new Map<number, { resolve: (a: Action) => void; fallback: () => Action }>()

function getWorker(): Worker | null {
  if (worker) return worker
  if (typeof Worker === 'undefined') return null
  worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' })
  worker.onmessage = (e: MessageEvent<SearchResponse>) => {
    waiting.get(e.data.id)?.resolve(e.data.action)
    waiting.delete(e.data.id)
  }
  worker.onerror = () => {
    // A broken worker must not freeze the game: answer everything pending on this thread.
    for (const p of waiting.values()) p.resolve(p.fallback())
    waiting.clear()
    worker = null
  }
  return worker
}

/** Searches in a Web Worker so the board stays responsive; falls back to the main thread without one. */
export function requestAction(state: GameState, difficulty: Difficulty, seed: number, personality?: PersonalityId): Promise<Action> {
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
