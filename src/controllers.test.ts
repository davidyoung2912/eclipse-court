import { describe, expect, it } from 'vitest'
import { HOT_SEAT, humanCourt, isHotSeat, isHuman, versusAi } from './controllers'
import { loadSaved, saveGame } from './saved'
import { newGame } from './engine/reducer'
import { matchConfig } from './engine/data/matchConfig'

describe('controllers', () => {
  it('puts the AI opposite the one human', () => {
    const c = versusAi('umbral', 'hard', 'rusher')
    expect(c.umbral).toBe('human')
    expect(c.solari).toEqual({ ai: 'hard', personality: 'rusher' })
    expect(isHotSeat(c)).toBe(false)
    expect(humanCourt(c)).toBe('umbral')
    expect(humanCourt(versusAi('solari', 'easy'))).toBe('solari')
  })

  it('leaves the personality out when none is given', () => {
    expect(versusAi('solari', 'easy').umbral).toEqual({ ai: 'easy' })
  })

  it('has two humans in hot-seat', () => {
    expect(isHotSeat(HOT_SEAT)).toBe(true)
    expect(isHuman(HOT_SEAT, 'solari') && isHuman(HOT_SEAT, 'umbral')).toBe(true)
  })
})

describe('saved game', () => {
  it('remembers a hot-seat game and reads older saves without the flag', () => {
    const store = new Map<string, string>()
    const storage = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v), removeItem: (k: string) => void store.delete(k) }
    ;(globalThis as { localStorage?: unknown }).localStorage = storage
    const record = { initial: newGame(matchConfig({ seed: 7 })), actions: [] }
    saveGame({ human: 'solari', difficulty: 'normal', campaignIndex: null, hotSeat: true, record })
    expect(loadSaved()?.hotSeat).toBe(true)
    saveGame({ human: 'solari', difficulty: 'normal', campaignIndex: null, record })
    expect(loadSaved()?.hotSeat).toBeUndefined()
  })
})
