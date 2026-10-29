import { describe, expect, it } from 'vitest'
import { ghostGameFor, parseGhosts, recordGhostGame } from './ghosts'

const win = { won: true, draw: false, turns: 30, lost: 2 }

describe('ghost games', () => {
  it('parse safely', () => {
    expect(parseGhosts(null)).toEqual({ daily: null, weekly: null })
    expect(parseGhosts({ daily: { id: 1, score: 2, result: win, code: 'bad code!' } }).daily).toBeNull()
    expect(parseGhosts({ weekly: { id: 20261026, score: 600, result: win, code: 'abc' } }).weekly?.code).toBe('abc')
    expect(parseGhosts({ weekly: { id: 20261026, score: 600, result: { won: 1 }, code: 'abc' } }).weekly).toBeNull()
  })

  it('keeps the first daily game of a day and the best weekly game of a week', () => {
    recordGhostGame('daily', 20261028, 500, win, 'first')
    recordGhostGame('daily', 20261028, 900, win, 'second')
    expect(ghostGameFor('daily', 20261028)?.code).toBe('first')
    expect(ghostGameFor('daily', 20261029)).toBeUndefined()
    recordGhostGame('weekly', 20261026, 500, win, 'low')
    recordGhostGame('weekly', 20261026, 700, win, 'high')
    recordGhostGame('weekly', 20261026, 600, win, 'mid')
    expect(ghostGameFor('weekly', 20261026)?.code).toBe('high')
  })
})
