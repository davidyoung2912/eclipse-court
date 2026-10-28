import { describe, expect, it } from 'vitest'
import { decodeRecord, encodeRecord } from '../serialize'
import { newGame, reduce } from '../reducer'
import { skirmishConfig } from './setups'
import { FOG_SIGHT, shardMultiplier, visibleTo } from './modifiers'
import { legalMoves } from '../rules/moves'
import type { GameState, Piece } from '../rules/types'

const choice = { mode: 'classic' as const, board: 'classic' }

describe('skirmish twists', () => {
  it('gives the AI court extra HP', () => {
    const state = newGame(skirmishConfig({ ...choice, headStart: 2 }, 'solari', 1))
    const base = newGame(skirmishConfig(choice, 'solari', 1))
    for (const p of state.pieces) {
      const was = base.pieces.find((q) => q.id === p.id) as Piece
      expect(p.hp).toBe(was.hp + (p.court === 'umbral' ? 2 : 0))
      expect(p.maxHp).toBe(was.maxHp + (p.court === 'umbral' ? 2 : 0))
    }
  })

  it('hides far enemies and shows near ones', () => {
    const state = newGame(skirmishConfig({ ...choice, fog: true }, 'solari', 1))
    const enemies = state.pieces.filter((p) => p.court === 'umbral')
    expect(enemies.every((p) => visibleTo(state, 'solari', p))).toBe(false)
    const near = state.pieces.filter((p) => p.court === 'umbral').filter((p) => visibleTo(state, 'solari', p))
    for (const p of near) expect(state.pieces.some((q) => q.court === 'solari' && Math.max(Math.abs(q.pos.x - p.pos.x), Math.abs(q.pos.y - p.pos.y)) <= FOG_SIGHT)).toBe(true)
    expect(visibleTo(newGame(1), 'solari', enemies[0])).toBe(true)
  })

  it('ends the game at the first kill once sudden death begins', () => {
    const base = newGame(skirmishConfig({ ...choice, suddenDeath: 1 }, 'solari', 1))
    const a = base.pieces.find((p) => p.court === 'solari' && p.role === 'footsoldier') as Piece
    const d = base.pieces.find((p) => p.court === 'umbral' && p.role === 'footsoldier') as Piece
    const state: GameState = { ...base, pieces: base.pieces.map((p) => (p.id === a.id ? { ...p, pos: { x: d.pos.x - 1, y: d.pos.y } } : p)) }
    const moved = { ...state, pieces: state.pieces }
    const piece = moved.pieces.find((p) => p.id === a.id) as Piece
    expect(legalMoves(moved, piece).some((m) => m.x === d.pos.x && m.y === d.pos.y)).toBe(true)
    const killed = reduce(moved, { type: 'move', pieceId: a.id, to: d.pos, duel: { attackerHp: 3, defenderHp: 0 } })
    expect(killed.winner).toBe('solari')
    const trade = reduce(moved, { type: 'move', pieceId: a.id, to: d.pos, duel: { attackerHp: 0, defenderHp: 0 } })
    expect(trade.winner).toBeNull()
    const off = reduce({ ...moved, config: { ...moved.config, suddenDeath: undefined } }, { type: 'move', pieceId: a.id, to: d.pos, duel: { attackerHp: 3, defenderHp: 0 } })
    expect(off.winner).toBeNull()
  })

  it('pays more Shards for harder twists, and nothing for a head start the player holds', () => {
    const plain = skirmishConfig(choice, 'solari', 1)
    expect(shardMultiplier(plain, 'solari')).toBe(1)
    const hard = skirmishConfig({ ...choice, fog: true, suddenDeath: 8, headStart: 2 }, 'solari', 1)
    expect(shardMultiplier(hard, 'solari')).toBe(1.75)
    expect(shardMultiplier(hard, 'umbral')).toBe(1.35)
  })

  it('survives a share code and refuses a bad one', () => {
    const config = skirmishConfig({ ...choice, fog: true, suddenDeath: 15, headStart: 1 }, 'umbral', 3)
    const code = encodeRecord({ initial: newGame(config), actions: [] })
    expect(decodeRecord(code)?.initial.config).toMatchObject({ fog: true, suddenDeath: 15, edge: { court: 'solari', hp: 1 } })
    for (const bad of [{ suddenDeath: 0.5 }, { edge: { court: 'x', hp: 1 } }, { edge: { court: 'solari', hp: 99 } }, { edge: null }]) {
      const c = encodeRecord({ initial: newGame({ ...config, ...bad } as never), actions: [] })
      expect(decodeRecord(c)).toBeNull()
    }
  })
})

describe('mayhem', () => {
  const mayhemGame = (mayhem: ('spawns' | 'thefts' | 'swaps')[]) => newGame(skirmishConfig({ ...choice, mayhem }, 'solari', 7))
  const passRounds = (s: GameState, rounds: number) => {
    for (let i = 0; i < rounds * 2; i++) s = reduce(s, { type: 'pass' })
    return s
  }

  it('spawns mirrored cells every third round, the same on every replay', () => {
    const a = passRounds(mayhemGame(['spawns']), 3)
    expect(a.config.cells).toHaveLength(2)
    expect(a.mayhemNote).toContain('Cell spawns')
    expect(passRounds(mayhemGame(['spawns']), 3).config.cells).toEqual(a.config.cells)
    expect(passRounds(mayhemGame([]), 3).config.cells).toBeUndefined()
  })

  it('moves a spell from one Leader to the other', () => {
    const start = mayhemGame(['thefts'])
    // Both Leaders hold the same seven spells at the start, so give them different hands first.
    const base = { ...start, spells: { solari: start.spells.solari.slice(0, 3), umbral: start.spells.umbral.slice(3) } }
    const s = passRounds(base, 5)
    expect(s.spells.solari.length + s.spells.umbral.length).toBe(base.spells.solari.length + base.spells.umbral.length)
    expect(s.spells.solari.length).not.toBe(base.spells.solari.length)
  })

  it('swaps two same-role pieces across courts and keeps squares unique', () => {
    const base = mayhemGame(['swaps'])
    const s = passRounds(base, 4)
    expect(s.mayhemNote).toContain('Piece swaps')
    expect(new Set(s.pieces.map((p) => `${p.pos.x},${p.pos.y}`)).size).toBe(s.pieces.length)
    expect(s.pieces.filter((p, i) => p.pos.x !== base.pieces[i].pos.x || p.pos.y !== base.pieces[i].pos.y)).toHaveLength(2)
  })

  it('survives a record round trip and pays a Shard bonus', () => {
    const base = mayhemGame(['spawns', 'swaps'])
    expect(decodeRecord(encodeRecord({ initial: base, actions: [] }) as string)).not.toBeNull()
    expect(shardMultiplier(base.config, 'solari')).toBe(1.2)
  })
})
