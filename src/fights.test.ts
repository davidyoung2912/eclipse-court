import { beforeEach, describe, expect, it } from 'vitest'
import { newGame } from './engine/reducer'
import { matchConfig } from './engine/data/matchConfig'
import type { GameRecord } from './engine/log'
import { clearFight, clearPuzzle, loadFight, loadPuzzle, saveFight, savePuzzle } from './fights'

const store = new Map<string, string>()
beforeEach(() => {
  store.clear()
  globalThis.localStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  } as unknown as Storage
})

const record = (): GameRecord => ({ initial: newGame(matchConfig({ seed: 7 })), actions: [] })

describe('saved fights', () => {
  it('returns a fight only for the run and stage it was saved at', () => {
    saveFight({ seed: 5, stage: 3, record: record() })
    expect(loadFight({ seed: 5, stage: 3 })?.record.initial.rng).toBe(record().initial.rng)
    expect(loadFight({ seed: 5, stage: 4 })).toBeNull()
    expect(loadFight({ seed: 5, stage: 3 })).toBeNull() // a mismatch forgets it
  })
  it('forgets a fight on clear and when there is no run', () => {
    saveFight({ seed: 1, stage: 1, record: record() })
    clearFight()
    expect(loadFight({ seed: 1, stage: 1 })).toBeNull()
    saveFight({ seed: 1, stage: 1, record: record() })
    expect(loadFight(null)).toBeNull()
  })
  it('keeps a puzzle with its rush and drops one that no longer exists', () => {
    savePuzzle({ index: 2, daily: false, rush: { order: [2, 0, 1], score: 1 }, record: record() })
    expect(loadPuzzle(3)).toMatchObject({ index: 2, daily: false, rush: { score: 1 } })
    expect(loadPuzzle(2)).toBeNull()
    savePuzzle({ index: 0, daily: true, record: record() })
    clearPuzzle()
    expect(loadPuzzle(3)).toBeNull()
  })
  it('treats damaged storage as absent', () => {
    store.set('eclipse-court:saved-puzzle', 'not json')
    expect(loadPuzzle(3)).toBeNull()
    store.set('eclipse-court:saved-fight', JSON.stringify({ seed: 1, stage: 1, code: 'zzz' }))
    expect(loadFight({ seed: 1, stage: 1 })).toBeNull()
  })
})
