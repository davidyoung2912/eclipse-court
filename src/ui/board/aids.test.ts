import { describe, expect, it } from 'vitest'
import { newGame } from '../../engine/reducer'
import { legalMoves } from '../../engine/rules/moves'
import type { GameState, Piece } from '../../engine/rules/types'
import { squareLuminance } from '../../engine/rules/luminance'
import { attackOdds, beaconReach, blunderOf, eclipseIn, spellReminder, lastMoveOf, nextDetail, nextLightState, threatenedIds } from './aids'

const piece = (id: string, court: Piece['court'], role: Piece['role'], x: number, y: number): Piece => ({
  id, court, role, hp: 4, maxHp: 4, pos: { x, y }, rest: 0, moved: false, bound: false,
})
const world = (pieces: Piece[]): GameState => ({ ...newGame(), pieces })

describe('threatenedIds', () => {
  it('finds own pieces an enemy could reach, and only those', () => {
    const state = world([piece('a', 'solari', 'footsoldier', 3, 3), piece('b', 'solari', 'footsoldier', 0, 0), piece('e', 'umbral', 'footsoldier', 3, 4)])
    expect(threatenedIds(state, 'solari')).toEqual(['a'])
    expect(threatenedIds(state, 'umbral')).toEqual(['e'])
  })
  it('is empty when no enemy is in reach', () => {
    const state = world([piece('a', 'solari', 'footsoldier', 0, 0), piece('e', 'umbral', 'footsoldier', 6, 6)])
    expect(threatenedIds(state, 'solari')).toEqual([])
  })
})

describe('attackOdds', () => {
  it('gives a percentage for each enemy in the move list', () => {
    const attacker = piece('a', 'solari', 'footsoldier', 3, 3)
    const state = world([attacker, piece('e', 'umbral', 'footsoldier', 3, 4), piece('f', 'solari', 'footsoldier', 4, 3)])
    const odds = attackOdds(state, attacker, legalMoves(state, attacker))
    expect(Object.keys(odds)).toEqual(['e'])
    expect(odds.e).toBeGreaterThanOrEqual(0)
    expect(odds.e).toBeLessThanOrEqual(100)
  })
})

describe('lastMoveOf', () => {
  const before = world([piece('a', 'solari', 'footsoldier', 1, 1)])
  it('names the squares a move left and reached', () => {
    const history = [{ state: before, action: null }, { state: before, action: { type: 'move' as const, pieceId: 'a', to: { x: 2, y: 1 } } }]
    expect(lastMoveOf(history)).toEqual({ from: { x: 1, y: 1 }, to: { x: 2, y: 1 } })
  })
  it('is null at the start and after a pass', () => {
    expect(lastMoveOf([{ state: before, action: null }])).toBeNull()
    expect(lastMoveOf([{ state: before, action: null }, { state: before, action: { type: 'pass' as const } }])).toBeNull()
  })
})

describe('nextLightState', () => {
  const state = newGame()
  it('steps the phase and the round', () => {
    const next = nextLightState(state)
    expect(next.round).toBe(state.round + 1)
    expect(next.phase).not.toBe(state.phase)
    expect(squareLuminance(next, { x: 3, y: 3 })).not.toBe(squareLuminance(state, { x: 3, y: 3 }))
  })
  it('holds the phase during an Eclipse', () => {
    expect(nextLightState({ ...state, eclipse: true }).phase).toBe(state.phase)
  })
})

describe('eclipseIn', () => {
  const at = (round: number, eclipse = false): GameState => {
    const s = newGame()
    return { ...s, round, eclipse }
  }
  it('counts the rounds left, ending at 1 on the last round before the Eclipse', () => {
    const last = newGame().config.eclipseRound
    expect(eclipseIn(at(last))).toBe(1)
    expect(eclipseIn(at(last - 2))).toBe(3)
  })
  it('is null once the Eclipse has fallen', () => {
    expect(eclipseIn(at(5, true))).toBeNull()
  })
})

describe('blunderOf', () => {
  it('warns about a step into an enemy\'s reach', () => {
    const state = world([piece('a', 'solari', 'footsoldier', 3, 1), piece('e', 'umbral', 'bruiser', 3, 4)])
    const warn = blunderOf(state, 'a', { x: 3, y: 3 })
    expect(warn?.kind).toBe('piece')
  })
  it('stays quiet on a safe square and on captures', () => {
    const state = world([piece('a', 'solari', 'footsoldier', 3, 1), piece('e', 'umbral', 'footsoldier', 6, 6)])
    expect(blunderOf(state, 'a', { x: 3, y: 2 })).toBeNull()
    const fight = world([piece('a', 'solari', 'footsoldier', 3, 3), piece('e', 'umbral', 'footsoldier', 3, 4)])
    expect(blunderOf(fight, 'a', { x: 3, y: 4 })).toBeNull()
  })
  it('flags a Leader left in reach', () => {
    const state = world([piece('l', 'solari', 'leader', 3, 0), piece('g', 'solari', 'footsoldier', 3, 1), piece('e', 'umbral', 'marksman', 3, 2)])
    expect(blunderOf(state, 'g', { x: 5, y: 1 })).toEqual({ kind: 'leader' })
  })
})

describe('nextDetail', () => {
  it('gives odds for the square light of the next round', () => {
    const a = piece('a', 'solari', 'footsoldier', 3, 3)
    const d = piece('d', 'umbral', 'footsoldier', 3, 4)
    const state = world([a, d])
    const d2 = nextDetail(state, a, d, d.pos)
    expect(d2.nextLuminance).toBe(squareLuminance(nextLightState(state), d.pos))
    expect(d2.next.attacker + d2.next.other + d2.next.defender).toBeCloseTo(1)
  })
})

describe('beaconReach', () => {
  it('lists beacons a piece could step onto, but not ones already held', () => {
    const base = world([piece('a', 'solari', 'footsoldier', 3, 3), piece('l', 'solari', 'footsoldier', 0, 0)])
    const state: GameState = { ...base, config: { ...base.config, beacons: [{ x: 3, y: 4 }, { x: 0, y: 0 }, { x: 6, y: 6 }] } }
    expect(beaconReach(state, 'solari')).toEqual([{ x: 3, y: 4 }])
  })
})

describe('spellReminder', () => {
  it('lists castable spells and nudges once a few rounds pass unused', () => {
    const state: GameState = { ...newGame(), round: 5 }
    const r = spellReminder(state, 'solari')
    expect(r.ready.length).toBeGreaterThan(0)
    expect(r.idle).toBe(true)
    expect(spellReminder({ ...state, round: 1 }, 'solari').idle).toBe(false)
    expect(spellReminder({ ...state, eclipse: true }, 'solari').ready).toEqual([])
  })
})
