import { describe, expect, it } from 'vitest'
import { autoDuel } from '../../ai/autoDuel'
import { chooseAction } from '../../ai/strategy'
import { createDuel } from '../duel/duel'
import { estimateOdds, newGame, reduce, stubDuel } from '../reducer'
import { decodeRecord, encodeRecord, validConfig } from '../serialize'
import { cellAt, cellHpChange, cellMods, cellsSymmetric, duelCells, invincibleOn, isSilenced } from './cells'
import { eventAt } from './events'
import { legalMoves } from './moves'
import { ALL_SPELLS, canCast } from './spells'
import type { CellEffect, CellSquare, Court, GameState, Piece, Pos, Role } from './types'

const piece = (role: Role, court: Court, pos: Pos, id: string, hp = 5): Piece => ({
  id, court, role, hp, maxHp: 10, pos, rest: 0, moved: false, bound: false,
})
const cell = (effect: CellEffect, x: number, y: number): CellSquare => ({ pos: { x, y }, effect })
const world = (pieces: Piece[], cells: CellSquare[], extra: Partial<GameState> = {}): GameState => {
  const g = newGame()
  return { ...g, config: { ...g.config, cells }, pieces, spells: { solari: [...ALL_SPELLS], umbral: [...ALL_SPELLS] }, ...extra }
}
const pass = (s: GameState, n = 1) => {
  for (let i = 0; i < n; i++) s = reduce(s, { type: 'pass' })
  return s
}
const leaders = () => [piece('leader', 'solari', { x: 0, y: 0 }, 'sl', 10), piece('leader', 'umbral', { x: 6, y: 6 }, 'ul', 10)]

describe('cell lookup', () => {
  it('finds the effect under a square, or null', () => {
    const { config } = world([], [cell('might', 2, 2)])
    expect(cellAt(config, { x: 2, y: 2 })).toBe('might')
    expect(cellAt(config, { x: 2, y: 3 })).toBeNull()
    expect(cellAt(newGame().config, { x: 2, y: 2 })).toBeNull()
  })
  it('checks that cells mirror across the board', () => {
    expect(cellsSymmetric([cell('might', 2, 1), cell('might', 4, 1)])).toBe(true)
    expect(cellsSymmetric([cell('might', 2, 1), cell('ward', 4, 1)])).toBe(false)
    expect(cellsSymmetric([cell('might', 2, 1)])).toBe(false)
    expect(cellsSymmetric([cell('recovery', 3, 3)])).toBe(true)
    expect(cellsSymmetric()).toBe(true)
  })
})

describe('duel modifiers', () => {
  const a = piece('footsoldier', 'solari', { x: 2, y: 3 }, 'a', 10)
  const d = piece('footsoldier', 'umbral', { x: 3, y: 3 }, 'd', 10)
  it('gives no duel cells when neither fighter stands on one', () => {
    expect(duelCells(world([a, d], [cell('might', 0, 0)]), a, d)).toBeUndefined()
  })
  it('Might makes its piece more likely to win, Ward makes its piece harder to beat', () => {
    const plain = estimateOdds(a, d, 0)
    const might = estimateOdds(a, d, 0, 21, duelCells(world([a, d], [cell('might', 2, 3)]), a, d))
    const ward = estimateOdds(a, d, 0, 21, duelCells(world([a, d], [cell('ward', 3, 3)]), a, d))
    expect(might.attacker).toBeGreaterThanOrEqual(plain.attacker)
    expect(might.defender).toBeLessThanOrEqual(plain.defender)
    expect(ward.attacker).toBeLessThanOrEqual(plain.attacker)
    expect(ward.defender).toBeGreaterThanOrEqual(plain.defender)
    expect(might.attacker + might.defender + might.other).toBeCloseTo(1)
  })
  it('scales the stub duel by the cells', () => {
    const weak = piece('footsoldier', 'umbral', { x: 3, y: 3 }, 'w', 6)
    expect(stubDuel(a, weak, 0, 0.5).defenderHp).toBe(0)
    expect(stubDuel(a, weak, 0, 0.5, { attacker: { dealt: 1, taken: 1 }, defender: { dealt: 1, taken: 0.5 } }).defenderHp).toBeGreaterThan(0)
    const hurt = piece('footsoldier', 'solari', { x: 2, y: 3 }, 'h', 6)
    const strong = piece('footsoldier', 'umbral', { x: 3, y: 3 }, 's', 10)
    expect(stubDuel(hurt, strong, 0, 0.5).attackerHp).toBe(0)
    expect(stubDuel(hurt, strong, 0, 0.5, { attacker: { dealt: 2, taken: 1 }, defender: { dealt: 1, taken: 1 } }).defenderHp).toBe(0)
  })
  it('Invincibility takes nothing on odd rounds and nothing special on even ones', () => {
    expect(invincibleOn(1)).toBe(true)
    expect(invincibleOn(2)).toBe(false)
    expect(cellMods('invincible', 1).taken).toBe(0)
    expect(cellMods('invincible', 2).taken).toBe(1)
    const odd = world([a, d], [cell('invincible', 3, 3)], { round: 1 })
    const out = stubDuel(a, d, 0, 0.5, duelCells(odd, a, d))
    expect(out.defenderHp).toBe(10)
    expect(out.attackerHp).toBeLessThan(10)
    const even = world([a, d], [cell('invincible', 3, 3)], { round: 2 })
    expect(stubDuel(a, d, 0, 0.5, duelCells(even, a, d))).toEqual(stubDuel(a, d, 0, 0.5))
  })
  it('two invincible fighters leave each other untouched', () => {
    const s = world([a, d], [cell('invincible', 2, 3), cell('invincible', 3, 3)], { round: 1 })
    expect(stubDuel(a, d, 0, 0.5, duelCells(s, a, d))).toEqual({ attackerHp: 10, defenderHp: 10 })
  })
  it('an invincible attacker cannot lose the fight it starts', () => {
    const s = world([a, d], [cell('invincible', 2, 3)], { round: 1 })
    const out = stubDuel(a, d, 0, 0.5, duelCells(s, a, d))
    expect(out.attackerHp).toBe(10)
    expect(out.defenderHp).toBe(0)
  })
  it('the reducer applies the cells under both fighters to a stub duel', () => {
    const s = world([...leaders(), a, d], [cell('invincible', 3, 3)], { round: 1 })
    const next = reduce(s, { type: 'move', pieceId: 'a', to: { x: 3, y: 3 } })
    expect(next.pieces.find((p) => p.id === 'd')!.hp).toBe(10)
    expect(next.pieces.find((p) => p.id === 'a')).toBeUndefined()
  })
  it('the live duel starts its fighters with the cell multipliers', () => {
    const cells = duelCells(world([a, d], [cell('might', 2, 3), cell('ward', 3, 3)]), a, d)
    const duel = createDuel(a, d, 0, undefined, cells)
    const plain = createDuel(a, d, 0)
    expect(duel.fighters[0].dealt).toBeCloseTo(plain.fighters[0].dealt * 1.25)
    expect(duel.fighters[1].taken).toBeCloseTo(plain.fighters[1].taken * 0.8)
    const shield = createDuel(a, d, 0, undefined, { attacker: { dealt: 1, taken: 1 }, defender: { dealt: 1, taken: 0 } })
    expect(shield.fighters[1].taken).toBe(0)
  })
  it('an auto duel on cells is still deterministic', () => {
    const cells = duelCells(world([a, d], [cell('might', 2, 3)]), a, d)
    expect(autoDuel(a, d, 0, [0.5, 0.5], 4, [1, 1], cells)).toEqual(autoDuel(a, d, 0, [0.5, 0.5], 4, [1, 1], cells))
  })
})

describe('end of round', () => {
  const soldier = (court: Court, pos: Pos, id: string, hp: number) => piece('footsoldier', court, pos, id, hp)
  it('Recovery heals 20% of max HP, at least 1', () => {
    expect(cellHpChange('recovery', 10)).toBe(2)
    expect(cellHpChange('recovery', 3)).toBe(1)
    const s = pass(world([...leaders(), soldier('solari', { x: 2, y: 2 }, 'a', 4)], [cell('recovery', 2, 2)]), 2)
    expect(s.pieces.find((p) => p.id === 'a')!.hp).toBe(6)
  })
  it('Recovery never lifts a piece past max HP', () => {
    const s = pass(world([...leaders(), soldier('solari', { x: 2, y: 2 }, 'a', 9)], [cell('recovery', 2, 2)]), 2)
    expect(s.pieces.find((p) => p.id === 'a')!.hp).toBe(10)
  })
  it('Recovery is cut off by a blight, Hazard is not', () => {
    const base = world([...leaders(), soldier('solari', { x: 2, y: 2 }, 'a', 4), soldier('umbral', { x: 4, y: 4 }, 'b', 8)],
      [cell('recovery', 2, 2), cell('hazard', 4, 4)])
    const config = { ...base.config, events: true }
    let seed = 1
    while (eventAt({ ...config, seed }, 9) !== 'blight') seed++
    const next = pass({ ...base, config: { ...config, seed }, round: 9 }, 2)
    expect(next.pieces.find((p) => p.id === 'a')!.hp).toBe(4)
    expect(next.pieces.find((p) => p.id === 'b')!.hp).toBe(6)
  })
  it('Hazard takes 20% of max HP and can kill', () => {
    expect(cellHpChange('hazard', 10)).toBe(-2)
    const s = pass(world([...leaders(), soldier('umbral', { x: 4, y: 4 }, 'b', 8)], [cell('hazard', 4, 4)]), 2)
    expect(s.pieces.find((p) => p.id === 'b')!.hp).toBe(6)
    const dying = pass(world([...leaders(), soldier('umbral', { x: 4, y: 4 }, 'b', 2)], [cell('hazard', 4, 4)]), 2)
    expect(dying.pieces.find((p) => p.id === 'b')).toBeUndefined()
    expect(dying.captured.some((p) => p.id === 'b')).toBe(true)
  })
  it('a Leader killed by Hazard ends a Leader Capture game', () => {
    const base = world([piece('leader', 'solari', { x: 0, y: 0 }, 'sl', 2), piece('leader', 'umbral', { x: 6, y: 6 }, 'ul', 10)], [cell('hazard', 0, 0)])
    const s = pass({ ...base, config: { ...base.config, mode: 'leader' } }, 2)
    expect(s.winner).toBe('umbral')
  })
  it('only pieces standing on a cell are affected', () => {
    const s = pass(world([...leaders(), soldier('solari', { x: 2, y: 3 }, 'a', 4)], [cell('hazard', 2, 2)]), 2)
    expect(s.pieces.find((p) => p.id === 'a')!.hp).toBe(4)
  })
  it('a flier passing over Hazard is untouched, one ending there is not', () => {
    const base = world([...leaders(), piece('flier', 'solari', { x: 2, y: 2 }, 'f', 10)], [cell('hazard', 3, 2)])
    const f = base.pieces.find((p) => p.id === 'f')!
    expect(legalMoves(base, f).some((m) => m.x === 4 && m.y === 2)).toBe(true)
    const past = pass(reduce(base, { type: 'move', pieceId: 'f', to: { x: 4, y: 2 } }), 1)
    expect(past.pieces.find((p) => p.id === 'f')!.hp).toBe(10)
    const onto = pass(reduce(base, { type: 'move', pieceId: 'f', to: { x: 3, y: 2 } }), 1)
    expect(onto.pieces.find((p) => p.id === 'f')!.hp).toBe(8)
  })
})

describe('Silence', () => {
  it('stops a Leader on the cell from casting, and only that Leader', () => {
    const s = world(leaders(), [cell('silence', 0, 0)])
    expect(isSilenced(s, 'solari')).toBe(true)
    expect(isSilenced(s, 'umbral')).toBe(false)
    expect(canCast(s, 'solari', 'hasten')).toBe(false)
    expect(canCast(s, 'umbral', 'hasten')).toBe(true)
    expect(reduce(s, { type: 'cast', spell: 'hasten' })).toBe(s)
  })
  it('lets the Leader cast again once it steps off', () => {
    const s = world(leaders(), [cell('silence', 0, 0)])
    const moved = reduce(s, { type: 'move', pieceId: 'sl', to: { x: 1, y: 0 } })
    expect(canCast(pass(moved), 'solari', 'hasten')).toBe(true)
  })
  it('does not stop casting onto the cell from elsewhere', () => {
    const s = world([piece('leader', 'solari', { x: 2, y: 0 }, 'sl', 10), piece('leader', 'umbral', { x: 6, y: 6 }, 'ul', 10)], [cell('silence', 3, 0)])
    expect(canCast(s, 'solari', 'blink')).toBe(true)
  })
})

describe('config handling', () => {
  it('survives a share-code round trip with cells', () => {
    const initial = world([], [])
    const g = newGame({ seed: 5, cells: [cell('might', 2, 2), cell('might', 4, 2), cell('hazard', 3, 3)] })
    const back = decodeRecord(encodeRecord({ initial: g, actions: [] }))!
    expect(back.initial.config.cells).toEqual(g.config.cells)
    expect(initial.config.cells).toEqual([])
  })
  it('refuses cells that are off the board, repeated or of an unknown kind', () => {
    const ok = newGame().config
    expect(validConfig({ ...ok, cells: [cell('ward', 1, 1)] })).toBe(true)
    expect(validConfig({ ...ok, cells: [cell('ward', 9, 1)] })).toBe(false)
    expect(validConfig({ ...ok, cells: [cell('ward', 1, 1), cell('might', 1, 1)] })).toBe(false)
    expect(validConfig({ ...ok, cells: [{ pos: { x: 1, y: 1 }, effect: 'nope' }] as unknown as CellSquare[] })).toBe(false)
    expect(validConfig({ ...ok, cells: 'x' as unknown as CellSquare[] })).toBe(false)
  })
  it('lets the AI play a whole game on a cell board without breaking the rules', () => {
    let s = newGame({
      seed: 3,
      cells: [cell('might', 2, 2), cell('might', 4, 2), cell('hazard', 3, 2), cell('hazard', 3, 4), cell('silence', 1, 3), cell('silence', 5, 3), cell('invincible', 3, 3), cell('recovery', 2, 4), cell('recovery', 4, 4)],
    })
    for (let i = 0; i < 120 && !s.winner; i++) s = reduce(s, chooseAction(s, 'easy', i + 1))
    expect(s.pieces.every((p) => p.hp > 0)).toBe(true)
  })
})
