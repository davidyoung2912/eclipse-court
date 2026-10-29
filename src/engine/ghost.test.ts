import { describe, expect, it } from 'vitest'
import { dailyMatch } from './data/daily'
import { weeklyMatch } from './data/weekly'
import { newGame } from './reducer'
import { encodeRecord, toBase64Url } from './serialize'
import { compareGhost, decodeGhost, encodeGhost, ghostMatch, ghostScore, type Ghost } from './ghost'

const day = new Date(2026, 9, 28)
const daily: Ghost = { kind: 'daily', id: 20261028, won: true, draw: false, turns: 30, lost: 3 }
const weekly: Ghost = { kind: 'weekly', id: weeklyMatch(day).week, won: false, draw: false, turns: 40, lost: 8 }

describe('ghost codes', () => {
  it('round-trip a daily and a weekly result', () => {
    expect(decodeGhost(encodeGhost(daily))).toEqual(daily)
    expect(decodeGhost(encodeGhost(weekly))).toEqual(weekly)
  })

  it('carry the game when it is the ghost match', () => {
    const record = encodeRecord({ initial: newGame(dailyMatch(day).config), actions: [{ type: 'pass' }] })
    expect(decodeGhost(encodeGhost({ ...daily, record }))).toEqual({ ...daily, record })
  })

  it('refuse a game from another match', () => {
    const record = encodeRecord({ initial: newGame(dailyMatch(new Date(2026, 9, 27)).config), actions: [] })
    expect(decodeGhost(encodeGhost({ ...daily, record }))).toBeNull()
  })

  it('leave out a game too long to send', () => {
    expect(decodeGhost(encodeGhost({ ...daily, record: 'a'.repeat(7000) }))).toEqual(daily)
  })

  it('refuse garbage, another version, a fake date and a weekly that is not a Monday', () => {
    const make = (change: object) => toBase64Url(JSON.stringify({ v: 1, k: 'd', i: 20261028, w: 1, d: 0, t: 30, l: 3, ...change }))
    expect(decodeGhost(make({}))).toEqual(daily)
    expect(decodeGhost('not a code!')).toBeNull()
    expect(decodeGhost(make({ v: 0 }))).toBeNull()
    expect(decodeGhost(make({ i: 20261340 }))).toBeNull()
    expect(decodeGhost(make({ k: 'w' }))).toBeNull()
    expect(decodeGhost(make({ w: 1, d: 1 }))).toBeNull()
    expect(decodeGhost(make({ t: -1 }))).toBeNull()
    expect(decodeGhost(make({ l: 99 }))).toBeNull()
  })
})

describe('ghost matches', () => {
  it('are rebuilt from the date, equal to the match of that day', () => {
    expect(ghostMatch(daily)?.config).toEqual(dailyMatch(day).config)
    expect(ghostMatch(weekly)?.config).toEqual(weeklyMatch(day).config)
  })
})

describe('ghost scores', () => {
  it('rank a faster, cleaner win above a slow one and any win above a loss', () => {
    expect(ghostScore({ ...daily, turns: 20, lost: 0 })).toBeGreaterThan(ghostScore(daily))
    expect(ghostScore(daily)).toBeGreaterThan(ghostScore(weekly))
  })

  it('compare a result with the ghost', () => {
    expect(compareGhost(daily, { ...daily, turns: 20 }).verdict).toBe('ahead')
    expect(compareGhost(daily, daily).verdict).toBe('level')
    expect(compareGhost(daily, weekly).verdict).toBe('behind')
  })
})
