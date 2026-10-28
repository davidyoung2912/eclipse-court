import { describe, expect, it } from 'vitest'
import { parseRecords, withGame } from './records'
import type { Summary } from './engine/data/summary'

const game = (over: Partial<Summary>): Summary => ({ won: true, draw: false, lost: 1, taken: 3, turns: 12, swift: false, spellsCast: 0, difficulty: 'normal', campaignIndex: null, daily: false, ...over })

describe('records', () => {
  it('keeps the fastest serious win and the most pieces taken', () => {
    let r = parseRecords(null)
    r = withGame(r, game({ turns: 12, taken: 3 }))
    r = withGame(r, game({ turns: 8, taken: 6, difficulty: 'easy' }))
    r = withGame(r, game({ turns: 9, taken: 4 }))
    expect(r.fastestWin).toBe(9)
    expect(r.mostTaken).toBe(6)
  })
  it('runs a win streak that a loss ends and a draw holds', () => {
    let r = parseRecords(null)
    r = withGame(withGame(r, game({})), game({}))
    r = withGame(r, game({ won: false, draw: true }))
    expect(r.streak).toBe(2)
    r = withGame(r, game({ won: false }))
    expect(r.streak).toBe(0)
    expect(r.bestStreak).toBe(2)
  })
  it('counts flawless wins and repairs damaged data', () => {
    expect(withGame(parseRecords(null), game({ lost: 0 })).flawless).toBe(1)
    expect(parseRecords({ fastestWin: -4, streak: 'x', bestStreak: 3 })).toEqual({ fastestWin: 0, streak: 0, bestStreak: 3, flawless: 0, mostTaken: 0 })
  })
})
