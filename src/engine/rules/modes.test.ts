import { describe, expect, it } from 'vitest'
import { skirmishConfig } from '../data/setups'
import { newGame, reduce } from '../reducer'
import { CENTER, chebyshev } from './board'
import { eventAt, HILL_TURNS, safeRadius, SCORE_TARGET, SHRINK_DAMAGE } from './events'
import { squareLuminance } from './luminance'
import { legalMoves } from './moves'
import { decodeRecord, encodeRecord } from '../serialize'
import type { Court, GameState, MatchConfig, Piece, Pos, Role } from './types'

const piece = (role: Role, court: Court, pos: Pos, id: string, hp = 5): Piece => ({
  id, court, role, hp, maxHp: 10, pos, rest: 0, moved: false, bound: false,
})
const world = (pieces: Piece[], config: Partial<MatchConfig> = {}, extra: Partial<GameState> = {}): GameState => ({
  ...newGame(config), pieces, ...extra,
})
const pass = (s: GameState, n = 1) => {
  for (let i = 0; i < n; i++) s = reduce(s, { type: 'pass' })
  return s
}
const kings = () => [
  piece('leader', 'solari', { x: 0, y: 0 }, 'sl'),
  piece('leader', 'umbral', { x: 6, y: 6 }, 'ul'),
]

describe('Leader Capture', () => {
  it('is won by defeating the enemy Leader, not the whole army', () => {
    const s = world([...kings(), piece('footsoldier', 'umbral', { x: 5, y: 4 }, 'uf'), piece('bruiser', 'solari', { x: 5, y: 5 }, 'sb')], { mode: 'leader' })
    const hit = reduce(s, { type: 'move', pieceId: 'sb', to: { x: 6, y: 6 }, duel: { attackerHp: 3, defenderHp: 0 } })
    expect(hit.winner).toBe('solari')
    // The same capture in Beacons mode leaves a foe standing, so the game goes on.
    expect(reduce({ ...s, config: { ...s.config, mode: 'beacons' } }, { type: 'move', pieceId: 'sb', to: { x: 6, y: 6 }, duel: { attackerHp: 3, defenderHp: 0 } }).winner).toBeNull()
  })
  it('is lost if your own Leader falls', () => {
    const s = pass(world([...kings(), piece('bruiser', 'umbral', { x: 1, y: 1 }, 'ub'), piece('footsoldier', 'solari', { x: 3, y: 0 }, 'sf')], { mode: 'leader' }))
    const lost = reduce(s, { type: 'move', pieceId: 'ub', to: { x: 0, y: 0 }, duel: { attackerHp: 2, defenderHp: 0 } })
    expect(lost.winner).toBe('umbral')
  })
  it('does not end on holding every beacon', () => {
    const holders = newGame().config.beacons.map((b, i) => piece('footsoldier', 'solari', b, `h${i}`))
    expect(pass(world([...holders, ...kings()], { mode: 'leader' })).winner).toBeNull()
    expect(pass(world([...holders, ...kings()])).winner).toBe('solari')
  })
})

describe('Score Race', () => {
  const holder = (court: Court, n: number) => {
    const cfg = newGame().config
    return cfg.beacons.slice(0, n).map((b, i) => piece('footsoldier', court, b, `${court}${i}`, 10))
  }
  it('scores held beacons at the end of each round', () => {
    const s = pass(world([...holder('solari', 3), ...kings()], { mode: 'score' }), 2)
    expect(s.score.solari).toBe(3)
    expect(s.score.umbral).toBe(0)
    expect(s.winner).toBeNull()
  })
  it('is won at the target', () => {
    const s = world([...holder('solari', 3), ...kings()], { mode: 'score' }, { score: { solari: SCORE_TARGET - 3, umbral: 4 } })
    expect(pass(s, 2).winner).toBe('solari')
  })
  it('does not score in other modes', () => {
    expect(pass(world([...holder('solari', 3), ...kings()]), 2).score).toEqual({ solari: 0, umbral: 0 })
  })
  it('settles at the round limit on score first', () => {
    const s = world([...holder('umbral', 2), ...holder('solari', 3).slice(0, 1), ...kings()], { mode: 'score', roundLimit: 5 }, { round: 5, score: { solari: 9, umbral: 10 } })
    // The count at the limit uses points, not the beacons held in the last round.
    expect(pass(s, 2).winner).toBe('umbral')
  })
})

describe('King of the Hill', () => {
  it('is won by ending five of your turns on the centre', () => {
    let s = world([...kings(), piece('bruiser', 'solari', CENTER, 'sb', 10)], { mode: 'hill' })
    for (let i = 0; i < HILL_TURNS - 1; i++) {
      s = pass(s, 2)
      expect(s.winner).toBeNull()
    }
    expect(s.streak.solari).toBe(HILL_TURNS - 1)
    expect(pass(s).winner).toBe('solari')
  })
  it('resets when the centre is left', () => {
    const s = world(kings(), { mode: 'hill' }, { streak: { solari: 2, umbral: 0 } })
    expect(pass(s).streak.solari).toBe(0)
  })
})

describe('day events', () => {
  const config = { events: true, seed: 5 }
  const rounds = Array.from({ length: 60 }, (_, i) => i + 1)
  it('are decided by the seed and round alone', () => {
    const a = rounds.map((r) => eventAt(newGame(config).config, r))
    expect(rounds.map((r) => eventAt(newGame(config).config, r))).toEqual(a)
    expect(rounds.map((r) => eventAt(newGame({ ...config, seed: 6 }).config, r))).not.toEqual(a)
  })
  it('leave the first day, the Eclipse and games that switch them off alone', () => {
    const cfg = newGame(config).config
    expect(rounds.filter((r) => r <= 8).every((r) => eventAt(cfg, r) === null)).toBe(true)
    expect(rounds.filter((r) => r > cfg.eclipseRound).every((r) => eventAt(cfg, r) === null)).toBe(true)
    expect(rounds.every((r) => eventAt(newGame({ seed: 5 }).config, r) === null)).toBe(true)
    expect(rounds.some((r) => eventAt(cfg, r))).toBe(true)
  })
  it('last two rounds from dawn', () => {
    const cfg = newGame(config).config
    expect(eventAt(cfg, 9)).not.toBeNull()
    expect(eventAt(cfg, 10)).toBe(eventAt(cfg, 9))
    expect(eventAt(cfg, 11)).toBeNull()
  })
  const find = (event: string) => {
    for (let seed = 1; seed < 200; seed++) for (const r of [9, 17, 25]) if (eventAt(newGame({ events: true, seed }).config, r) === event) return { seed, round: r }
    throw new Error('no such event')
  }
  it('Solar Flare and Gloaming shift the shifting squares one step', () => {
    for (const [event, delta] of [['flare', 1], ['gloaming', -1]] as const) {
      const { seed, round } = find(event)
      const on = world(kings(), { events: true, seed }, { round, phase: 3 })
      const off = world(kings(), { seed }, { round, phase: 3 })
      const sq = { x: 3, y: 2 }
      const expected = Math.max(-2, Math.min(2, squareLuminance(off, sq) + delta))
      expect(squareLuminance(on, sq)).toBe(expected)
      expect(squareLuminance(on, { x: 0, y: 0 })).toBe(squareLuminance(off, { x: 0, y: 0 }))
    }
  })
  it('Fog shortens a Flier\'s reach', () => {
    const { seed, round } = find('fog')
    const flier = piece('flier', 'solari', { x: 0, y: 0 }, 'f')
    const reach = (events: boolean) => Math.max(...legalMoves(world([flier, ...kings().slice(1)], { events, seed }, { round }), flier).map((p) => chebyshev(p, flier.pos)))
    expect(reach(false)).toBe(3)
    expect(reach(true)).toBe(2)
  })
  it('Blight stops all healing', () => {
    const { seed, round } = find('blight')
    const hurt = { ...piece('footsoldier', 'solari', { x: 2, y: 2 }, 'h', 3), rest: 1 }
    const run = (events: boolean) => pass(world([hurt, ...kings()], { events, seed }, { round }), 2).pieces.find((p) => p.id === 'h')!.hp
    expect(run(false)).toBe(4)
    expect(run(true)).toBe(3)
  })
})

describe('variable cycle', () => {
  it('runs the shorter and longer days and starts in reverse on request', () => {
    const swift = skirmishConfig({ mode: 'classic', board: 'classic', cycle: 'swift' }, 'solari', 3)
    expect(swift.day).toHaveLength(6)
    expect(skirmishConfig({ mode: 'classic', board: 'classic', cycle: 'long' }, 'solari', 3).day).toHaveLength(10)
    expect(skirmishConfig({ mode: 'classic', board: 'classic' }, 'solari', 3).day).toHaveLength(8)
    let s = newGame(swift)
    s = pass(s, 12)
    expect(s.phase).toBe(0)
    expect(newGame({ reverse: true }).dir).toBe(-1)
    expect(pass(newGame({ reverse: true }), 2).phase).toBe(7)
  })
})

describe('Eclipse showdown', () => {
  const config = { showdown: true, eclipseRound: 3, roundLimit: 60 }
  const at = (round: number) => world([], config, { round, eclipse: round > 3 })
  it('shrinks the safe zone round by round from the Eclipse', () => {
    expect([2, 3, 4, 5, 6, 7, 8, 9, 20].map((r) => safeRadius(at(r)))).toEqual([null, null, 3, 2, 2, 1, 1, 0, 0])
    expect(safeRadius(world([], { eclipseRound: 3 }, { round: 9, eclipse: true }))).toBeNull()
  })
  it('hurts pieces outside the zone, even on a beacon, but not those inside', () => {
    const out = piece('bruiser', 'solari', { x: 0, y: 3 }, 'out', 10)
    const inside = piece('bruiser', 'solari', CENTER, 'in', 10)
    const s = pass(world([out, inside, ...kings()], config, { round: 7, eclipse: true }), 2)
    // Round 7 has radius 2: the edge beacon is outside it. A beacon heals and the Eclipse spares it, the showdown does not.
    expect(s.pieces.find((p) => p.id === 'out')!.hp).toBeLessThan(10)
    expect(10 - s.pieces.find((p) => p.id === 'out')!.hp).toBeGreaterThanOrEqual(SHRINK_DAMAGE - 1)
    expect(s.pieces.find((p) => p.id === 'in')!.hp).toBe(10)
  })
  it('leaves only the centre at the end', () => {
    const s = pass(world([piece('bruiser', 'solari', CENTER, 'c', 10), piece('bruiser', 'umbral', { x: 5, y: 3 }, 'o', 10)], config, { round: 4, eclipse: true }), 14)
    expect(s.winner).toBe('solari')
  })
})

describe('saving', () => {
  it('round-trips the new settings through a code', () => {
    const initial = newGame({ mode: 'hill', events: true, showdown: true, reverse: true, seed: 9 })
    const record = decodeRecord(encodeRecord({ initial, actions: [] }))
    expect(record?.initial.config).toMatchObject({ mode: 'hill', events: true, showdown: true, reverse: true })
    expect(record?.initial.dir).toBe(-1)
  })
  it('refuses an unknown mode', () => {
    const initial = newGame({ seed: 9 })
    const code = encodeRecord({ initial: { ...initial, config: { ...initial.config, mode: 'chess' as never } }, actions: [] })
    expect(decodeRecord(code)).toBeNull()
  })
})

describe('scenario objectives', () => {
  const wall = () => [piece('footsoldier', 'umbral', { x: 6, y: 0 }, 'uf', 10)]
  const cfg = (objective: MatchConfig['objective']): Partial<MatchConfig> => ({ objective })

  it('Survive is won by reaching the round, and lost with the Leader', () => {
    const s = world([...kings(), ...wall()], cfg({ kind: 'survive', rounds: 3 }))
    expect(pass(s, 4).winner).toBeNull()
    expect(pass(s, 6).winner).toBe('solari')
    // A Leader captured on the way loses even in the last round.
    const doomed = pass(world([...kings(), piece('bruiser', 'umbral', { x: 1, y: 1 }, 'ub')], cfg({ kind: 'survive', rounds: 3 })))
    expect(reduce(doomed, { type: 'move', pieceId: 'ub', to: { x: 0, y: 0 }, duel: { attackerHp: 2, defenderHp: 0 } }).winner).toBe('umbral')
  })
  it('Survive is not ended by losing every other piece but the Leader', () => {
    const s = world([...kings()], cfg({ kind: 'survive', rounds: 3 }))
    expect(pass(s, 2).winner).toBeNull()
  })
  it('Escort is won with the Leader on the goal at the end of the turn', () => {
    const goal = { x: 4, y: 0 }
    const s = world([piece('leader', 'solari', { x: 1, y: 0 }, 'sl', 7), piece('leader', 'umbral', { x: 6, y: 6 }, 'ul')], { ...cfg({ kind: 'escort', goal, limit: 5 }), beacons: [goal] })
    expect(reduce(s, { type: 'move', pieceId: 'sl', to: { x: 3, y: 0 } }).winner).toBeNull()
    expect(reduce(s, { type: 'move', pieceId: 'sl', to: goal }).winner).toBe('solari')
    const near = reduce(world([piece('leader', 'solari', { x: 0, y: 0 }, 'sl', 7), piece('leader', 'umbral', { x: 6, y: 6 }, 'ul')], { ...cfg({ kind: 'escort', goal, limit: 5 }), beacons: [goal] }), { type: 'move', pieceId: 'sl', to: goal })
    expect(near.winner).toBe('solari')
  })
  it('Escort is not won by another piece, and the beacons do not win it', () => {
    const goal = { x: 4, y: 0 }
    const holders = [goal, { x: 0, y: 3 }].map((b, i) => piece('footsoldier', 'solari', b, `h${i}`))
    const s = world([...holders, ...kings()], { ...cfg({ kind: 'escort', goal, limit: 5 }), beacons: [goal, { x: 0, y: 3 }] })
    expect(pass(s).winner).toBeNull()
  })
  it('Escort is lost when the rounds run out', () => {
    const goal = { x: 4, y: 0 }
    const s = world([...kings(), ...wall()], { ...cfg({ kind: 'escort', goal, limit: 2 }), beacons: [goal] })
    expect(pass(s, 3).winner).toBeNull()
    expect(pass(s, 4).winner).toBe('umbral')
  })
  it('Hold is won after the required turns on the square, and the streak resets when it is lost', () => {
    const at = { x: 2, y: 2 }
    const s = world([piece('bruiser', 'solari', at, 'sb', 10), ...kings()], { ...cfg({ kind: 'hold', at, turns: 3, limit: 9 }), beacons: [at] })
    expect(pass(s, 2).streak.solari).toBe(1)
    expect(pass(s, 4).winner).toBeNull()
    expect(pass(s, 5).winner).toBe('solari')
    // The streak is Solari's alone: Umbral holding the square never wins.
    const rival = world([piece('bruiser', 'umbral', at, 'ub', 10), ...kings()], { ...cfg({ kind: 'hold', at, turns: 1, limit: 9 }), beacons: [at] })
    expect(pass(rival, 6).winner).toBeNull()
  })
  it('Hold is lost when the rounds run out', () => {
    const at = { x: 2, y: 2 }
    const s = world([...kings(), ...wall()], { ...cfg({ kind: 'hold', at, turns: 2, limit: 3 }), beacons: [at] })
    expect(pass(s, 5).winner).toBeNull()
    expect(pass(s, 6).winner).toBe('umbral')
  })
})
