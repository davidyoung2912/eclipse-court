import { describe, expect, it } from 'vitest'
import { newGame, reduce } from '../engine/reducer'
import { ROLE_STATS } from '../engine/data/roster'
import type { GameState, Piece } from '../engine/rules/types'
import { legalMoves } from '../engine/rules/moves'
import { chooseAction, evaluate } from './strategy'
import { PERSONALITIES, temper } from '../engine/data/personality'
import { DIFFICULTY_LIST } from './profile'

const isLegal = (s: GameState, a: ReturnType<typeof chooseAction>) => {
  if (a.type !== 'move') return true
  const p = s.pieces.find((x) => x.id === a.pieceId)
  return !!p && p.court === s.turn && legalMoves(s, p).some((m) => m.x === a.to.x && m.y === a.to.y)
}

const lone = (id: string, court: Piece['court'], role: Piece['role'], x: number, y: number): Piece => ({
  id, court, role, hp: ROLE_STATS[role].hp, maxHp: ROLE_STATS[role].hp, pos: { x, y }, rest: 0, moved: false, bound: false,
})

describe('strategy', () => {
  it('returns a legal action at every difficulty, deterministically', () => {
    for (const d of DIFFICULTY_LIST) {
      const s = newGame(7)
      const a = chooseAction(s, d, 3)
      expect(isLegal(s, a)).toBe(true)
      expect(chooseAction(s, d, 3)).toEqual(a)
    }
  })

  it('takes a capture the matchup table says is safe', () => {
    const s: GameState = {
      ...newGame(1),
      pieces: [lone('a', 'solari', 'bruiser', 0, 2), lone('b', 'umbral', 'footsoldier', 1, 2), lone('c', 'umbral', 'footsoldier', 6, 6)],
    }
    const a = chooseAction(s, 'hard', 1)
    expect(a).toEqual({ type: 'move', pieceId: 'a', to: { x: 1, y: 2 } })
  })

  it('scores a won position above everything else', () => {
    const s = { ...newGame(1), winner: 'solari' as const }
    expect(evaluate(s, 'solari')).toBeGreaterThan(1000)
    expect(evaluate(s, 'umbral')).toBeLessThan(-1000)
  })

  it('plays long stretches of a game without illegal moves', () => {
    const turns = { easy: 120, normal: 40, hard: 8 }
    for (const d of DIFFICULTY_LIST) {
      let s = newGame(11)
      for (let turn = 0; turn < turns[d] && !s.winner; turn++) {
        const a = chooseAction(s, d, turn)
        expect(isLegal(s, a)).toBe(true)
        s = reduce(s, a)
      }
      expect(s.round >= turns[d] / 2 || !!s.winner).toBe(true)
    }
  }, 60_000)

  it('hard search stays fast enough for a phone', () => {
    const s = newGame(2)
    const t0 = performance.now()
    chooseAction(s, 'hard', 1)
    expect(performance.now() - t0).toBeLessThan(1500)
  })
})

describe('strategy with cells', () => {
  type Fx = 'might' | 'hazard' | 'silence' | 'recovery'
  const withCells = (cells: { pos: { x: number; y: number }; effect: Fx }[], pieces: Piece[]): GameState => {
    const g = newGame(1)
    return { ...g, config: { ...g.config, cells }, pieces }
  }
  const alone = [lone('l', 'solari', 'leader', 0, 0), lone('u', 'umbral', 'leader', 6, 6)]

  it('values Hazard and Silence below an empty cell and Might above it', () => {
    const at = (effect: Fx) => evaluate(withCells([{ pos: { x: 0, y: 0 }, effect }], alone), 'solari')
    const plain = evaluate(withCells([], alone), 'solari')
    expect(at('hazard')).toBeLessThan(plain)
    expect(at('silence')).toBeLessThan(plain)
    expect(at('might')).toBeGreaterThan(plain)
  })

  it('values Recovery more for a wounded piece', () => {
    const hurt = { ...lone('f', 'solari', 'bruiser', 2, 0), hp: 2 }
    const fit = lone('f', 'solari', 'bruiser', 2, 0)
    const gain = (p: Piece) => {
      const cells = [{ pos: { x: 2, y: 0 }, effect: 'recovery' as const }]
      return evaluate(withCells(cells, [...alone, p]), 'solari') - evaluate(withCells([], [...alone, p]), 'solari')
    }
    expect(gain(hurt)).toBeGreaterThan(gain(fit))
  })

  it('stays legal and deterministic on every cell board', async () => {
    const { BOARDS } = await import('../engine/data/boards')
    for (const b of BOARDS.filter((x) => x.cells)) {
      let s = newGame({ beacons: b.beacons, blocked: b.blocked, cells: b.cells })
      for (let turn = 0; turn < 12 && !s.winner; turn++) {
        const a = chooseAction(s, 'normal', turn)
        expect(isLegal(s, a)).toBe(true)
        expect(chooseAction(s, 'normal', turn)).toEqual(a)
        s = reduce(s, a)
      }
    }
  }, 60_000)
})

describe('character', () => {
  it('tempers a Grandmaster\'s style and still returns legal actions for the new personalities', () => {
    const s = newGame(3)
    for (const id of ['baiter', 'guardian'] as const)
      for (const level of ['normal', 'grandmaster'] as const) expect(chooseAction(s, level, 7, id).type).toMatch(/move|cast|pass/)
    expect(temper(PERSONALITIES.rusher, 1)).toMatchObject({ attack: 1, guard: 1, beacon: 1 })
    expect(temper(PERSONALITIES.rusher, 0).attack).toBe(PERSONALITIES.rusher.attack)
  })
})
