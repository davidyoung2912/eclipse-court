import { describe, expect, it } from 'vitest'
import { ECLIPSE_ROUND, estimateOdds, ROUND_LIMIT, newGame, reduce } from './reducer'
import { BEACONS } from './rules/board'
import { squareLuminance } from './rules/luminance'
import type { Court, GameState, Piece, Pos, Role } from './rules/types'

const piece = (role: Role, court: Court, pos: Pos, id: string, hp = 5): Piece => ({
  id, court, role, hp, maxHp: 10, pos, rest: 0, moved: false, bound: false,
})
const world = (pieces: Piece[], extra: Partial<GameState> = {}): GameState => ({
  ...newGame(), pieces, ...extra,
})
const pass = (s: GameState, n = 1) => {
  for (let i = 0; i < n; i++) s = reduce(s, { type: 'pass' })
  return s
}

describe('setup', () => {
  it('fields 12 pieces per court on distinct squares', () => {
    const g = newGame()
    expect(g.pieces.filter((p) => p.court === 'solari')).toHaveLength(12)
    expect(g.pieces.filter((p) => p.court === 'umbral')).toHaveLength(12)
    expect(new Set(g.pieces.map((p) => `${p.pos.x},${p.pos.y}`)).size).toBe(24)
    expect(g.pieces.find((p) => p.role === 'leader' && p.court === 'solari')!.pos).toEqual({ x: 0, y: 3 })
  })
})

describe('turns and rounds', () => {
  it('moves onto an empty square and passes the turn', () => {
    const g = newGame()
    const stag = g.pieces.find((p) => p.id === 'solari-charger-1')!
    const next = reduce(g, { type: 'move', pieceId: stag.id, to: { x: 3, y: 2 } })
    expect(next.turn).toBe('umbral')
    expect(next.pieces.find((p) => p.id === stag.id)!.pos).toEqual({ x: 3, y: 2 })
  })
  it('ignores illegal moves and moves out of turn', () => {
    const g = newGame()
    expect(reduce(g, { type: 'move', pieceId: 'solari-charger-1', to: { x: 6, y: 6 } })).toBe(g)
    expect(reduce(g, { type: 'move', pieceId: 'umbral-charger-1', to: { x: 3, y: 2 } })).toBe(g)
  })
  it('steps luminance once after both courts have moved', () => {
    const g = newGame()
    const s1 = pass(g)
    expect(s1.phase).toBe(0)
    const s2 = pass(s1)
    expect(s2.phase).toBe(1)
    expect(s2.round).toBe(2)
  })
  it('is deterministic for the same seed and actions', () => {
    const run = () => {
      let s = newGame(42)
      s = reduce(s, { type: 'move', pieceId: 'solari-charger-1', to: { x: 3, y: 2 } })
      return reduce(s, { type: 'move', pieceId: 'umbral-charger-1', to: { x: 3, y: 4 } })
    }
    expect(run()).toEqual(run())
  })
})

describe('duels', () => {
  const a = piece('bruiser', 'solari', { x: 2, y: 3 }, 'a', 10)
  const d = piece('footsoldier', 'umbral', { x: 3, y: 3 }, 'd', 4)
  const king = piece('leader', 'umbral', { x: 6, y: 0 }, 'k')
  it('applies a supplied duel outcome: attacker wins and keeps its wounds', () => {
    const s = reduce(world([a, d, king]), { type: 'move', pieceId: 'a', to: d.pos, duel: { attackerHp: 6, defenderHp: 0 } })
    expect(s.pieces.find((p) => p.id === 'a')).toMatchObject({ pos: d.pos, hp: 6 })
    expect(s.captured.map((p) => p.id)).toEqual(['d'])
  })
  it('lets the defender keep the square when both survive', () => {
    const s = reduce(world([a, d, king]), { type: 'move', pieceId: 'a', to: d.pos, duel: { attackerHp: 3, defenderHp: 2 } })
    expect(s.pieces.find((p) => p.id === 'a')).toMatchObject({ pos: a.pos, hp: 3 })
    expect(s.pieces.find((p) => p.id === 'd')).toMatchObject({ pos: d.pos, hp: 2 })
  })
  it('removes both when both die', () => {
    const s = reduce(world([a, d, king]), { type: 'move', pieceId: 'a', to: d.pos, duel: { attackerHp: 0, defenderHp: 0 } })
    expect(s.pieces.map((p) => p.id)).toEqual(['k'])
  })
  it('resolves a capture with the stub when no outcome is given', () => {
    const s = reduce(world([a, d, king]), { type: 'move', pieceId: 'a', to: d.pos })
    expect(s.captured.map((p) => p.id)).toContain('d')
    expect(s.lastDuel).not.toBeNull()
  })
})

describe('winning', () => {
  it('wins by eliminating every enemy', () => {
    const a = piece('bruiser', 'solari', { x: 2, y: 3 }, 'a', 10)
    const d = piece('footsoldier', 'umbral', { x: 3, y: 3 }, 'd', 4)
    const s = reduce(world([a, d]), { type: 'move', pieceId: 'a', to: d.pos, duel: { attackerHp: 9, defenderHp: 0 } })
    expect(s.winner).toBe('solari')
  })
  it('wins by holding all five beacons at the end of your turn', () => {
    const ps = BEACONS.slice(0, 4).map((b, i) => piece('footsoldier', 'solari', b, `s${i}`))
    ps.push(piece('flier', 'solari', { x: 3, y: 5 }, 'mover'))
    ps.push(piece('footsoldier', 'umbral', { x: 6, y: 6 }, 'u'))
    const g = world(ps)
    expect(BEACONS.some((b) => b.x === 3 && b.y === 6)).toBe(true)
    const s = reduce(g, { type: 'move', pieceId: 'mover', to: { x: 3, y: 6 } })
    expect(s.winner).toBe('solari')
  })
  it('ignores further actions once decided', () => {
    const g = world([piece('footsoldier', 'solari', { x: 0, y: 0 }, 's')], { winner: 'solari' })
    expect(reduce(g, { type: 'pass' })).toBe(g)
  })
})

describe('wounds and healing', () => {
  const idle = (hp: number, pos: Pos) => [
    piece('bruiser', 'solari', pos, 'a', hp),
    piece('bruiser', 'umbral', { x: 6, y: 0 }, 'u', 10),
  ]
  it('heals 1 pip every 2 rounds when unmoved', () => {
    let s = world(idle(5, { x: 1, y: 1 }))
    s = pass(s, 2)
    expect(s.pieces[0].hp).toBe(5)
    s = pass(s, 2)
    expect(s.pieces[0].hp).toBe(6)
  })
  it('heals an extra pip per round on a beacon', () => {
    const s = pass(world(idle(5, { x: 3, y: 3 })), 2)
    expect(s.pieces[0].hp).toBe(6)
  })
  it('does not heal a piece that moved this round', () => {
    let s = world([piece('footsoldier', 'solari', { x: 1, y: 1 }, 'a', 2), piece('footsoldier', 'umbral', { x: 6, y: 0 }, 'u', 10)])
    s = reduce(s, { type: 'move', pieceId: 'a', to: { x: 1, y: 2 } })
    s = reduce(s, { type: 'pass' })
    expect(s.pieces.find((p) => p.id === 'a')!.rest).toBe(0)
  })
})

describe('the Eclipse', () => {
  it('begins after round 30, freezing luminance and draining pieces off beacons', () => {
    const ps = [
      piece('bruiser', 'solari', { x: 1, y: 1 }, 'off', 5),
      piece('bruiser', 'solari', { x: 3, y: 3 }, 'on', 5),
      piece('bruiser', 'umbral', { x: 6, y: 0 }, 'u', 10),
    ]
    let s = world(ps, { round: ECLIPSE_ROUND })
    s = pass(s, 2)
    expect(s.eclipse).toBe(true)
    expect(squareLuminance(s, { x: 3, y: 3 })).toBe(0)
    const frozen = s.phase
    s = pass(s, 4)
    expect(s.phase).toBe(frozen)
    expect(s.pieces.find((p) => p.id === 'off')!.hp).toBeLessThan(5)
    expect(s.pieces.find((p) => p.id === 'on')!.hp).toBeGreaterThanOrEqual(5)
  })
  it('forces a result by draining pieces to death', () => {
    const ps = [
      piece('footsoldier', 'solari', { x: 1, y: 1 }, 'a', 2),
      piece('footsoldier', 'umbral', { x: 5, y: 5 }, 'u', 6),
    ]
    const s = pass(world(ps, { round: ECLIPSE_ROUND + 1, eclipse: true }), 2 * 3)
    expect(s.winner).toBe('umbral')
  })
})

describe('round limit', () => {
  it('settles a stalemate on beacons held, then on total HP', () => {
    const ps = [
      piece('footsoldier', 'solari', { x: 3, y: 3 }, 's', 4),
      piece('footsoldier', 'umbral', { x: 6, y: 3 }, 'u', 4),
      piece('footsoldier', 'umbral', { x: 5, y: 5 }, 'v', 4),
    ]
    expect(pass(world(ps.slice(0, 2), { round: ROUND_LIMIT, eclipse: true }), 2).winner).toBe('draw')
    expect(pass(world(ps, { round: ROUND_LIMIT, eclipse: true }), 2).winner).toBe('umbral')
    const ahead = pass(world([ps[0], { ...ps[1], pos: { x: 4, y: 4 } }, ps[2]], { round: ROUND_LIMIT, eclipse: true }), 2)
    expect(ahead.winner).toBe('solari')
  })
})

describe('odds and auras', () => {
  it('odds sum to 1 and favour the stronger piece', () => {
    const o = estimateOdds(piece('bruiser', 'solari', { x: 2, y: 2 }, 'a', 10), piece('footsoldier', 'umbral', { x: 3, y: 2 }, 'b', 4), 0)
    expect(o.attacker + o.defender + o.other).toBeCloseTo(1)
    expect(o.attacker).toBeGreaterThan(o.defender)
  })

  it('an Aura heals adjacent allies at round end', () => {
    const s = world([
      piece('aura', 'solari', { x: 1, y: 1 }, 'au', 7),
      piece('footsoldier', 'solari', { x: 2, y: 1 }, 'f', 1),
      piece('footsoldier', 'solari', { x: 1, y: 4 }, 'far', 1),
      piece('leader', 'umbral', { x: 6, y: 0 }, 'ul', 7),
    ])
    const after = pass(s, 2)
    expect(after.pieces.find((p) => p.id === 'f')!.hp).toBe(2)
    expect(after.pieces.find((p) => p.id === 'far')!.hp).toBe(1)
  })
})
