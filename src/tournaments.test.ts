import { beforeEach, describe, expect, it } from 'vitest'
import { NONE, SHARDS_CUP_MATCH, SHARDS_CUP_WON, champion, nextMatch, sidesOf } from './engine/data/tournament'
import { PLAYER, clearTournament, matchCourts, openMatch, parseTournaments, settleMatch, startCup, startHotSeat, tournamentSnapshot } from './tournaments'

beforeEach(() => clearTournament())

describe('parseTournaments', () => {
  it('repairs damaged data', () => {
    expect(parseTournaments(null)).toEqual({ active: null, cups: { entered: 0, won: 0, finals: 0 } })
    expect(parseTournaments({ cups: { entered: 2, won: 5, finals: -1 }, active: { kind: 'cup' } }))
      .toEqual({ active: null, cups: { entered: 2, won: 2, finals: 2 } })
  })

  it('round-trips an active bracket and refuses a winner who did not play', () => {
    startHotSeat(['A', 'B', 'C', 'D', 'E'], 4)
    const a = tournamentSnapshot().active!
    const saved = { kind: a.kind, names: a.bracket.names, seed: a.seed, field: a.field, draws: 0, results: a.bracket.results }
    expect(parseTournaments({ active: saved }).active?.bracket).toEqual(a.bracket)
    const bad = { ...saved, results: saved.results.map((r, i) => (i === 1 ? r.map(() => 4) : r)) }
    expect(parseTournaments({ active: bad }).active).toBeNull()
    expect(parseTournaments({ active: { ...saved, names: ['A', 'B'] } }).active).toBeNull()
  })
})

describe('hot-seat tournament', () => {
  it('needs 4 to 8 players', () => {
    expect(startHotSeat(['A', 'B', 'C'], 1)).toBe(false)
    expect(startHotSeat(Array.from({ length: 9 }, (_, i) => `P${i}`), 1)).toBe(false)
    expect(tournamentSnapshot().active).toBeNull()
  })

  it('plays to a winner, swapping courts after a draw and giving a second draw to the first side', () => {
    startHotSeat(['A', 'B', 'C', 'D'], 2)
    let a = tournamentSnapshot().active!
    const [x, y] = sidesOf(a.bracket, openMatch(a)!)
    expect(matchCourts(a)).toEqual({ solari: x, umbral: y })
    settleMatch('draw')
    a = tournamentSnapshot().active!
    expect(matchCourts(a)).toEqual({ solari: y, umbral: x })
    settleMatch('draw')
    a = tournamentSnapshot().active!
    expect(a.bracket.results[0].includes(x)).toBe(true)
    expect(a.draws).toBe(0)
    while (openMatch(tournamentSnapshot().active!)) settleMatch(sidesOf(tournamentSnapshot().active!.bracket, openMatch(tournamentSnapshot().active!)!)[0])
    expect(champion(tournamentSnapshot().active!.bracket)).not.toBeNull()
  })
})

describe('Persona Cup', () => {
  it('pays for each win and the Cup, and counts it', () => {
    const before = tournamentSnapshot().cups
    startCup(11)
    expect(tournamentSnapshot().cups.entered).toBe(before.entered + 1)
    let shards = 0
    let lines: string[] = []
    for (let i = 0; i < 3; i++) {
      const a = tournamentSnapshot().active!
      expect(sidesOf(a.bracket, openMatch(a)!)).toContain(PLAYER)
      expect(matchCourts(a)!.solari).toBe(PLAYER)
      const out = settleMatch(PLAYER)
      shards += out.shards
      lines = out.lines
    }
    expect(shards).toBe(3 * SHARDS_CUP_MATCH + SHARDS_CUP_WON)
    expect(lines.join(' ')).toContain('Persona Cup')
    const done = tournamentSnapshot()
    expect(champion(done.active!.bracket)).toBe(PLAYER)
    expect(done.cups).toEqual({ entered: before.entered + 1, won: before.won + 1, finals: before.finals + 1 })
  })

  it('ends the run on a loss, names the winner and plays a draw again', () => {
    const wonBefore = tournamentSnapshot().cups.won
    startCup(12)
    expect(settleMatch('draw').shards).toBe(0)
    expect(tournamentSnapshot().active!.draws).toBe(1)
    const a = tournamentSnapshot().active!
    const foe = sidesOf(a.bracket, openMatch(a)!).find((s) => s !== PLAYER)!
    const out = settleMatch(foe)
    expect(out.shards).toBe(0)
    expect(out.lines.join(' ')).toContain('Knocked out')
    const after = tournamentSnapshot().active!
    expect(nextMatch(after.bracket)).toBeNull()
    expect(champion(after.bracket)).not.toBe(NONE)
    expect(champion(after.bracket)).not.toBe(PLAYER)
    expect(tournamentSnapshot().cups.won).toBe(wonBefore)
  })
})
