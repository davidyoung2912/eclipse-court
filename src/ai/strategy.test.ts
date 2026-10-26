import { describe, expect, it } from 'vitest'
import { newGame, reduce } from '../engine/reducer'
import { ROLE_STATS } from '../engine/data/roster'
import type { GameState, Piece } from '../engine/rules/types'
import { legalMoves } from '../engine/rules/moves'
import { chooseAction, evaluate } from './strategy'
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

  it('takes a free capture of a valuable piece', () => {
    const s: GameState = {
      ...newGame(1),
      pieces: [lone('a', 'solari', 'bruiser', 2, 2), lone('b', 'umbral', 'marksman', 3, 2), lone('c', 'umbral', 'footsoldier', 6, 6)],
    }
    const a = chooseAction(s, 'hard', 1)
    expect(a).toEqual({ type: 'move', pieceId: 'a', to: { x: 3, y: 2 } })
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
