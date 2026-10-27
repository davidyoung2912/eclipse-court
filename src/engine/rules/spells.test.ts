import { describe, expect, it } from 'vitest'
import { newGame, reduce } from '../reducer'
import { squareLuminance } from './luminance'
import { legalMoves } from './moves'
import { ALL_SPELLS, canCast, CLASSIC_SPELLS, leaderOf, loadoutProblem, signatureSpells, spellPool, spellTargets } from './spells'
import type { Court, GameState, Piece, Pos, Role } from './types'

const piece = (role: Role, court: Court, pos: Pos, id: string, hp = 5): Piece => ({
  id, court, role, hp, maxHp: 7, pos, rest: 0, moved: false, bound: false,
})
const world = (pieces: Piece[], extra: Partial<GameState> = {}): GameState => ({
  ...newGame(), pieces, spells: { solari: [...ALL_SPELLS], umbral: [...ALL_SPELLS] }, ...extra,
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

  describe('Hold the Light', () => {
    it('freezes the cycle for the round it is cast in', () => {
      let s = reduce(world(base()), { type: 'cast', spell: 'hold' })
      expect(s.hold).toBe(1)
      s = reduce(s, { type: 'pass' })
      expect(s.round).toBe(2)
      expect(s.phase).toBe(0)
      expect(s.hold).toBe(0)
      s = reduce(reduce(s, { type: 'pass' }), { type: 'pass' })
      expect(s.phase).toBe(1)
    })

    it('cannot be stacked while the light is already held', () => {
      expect(canCast(world(base(), { hold: 1 }), 'solari', 'hold')).toBe(false)
    })
  })

  it('Hasten moves the cycle two steps in its direction', () => {
    expect(reduce(world(base(), { phase: 1 }), { type: 'cast', spell: 'hasten' }).phase).toBe(3)
    expect(reduce(world(base(), { phase: 0, dir: -1 }), { type: 'cast', spell: 'hasten' }).phase).toBe(6)
  })

  describe('Shroud', () => {
    it('protects an ally from attack and spells until the foe has moved', () => {
      const pieces = base().map((p) => (p.id === 'uf' ? { ...p, pos: { x: 2, y: 5 } } : p))
      pieces.push(piece('footsoldier', 'umbral', { x: 2, y: 4 }, 'uf2'))
      pieces.push(piece('footsoldier', 'solari', { x: 3, y: 5 }, 'sf2'))
      let s = reduce(world(pieces), { type: 'cast', spell: 'shroud', pieceId: 'sf2' })
      s = { ...s, turn: 'umbral' }
      const attacker = s.pieces.find((p) => p.id === 'uf')!
      expect(legalMoves(s, attacker).some((m) => m.x === 3 && m.y === 5)).toBe(false)
      expect(spellTargets({ ...s, turn: 'umbral' }, 'umbral', 'bind').pieces).not.toContain('sf2')
      s = reduce(s, { type: 'pass' })
      expect(s.pieces.find((p) => p.id === 'sf2')!.shrouded).toBe(false)
    })

    it('belongs to the Umbral court only', () => {
      expect(loadoutProblem('solari', ['shroud', 'blink', 'mend', 'turn'])).not.toBeNull()
      expect(loadoutProblem('umbral', ['shroud', 'blink', 'mend', 'turn'])).toBeNull()
    })
  })

  describe('Exchange', () => {
    it('trades two allies, named by piece and square', () => {
      const pieces = [...base(), piece('flier', 'solari', { x: 3, y: 5 }, 'sfl')]
      const s = reduce(world(pieces), { type: 'cast', spell: 'exchange', pieceId: 'sf', to: { x: 3, y: 5 } })
      expect(s.pieces.find((p) => p.id === 'sf')!.pos).toEqual({ x: 3, y: 5 })
      expect(s.pieces.find((p) => p.id === 'sfl')!.pos).toEqual({ x: 2, y: 1 })
    })

    it('refuses an enemy as the second piece, or the same piece twice', () => {
      const s = world(base())
      expect(reduce(s, { type: 'cast', spell: 'exchange', pieceId: 'sf', to: { x: 4, y: 4 } })).toBe(s)
      expect(reduce(s, { type: 'cast', spell: 'exchange', pieceId: 'sf', to: { x: 2, y: 1 } })).toBe(s)
    })

    it('offers only the remaining allies once the first is chosen', () => {
      const s = world(base())
      expect(spellTargets(s, 'solari', 'exchange', 'sf').pieces).toEqual(['sl'])
    })
  })

  describe('Mirror', () => {
    it("repeats the foe's last spell without spending it", () => {
      let s = reduce(world(base(), { turn: 'umbral' }), { type: 'cast', spell: 'bind', pieceId: 'sf' })
      expect(s.lastCast.umbral).toBe('bind')
      s = reduce(s, { type: 'cast', spell: 'mirror', pieceId: 'uf' })
      expect(s.pieces.find((p) => p.id === 'uf')!.bound).toBe(true)
      expect(s.spells.solari).toContain('bind')
      expect(s.spells.solari).not.toContain('mirror')
    })

    it('needs a spell to copy', () => {
      expect(canCast(world(base()), 'solari', 'mirror')).toBe(false)
    })

    it('cannot copy a no-target spell with a target', () => {
      const s = reduce(world(base(), { turn: 'umbral' }), { type: 'cast', spell: 'turn' })
      expect(canCast(s, 'solari', 'mirror')).toBe(true)
      expect(reduce(s, { type: 'cast', spell: 'mirror', pieceId: 'uf' })).toBe(s)
    })
  })

  describe('Sacrifice', () => {
    it('turns an ally into Leader HP, capped at the Leader\'s maximum', () => {
      const pieces = base().map((p) => (p.id === 'sl' ? { ...p, hp: 3 } : p))
      pieces.push(piece('bruiser', 'solari', { x: 1, y: 2 }, 'sb', 9))
      const s = reduce(world(pieces, { turn: 'umbral' }), { type: 'cast', spell: 'sacrifice', pieceId: 'sb' })
      expect(leaderOf(s, 'umbral')).toBeDefined()
      const mine = reduce(world(pieces), { type: 'cast', spell: 'sacrifice', pieceId: 'sb' })
      expect(mine.pieces.find((p) => p.id === 'sb')).toBeUndefined()
      expect(mine.captured.map((p) => p.id)).toContain('sb')
      expect(leaderOf(mine, 'solari')!.hp).toBe(6)
    })

    it('needs a hurt Leader and an ally that is not the Leader', () => {
      const healthy = world(base().map((p) => (p.id === 'sl' ? { ...p, hp: 7 } : p)))
      expect(canCast(healthy, 'solari', 'sacrifice')).toBe(false)
      const hurt = world(base().map((p) => (p.id === 'sl' ? { ...p, hp: 4 } : p)))
      expect(spellTargets(hurt, 'solari', 'sacrifice').pieces).toEqual(['sf'])
    })
  })

  describe('loadouts', () => {
    it('start from the classic seven, or from the config', () => {
      expect(newGame().spells.solari).toEqual([...CLASSIC_SPELLS])
      const g = newGame({ loadouts: { solari: ['hold', 'mend', 'blink', 'turn'], umbral: ['shroud', 'bind', 'swap', 'revive'] } })
      expect(g.spells.umbral).toEqual(['shroud', 'bind', 'swap', 'revive'])
    })

    it('give each court two signatures on top of the shared pool', () => {
      expect(signatureSpells('solari')).toEqual(['hold', 'mirror'])
      expect(signatureSpells('umbral')).toEqual(['shroud', 'sacrifice'])
      expect(spellPool('solari')).toHaveLength(11)
    })

    it('must hold four distinct spells the court may carry', () => {
      expect(loadoutProblem('solari', ['blink', 'mend', 'turn', 'hold'])).toBeNull()
      expect(loadoutProblem('solari', ['blink', 'mend', 'turn'])).not.toBeNull()
      expect(loadoutProblem('solari', ['blink', 'blink', 'turn', 'hold'])).not.toBeNull()
    })
  })

  describe('recharge', () => {
    it('returns a cast spell after the set number of rounds', () => {
      let s = reduce(world(base(), { spells: { solari: ['turn', 'hold'], umbral: [] }, config: { ...newGame().config, recharge: 2 } }), { type: 'cast', spell: 'turn' })
      expect(s.spells.solari).toEqual(['hold'])
      s = reduce(s, { type: 'pass' })
      expect(s.round).toBe(2)
      expect(s.spells.solari).toEqual(['hold'])
      s = reduce(reduce(s, { type: 'pass' }), { type: 'pass' })
      expect(s.round).toBe(3)
      expect(s.spells.solari).toEqual(['hold', 'turn'])
    })

    it('does nothing when the match does not recharge', () => {
      const s = reduce(reduce(world(base()), { type: 'cast', spell: 'turn' }), { type: 'pass' })
      expect(s.recharging.solari).toEqual([])
    })
  })
})

describe('court passives', () => {
  const fl = (pos: Pos) => [piece('leader', 'solari', { x: 0, y: 3 }, 'sl', 7), piece('leader', 'umbral', { x: 6, y: 3 }, 'ul', 7), piece('flier', 'solari', pos, 'sfl')]
  const reach = (state: GameState) => legalMoves(state, state.pieces.find((p) => p.id === 'sfl')!)
  const at = { x: 2, y: 2 }
  const phaseWhere = (test: (lum: number) => boolean) =>
    [0, 1, 2, 3, 4, 5, 6, 7].find((phase) => test(squareLuminance({ ...newGame(), phase }, at)))!

  it('lets a Solari Flier in full light reach 4 squares', () => {
    const lit = world(fl(at), { phase: phaseWhere((l) => l === 2) })
    expect(reach(lit).some((m) => m.x === 6 && m.y === 2)).toBe(true)
  })

  it('does not apply short of full light or when passives are off', () => {
    const dim = world(fl(at), { phase: phaseWhere((l) => l < 2) })
    expect(reach(dim).some((m) => m.x === 6 && m.y === 2)).toBe(false)
    const off = world(fl(at), { phase: phaseWhere((l) => l === 2), config: { ...newGame().config, passives: false } })
    expect(reach(off).some((m) => m.x === 6 && m.y === 2)).toBe(false)
  })

  it('lets Umbral pieces mend on dark squares as the round ends', () => {
    const pieces = [piece('leader', 'solari', { x: 0, y: 3 }, 'sl', 7), piece('leader', 'umbral', { x: 6, y: 3 }, 'ul', 7), piece('footsoldier', 'umbral', { x: 3, y: 2 }, 'uf', 2)]
    const hpAfter = (state: GameState) => {
      const s = reduce(reduce(state, { type: 'pass' }), { type: 'pass' })
      return s.pieces.find((p) => p.id === 'uf')!.hp
    }
    const dark = world(pieces, { phase: 0 })
    const lit = world(pieces, { phase: 4 })
    expect(hpAfter(dark)).toBe(hpAfter(lit) + 1)
  })
})
