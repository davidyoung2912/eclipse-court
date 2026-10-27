import { describe, expect, it } from 'vitest'
import { chooseAction } from '../ai/strategy'
import { CAMPAIGN } from './data/campaign'
import { matchConfig } from './data/matchConfig'
import { startingPieces } from './data/roster'
import { recordOf, replay, replaySteps, type GameRecord } from './log'
import { newGame, reduce } from './reducer'
import { decodeRecord, encodeRecord, FORMAT_VERSION } from './serialize'
import type { Action, GameState } from './rules/types'

/** Plays the AI against itself with the stub duel, keeping the log. */
function play(initial: GameState, count: number): { record: GameRecord; state: GameState } {
  const actions: Action[] = []
  let state = initial
  for (let i = 0; i < count && !state.winner; i++) {
    const action = chooseAction(state, 'easy', i + 1)
    actions.push(action)
    state = reduce(state, action)
  }
  return { record: { initial, actions }, state }
}

describe('match config', () => {
  it('defaults reproduce the classic game', () => {
    const g = newGame()
    expect(g.config).toEqual(matchConfig())
    expect(g.pieces).toEqual(startingPieces())
    expect(g.rng).toBe(1)
    expect(newGame(9).config.seed).toBe(9)
  })
  it('takes its pacing, beacons and layout from the config', () => {
    const early = newGame({ eclipseRound: 2 })
    let s = early
    for (let i = 0; i < 4; i++) s = reduce(s, { type: 'pass' })
    expect(s.eclipse).toBe(true)
    expect(newGame({ roundLimit: 3 }).config.roundLimit).toBe(3)
    const one = newGame({ layout: [{ role: 'leader', x: 0, y: 3 }, { role: 'footsoldier', x: 1, y: 3 }] })
    expect(one.pieces).toHaveLength(4)
  })
  it('wins on the config beacons, not the classic five', () => {
    // Solari's Stag starts on (1, 3), so holding it alone wins on the first pass.
    expect(reduce(newGame(), { type: 'pass' }).winner).toBeNull()
    expect(reduce(newGame({ beacons: [{ x: 1, y: 3 }] }), { type: 'pass' }).winner).toBe('solari')
  })
  it('follows a shorter day', () => {
    const g = newGame({ day: [2, -2] })
    expect(g.config.day).toHaveLength(2)
    let s = g
    for (let i = 0; i < 2; i++) s = reduce(s, { type: 'pass' })
    expect(s.phase).toBe(1)
    for (let i = 0; i < 2; i++) s = reduce(s, { type: 'pass' })
    expect(s.phase).toBe(0)
  })
})

describe('replay', () => {
  it('rebuilds the final position of a played game', () => {
    const { record, state } = play(newGame(5), 60)
    expect(record.actions.length).toBeGreaterThan(40)
    expect(replay(record)).toEqual(state)
  })
  it('keeps every step and round-trips through recordOf', () => {
    const { record } = play(newGame(6), 12)
    const steps = replaySteps(record.initial, record.actions)!
    expect(steps).toHaveLength(13)
    expect(steps[0].action).toBeNull()
    expect(recordOf(steps)).toEqual(record)
  })
  it('refuses a log containing an illegal action', () => {
    const g = newGame()
    expect(replaySteps(g, [{ type: 'move', pieceId: 'solari-charger-1', to: { x: 6, y: 6 } }])).toBeNull()
  })
})

describe('serialisation', () => {
  it('round-trips a game with duels and spells', () => {
    const { record, state } = play(newGame(11), 80)
    const back = decodeRecord(encodeRecord(record))!
    expect(back).not.toBeNull()
    expect(back.actions).toEqual(record.actions)
    expect(replay(back)).toEqual(state)
  })
  it('carries real duel outcomes and spells', () => {
    const g = newGame(3)
    const record: GameRecord = {
      initial: g,
      actions: [
        { type: 'cast', spell: 'turn' },
        { type: 'cast', spell: 'bind', pieceId: 'solari-charger-1' },
      ],
    }
    const back = decodeRecord(encodeRecord(record))!
    expect(back.actions).toEqual(record.actions)
  })
  it('round-trips loadouts, recharge and the new spells', () => {
    const config = {
      seed: 8, recharge: 4, passives: false,
      loadouts: { solari: ['hold', 'exchange', 'mirror', 'blink'], umbral: ['shroud', 'sacrifice', 'hasten', 'bind'] },
    } as const
    const initial = newGame({ ...config, loadouts: { solari: [...config.loadouts.solari], umbral: [...config.loadouts.umbral] } })
    const record: GameRecord = {
      initial,
      actions: [
        { type: 'cast', spell: 'hold' },
        { type: 'cast', spell: 'shroud', pieceId: 'umbral-footsoldier-1' },
        { type: 'cast', spell: 'exchange', pieceId: 'solari-footsoldier-1', to: { x: 1, y: 2 } },
        { type: 'cast', spell: 'hasten' },
      ],
    }
    const back = decodeRecord(encodeRecord(record))!
    expect(back).not.toBeNull()
    expect(back.initial.config).toEqual(initial.config)
    expect(replay(back)).toEqual(replay(record))
  })
  it('refuses a config naming an unknown spell', () => {
    const code = encodeRecord({ initial: newGame(1), actions: [] })
    const json = JSON.parse(atob(code.replaceAll('-', '+').replaceAll('_', '/')))
    const reencode = (o: unknown) => btoa(JSON.stringify(o)).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '')
    expect(decodeRecord(reencode({ ...json, c: { ...json.c, loadouts: { solari: ['fireball'], umbral: [] } } }))).toBeNull()
  })
  it('keeps campaign handicaps through the overrides', () => {
    for (const [i, opponent] of CAMPAIGN.entries()) {
      const initial = opponent.setup(newGame(100 + i), 'umbral')
      const { record, state } = play(initial, 20)
      const back = decodeRecord(encodeRecord(record))!
      expect(back, opponent.name).not.toBeNull()
      expect(back.initial).toEqual(initial)
      expect(replay(back)).toEqual(state)
    }
  })
  it('omits the opening position when the config alone describes it', () => {
    const { record } = play(newGame(2), 60)
    const code = encodeRecord(record)
    expect(code.length).toBeLessThan(3000)
    expect(JSON.parse(atob(code.replaceAll('-', '+').replaceAll('_', '/'))).o).toBeUndefined()
  })
  it('refuses damaged, foreign and illegal codes', () => {
    const { record } = play(newGame(4), 10)
    const code = encodeRecord(record)
    expect(decodeRecord('')).toBeNull()
    expect(decodeRecord('not a code!')).toBeNull()
    expect(decodeRecord(code.slice(0, 40))).toBeNull()
    const json = JSON.parse(atob(code.replaceAll('-', '+').replaceAll('_', '/')))
    const reencode = (o: unknown) => btoa(JSON.stringify(o)).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '')
    expect(decodeRecord(reencode({ ...json, v: FORMAT_VERSION + 1 }))).toBeNull()
    expect(decodeRecord(reencode({ ...json, a: [[0, 'solari-charger-1', 6, 6], ...json.a] }))).toBeNull()
    expect(decodeRecord(reencode({ ...json, a: [[9]] }))).toBeNull()
    expect(decodeRecord(reencode({ ...json, c: { seed: 1 } }))).toBeNull()
  })
})
