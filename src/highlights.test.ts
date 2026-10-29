import { describe, expect, it } from 'vitest'
import { gameOfTheWeek, inWeek, keepBest, KEEP, rateFacts, type GameFacts, type Highlight } from './engine/data/highlights'
import { newGame } from './engine/reducer'
import { factsOf, parseHighlights } from './highlights'

const quiet: GameFacts = { captures: 0, moments: 0, leadChanges: 0, turns: 10, won: false, margin: 5 }
const hl = (day: number, score: number, code = 'abc'): Highlight => ({ day, score, facts: quiet, code })

describe('game of the week', () => {
  it('rates a tense game above a quiet one', () => {
    const tense: GameFacts = { captures: 10, moments: 3, leadChanges: 3, turns: 24, won: true, margin: 1 }
    expect(rateFacts(tense)).toBeGreaterThan(rateFacts(quiet))
    expect(rateFacts({ ...quiet, margin: 1 })).toBeGreaterThan(rateFacts(quiet))
  })

  it('counts seven days including today, across a month end', () => {
    expect(inWeek(20261028, 20261028)).toBe(true)
    expect(inWeek(20261022, 20261028)).toBe(true)
    expect(inWeek(20261021, 20261028)).toBe(false)
    expect(inWeek(20261029, 20261028)).toBe(false)
    expect(inWeek(20261031, 20261105)).toBe(true)
  })

  it('picks the highest score in the week, the later day on a tie, and null when none', () => {
    const games = [hl(20261020, 99), hl(20261024, 40), hl(20261026, 40), hl(20261027, 30)]
    expect(gameOfTheWeek(games, 20261028)?.day).toBe(20261026)
    expect(gameOfTheWeek([], 20261028)).toBeNull()
    expect(gameOfTheWeek([hl(20261001, 50)], 20261028)).toBeNull()
  })

  it('keeps the best few from the last two weeks', () => {
    let games: Highlight[] = []
    for (let i = 0; i < 12; i++) games = keepBest(games, hl(20261028, i), 20261028)
    expect(games).toHaveLength(KEEP)
    expect(games[0].score).toBe(11)
    expect(keepBest([hl(20261001, 90)], hl(20261028, 1), 20261028)).toHaveLength(1)
  })

  it('parses saved games safely', () => {
    expect(parseHighlights(null)).toEqual([])
    expect(parseHighlights([{ day: 20261028, score: 5, facts: quiet, code: 'abc' }])).toHaveLength(1)
    expect(parseHighlights([{ day: 20261028, score: 5, facts: quiet, code: 'bad code!' }, { day: 1 }, 7])).toEqual([])
  })

  it('reads facts from a record, and refuses one that does not replay', () => {
    const initial = newGame(1)
    expect(factsOf({ initial, actions: [] }, 'solari')).toBeNull()
    expect(factsOf({ initial, actions: [{ type: 'pass' }] }, 'solari')?.captures).toBe(0)
  })
})
