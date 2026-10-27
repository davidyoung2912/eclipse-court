import { describe, expect, it } from 'vitest'
import { createFighter } from '../duel/duel'
import { newGame, reduce } from '../reducer'
import { decodeRecord, encodeRecord } from '../serialize'
import { ELITE_WINS, growthChoice, perkChoices, perkMods, rankOf, VETERAN_WINS } from './growth'
import type { Court, GameState, MatchConfig, Piece, Pos, Role } from './types'

const piece = (role: Role, court: Court, pos: Pos, id: string, extra: Partial<Piece> = {}): Piece => ({
  id, court, role, hp: 4, maxHp: 4, pos, rest: 0, moved: false, bound: false, ...extra,
})
const kings = () => [piece('leader', 'solari', { x: 0, y: 0 }, 'sl', { hp: 7, maxHp: 7 }), piece('leader', 'umbral', { x: 0, y: 6 }, 'ul', { hp: 7, maxHp: 7 })]
const world = (pieces: Piece[], config: Partial<MatchConfig> = {}): GameState => ({ ...newGame(config), pieces })
const win = { attackerHp: 3, defenderHp: 0 }
const lose = { attackerHp: 0, defenderHp: 2 }

describe('veterancy', () => {
  const duel = (fighter: Piece, foe: Piece, outcome: typeof win, config: Partial<MatchConfig> = { growth: true }) =>
    reduce(world([...kings(), fighter, foe], config), { type: 'move', pieceId: fighter.id, to: foe.pos, duel: outcome })
  const foe = () => piece('footsoldier', 'umbral', { x: 3, y: 2 }, 'uf')

  it('counts wins and grants +1 max HP at the second', () => {
    const first = duel(piece('footsoldier', 'solari', { x: 3, y: 3 }, 'sf'), foe(), win)
    expect(first.pieces.find((p) => p.id === 'sf')).toMatchObject({ wins: 1, maxHp: 4, hp: 3 })
    const second = duel(piece('footsoldier', 'solari', { x: 3, y: 3 }, 'sf', { wins: 1 }), foe(), win)
    expect(second.pieces.find((p) => p.id === 'sf')).toMatchObject({ wins: VETERAN_WINS, maxHp: 5, hp: 4 })
    expect(rankOf(second.pieces.find((p) => p.id === 'sf')!)).toBe('veteran')
  })
  it('credits a defender that wins too', () => {
    const s = world([...kings(), piece('footsoldier', 'umbral', { x: 3, y: 3 }, 'uf'), piece('footsoldier', 'solari', { x: 3, y: 2 }, 'sf')], { growth: true })
    const out = reduce(s, { type: 'move', pieceId: 'sf', to: { x: 3, y: 3 }, duel: lose })
    expect(out.pieces.find((p) => p.id === 'uf')?.wins).toBe(1)
  })
  it('does nothing when the match has no growth', () => {
    const out = duel(piece('footsoldier', 'solari', { x: 3, y: 3 }, 'sf'), foe(), win, {})
    expect(out.pieces.find((p) => p.id === 'sf')?.wins).toBeUndefined()
  })
  it('offers a perk at the fourth win and applies the pick, falling back to the first', () => {
    const elite = () => piece('flier', 'solari', { x: 3, y: 3 }, 'sf', { wins: ELITE_WINS - 1, hp: 5, maxHp: 6 })
    const s = world([...kings(), elite(), foe()], { growth: true })
    const move = { type: 'move' as const, pieceId: 'sf', to: { x: 3, y: 2 }, duel: win }
    expect(growthChoice(s, move).perks).toEqual(perkChoices('flier'))
    expect(reduce(s, { ...move, perk: 'vigour' }).pieces.find((p) => p.id === 'sf')?.perk).toBe('vigour')
    expect(reduce(s, move).pieces.find((p) => p.id === 'sf')?.perk).toBe('might')
    // A perk that was not on offer is ignored.
    expect(reduce(s, { ...move, perk: 'ward' }).pieces.find((p) => p.id === 'sf')?.perk).toBe('might')
  })
  it('perks change duels and healing', () => {
    const mk = (perk?: Piece['perk']) => createFighter(piece('footsoldier', 'solari', { x: 0, y: 0 }, 'a', { perk }), { x: 0, y: 0 }, 0, 0)
    expect(mk('might').dealt).toBeGreaterThan(mk().dealt)
    expect(mk('ward').taken).toBeLessThan(mk().taken)
    expect(perkMods({ perk: undefined })).toEqual({ dealt: 1, taken: 1 })
    const s = world([...kings(), piece('footsoldier', 'solari', { x: 3, y: 4 }, 'sf', { hp: 2, perk: 'vigour', moved: true })], { growth: true })
    const after = reduce(reduce(s, { type: 'pass' }), { type: 'pass' })
    expect(after.pieces.find((p) => p.id === 'sf')?.hp).toBe(3)
  })
})

describe('promotion', () => {
  const edge = () => world([...kings(), piece('footsoldier', 'solari', { x: 5, y: 3 }, 'sf', { hp: 3 })], { promotion: true })
  it('turns a Footsoldier reaching the far column into the chosen role, keeping its wounds', () => {
    const moved = reduce(edge(), { type: 'move', pieceId: 'sf', to: { x: 6, y: 3 }, promote: 'marksman' })
    expect(moved.pieces.find((p) => p.id === 'sf')).toMatchObject({ role: 'marksman', maxHp: 5, hp: 4 })
  })
  it('defaults to a Charger and does nothing short of the far column or when off', () => {
    expect(reduce(edge(), { type: 'move', pieceId: 'sf', to: { x: 6, y: 3 } }).pieces.find((p) => p.id === 'sf')?.role).toBe('charger')
    expect(reduce(edge(), { type: 'move', pieceId: 'sf', to: { x: 5, y: 4 } }).pieces.find((p) => p.id === 'sf')?.role).toBe('footsoldier')
    const off = { ...edge(), config: { ...edge().config, promotion: false } }
    expect(reduce(off, { type: 'move', pieceId: 'sf', to: { x: 6, y: 3 } }).pieces.find((p) => p.id === 'sf')?.role).toBe('footsoldier')
  })
  it('promotes Umbral at column 0 and on winning a capture there', () => {
    const s = reduce(world([...kings(), piece('footsoldier', 'solari', { x: 3, y: 3 }, 'sf'), piece('footsoldier', 'umbral', { x: 1, y: 3 }, 'uf'), piece('footsoldier', 'solari', { x: 0, y: 3 }, 'sx')], { promotion: true }), { type: 'pass' })
    const out = reduce(s, { type: 'move', pieceId: 'uf', to: { x: 0, y: 3 }, duel: { attackerHp: 2, defenderHp: 0 } })
    expect(out.pieces.find((p) => p.id === 'uf')?.role).toBe('charger')
  })
  it('does not promote a loser or a winner that stays put, and asks only when it applies', () => {
    const s = world([...kings(), piece('footsoldier', 'solari', { x: 5, y: 3 }, 'sf'), piece('footsoldier', 'umbral', { x: 6, y: 3 }, 'uf')], { promotion: true })
    const stay = { attackerHp: 2, defenderHp: 1 }
    expect(reduce(s, { type: 'move', pieceId: 'sf', to: { x: 6, y: 3 }, duel: stay }).pieces.find((p) => p.id === 'sf')?.role).toBe('footsoldier')
    expect(growthChoice(s, { type: 'move', pieceId: 'sf', to: { x: 6, y: 3 }, duel: stay }).promote).toBeUndefined()
    expect(growthChoice(s, { type: 'move', pieceId: 'sf', to: { x: 6, y: 3 }, duel: win }).promote).toBe(true)
  })
})

describe('serialisation', () => {
  it('round-trips growth settings, perks and promotions through a code', () => {
    const s0 = world([...kings(), piece('footsoldier', 'solari', { x: 5, y: 3 }, 'sf', { wins: 3 }), piece('footsoldier', 'umbral', { x: 6, y: 3 }, 'uf')], { growth: true, promotion: true })
    const move = { type: 'move' as const, pieceId: 'sf', to: { x: 6, y: 3 }, duel: win, perk: 'ward' as const, promote: 'marksman' as const }
    const s1 = reduce(s0, move)
    expect(s1.pieces.find((p) => p.id === 'sf')).toMatchObject({ role: 'marksman', perk: 'ward', wins: 4 })
    const back = decodeRecord(encodeRecord({ initial: s0, actions: [move] }))
    expect(back?.actions[0]).toEqual(move)
    const quiet = decodeRecord(encodeRecord({ initial: s0, actions: [{ type: 'move', pieceId: 'sf', to: { x: 5, y: 4 } }] }))
    expect(quiet?.actions[0]).toEqual({ type: 'move', pieceId: 'sf', to: { x: 5, y: 4 } })
    expect(back?.initial.config).toMatchObject({ growth: true, promotion: true })
  })
})
