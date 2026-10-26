import { describe, expect, it } from 'vitest'
import { newGame, reduce } from '../reducer'
import { canCast, leaderOf, spellTargets } from './spells'
import type { Court, GameState, Piece, Pos, Role } from './types'

const piece = (role: Role, court: Court, pos: Pos, id: string, hp = 5): Piece => ({
  id, court, role, hp, maxHp: 7, pos, rest: 0, moved: false, bound: false,
})
const world = (pieces: Piece[], extra: Partial<GameState> = {}): GameState => ({
  ...newGame(), pieces, ...extra,
})
const base = () => [
  piece('leader', 'solari', { x: 1, y: 1 }, 'sl', 7),
  piece('leader', 'umbral', { x: 5, y: 5 }, 'ul', 7),
  piece('footsoldier', 'solari', { x: 2, y: 1 }, 'sf', 2),
  piece('footsoldier', 'umbral', { x: 4, y: 4 }, 'uf', 4),
]

describe('spells', () => {
  it('costs the Leader 1 HP and the whole turn, and is one-use', () => {
    let s = reduce(world(base()), { type: 'cast', spell: 'turn' })
    expect(leaderOf(s, 'solari')!.hp).toBe(6)
    expect(s.turn).toBe('umbral')
    expect(s.dir).toBe(-1)
    expect(s.spells.solari).not.toContain('turn')
    s = reduce(s, { type: 'pass' })
    expect(reduce(s, { type: 'cast', spell: 'turn' })).toBe(s)
  })

  it('Blink moves the Leader anywhere empty', () => {
    const s = reduce(world(base()), { type: 'cast', spell: 'blink', to: { x: 6, y: 0 } })
    expect(leaderOf(s, 'solari')!.pos).toEqual({ x: 6, y: 0 })
    const occupied = world(base())
    expect(reduce(occupied, { type: 'cast', spell: 'blink', to: { x: 2, y: 1 } })).toBe(occupied)
  })

  it('Mend heals an ally up to its max', () => {
    const s = reduce(world(base()), { type: 'cast', spell: 'mend', pieceId: 'sf' })
    expect(s.pieces.find((p) => p.id === 'sf')!.hp).toBe(5)
  })

  it('Swap exchanges positions with the Leader', () => {
    const s = reduce(world(base()), { type: 'cast', spell: 'swap', pieceId: 'uf' })
    expect(leaderOf(s, 'solari')!.pos).toEqual({ x: 4, y: 4 })
    expect(s.pieces.find((p) => p.id === 'uf')!.pos).toEqual({ x: 1, y: 1 })
  })

  it('Conjure adds a Footsoldier beside the Leader', () => {
    const s = reduce(world(base()), { type: 'cast', spell: 'conjure', to: { x: 0, y: 1 } })
    expect(s.pieces.filter((p) => p.court === 'solari' && p.role === 'footsoldier')).toHaveLength(2)
    expect(reduce(world(base()), { type: 'cast', spell: 'conjure', to: { x: 4, y: 1 } }).spells.solari).toContain('conjure')
  })

  it('Revive returns the last fallen ally, but only when one exists', () => {
    expect(canCast(world(base()), 'solari', 'revive')).toBe(false)
    const fallen = { ...piece('bruiser', 'solari', { x: 0, y: 0 }, 'sb', 0), maxHp: 10 }
    const s = reduce(world(base(), { captured: [fallen] }), { type: 'cast', spell: 'revive', to: { x: 0, y: 1 } })
    expect(s.pieces.find((p) => p.id === 'sb')).toMatchObject({ hp: 2, pos: { x: 0, y: 1 } })
    expect(s.captured).toHaveLength(0)
  })

  it('Bind freezes an enemy through its next turn only', () => {
    let s = reduce(world(base()), { type: 'cast', spell: 'bind', pieceId: 'uf' })
    expect(s.pieces.find((p) => p.id === 'uf')!.bound).toBe(true)
    const bound = s.pieces.find((p) => p.id === 'uf')!
    expect(reduce(s, { type: 'move', pieceId: 'uf', to: { x: 4, y: 3 } })).toBe(s)
    s = reduce(s, { type: 'pass' })
    expect(s.pieces.find((p) => p.id === bound.id)!.bound).toBe(false)
  })

  it('cannot Bind a Leader', () => {
    expect(spellTargets(world(base()), 'solari', 'bind').pieces).not.toContain('ul')
  })

  it('cannot target pieces on beacons', () => {
    const pieces = base().map((p) => (p.id === 'uf' ? { ...p, pos: { x: 3, y: 3 } } : p))
    const s = world(pieces)
    expect(spellTargets(s, 'solari', 'bind').pieces).toEqual([])
    expect(spellTargets(s, 'solari', 'swap').pieces).not.toContain('uf')
  })

  it('is disabled in the Eclipse and when the Leader is on 1 HP', () => {
    expect(canCast(world(base(), { eclipse: true }), 'solari', 'turn')).toBe(false)
    const weak = base().map((p) => (p.id === 'sl' ? { ...p, hp: 1 } : p))
    expect(canCast(world(weak), 'solari', 'turn')).toBe(false)
  })
})
