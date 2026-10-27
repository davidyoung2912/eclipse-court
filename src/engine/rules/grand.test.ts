import { describe, expect, it } from 'vitest'
import { GRAND_BOARDS } from '../data/boards'
import { grandConfig } from '../data/matchConfig'
import { cellsSymmetric } from './cells'
import { newGame } from '../reducer'
import { isBeacon, isBlocked, samePos } from './board'
import { legalMoves } from './moves'
import type { GameState, Piece, Pos, Role } from './types'

const piece = (role: Role, pos: Pos, court: Piece['court'] = 'solari', id: string = role): Piece => ({
  id, court, role, hp: 5, maxHp: 5, pos, rest: 0, moved: false, bound: false,
})
const world = (...pieces: Piece[]): GameState => ({ ...newGame(grandConfig()), pieces })

describe('the Grand army', () => {
  it('fields sixteen pieces a side, mirrored, on the 9x9 board', () => {
    const g = newGame(grandConfig())
    expect(g.pieces.filter((p) => p.court === 'solari')).toHaveLength(16)
    expect(g.pieces.filter((p) => p.court === 'umbral')).toHaveLength(16)
    expect(g.pieces.every((p) => p.pos.x >= 0 && p.pos.x <= 8 && p.pos.y >= 0 && p.pos.y <= 8)).toBe(true)
    expect(new Set(g.pieces.map((p) => `${p.pos.x},${p.pos.y}`)).size).toBe(32)
    for (const p of g.pieces.filter((q) => q.court === 'solari'))
      expect(g.pieces.some((q) => q.court === 'umbral' && q.role === p.role && q.pos.x === 8 - p.pos.x && q.pos.y === p.pos.y)).toBe(true)
  })
})

describe('Grand move ranges', () => {
  // Phase 0 puts the centre in deep dark (-2): Umbral's light, not Solari's.
  it('lets footsoldiers step two squares, and three for the court the light favours', () => {
    const solari = piece('footsoldier', { x: 4, y: 4 })
    const umbral = piece('footsoldier', { x: 4, y: 4 }, 'umbral')
    expect(legalMoves(world(solari), solari)).toHaveLength(16)
    expect(legalMoves(world(umbral), umbral)).toHaveLength(24)
  })
  it('gives the light bonus only on the 9x9 board', () => {
    const p = piece('footsoldier', { x: 3, y: 3 }, 'umbral')
    expect(legalMoves({ ...newGame(), pieces: [p] }, p)).toHaveLength(8)
  })
  it('lets marksmen reach three squares and the Leader teleport five', () => {
    const m = piece('marksman', { x: 1, y: 4 })
    expect(legalMoves(world(m), m).some((q) => q.x === 4 && q.y === 4)).toBe(true)
    expect(legalMoves(world(m), m).some((q) => q.x === 5 && q.y === 5)).toBe(false)
    const l = piece('leader', { x: 0, y: 4 })
    const spots = legalMoves(world(l), l)
    expect(spots.some((q) => q.x === 5 && q.y === 4)).toBe(true)
    expect(spots.some((q) => q.x === 6 && q.y === 4)).toBe(false)
    expect(spots.every((q) => Math.abs(q.x) + Math.abs(q.y - 4) <= 5)).toBe(true)
  })
})

describe('Grand boards', () => {
  it('carry symmetric walls and cells, clear of the armies and beacons', () => {
    for (const board of GRAND_BOARDS) {
      const g = newGame(grandConfig({}, board.id))
      expect(cellsSymmetric(board.cells ?? [], 9), board.id).toBe(true)
      for (const b of board.blocked) expect(board.blocked.some((o) => samePos(o, { x: 8 - b.x, y: b.y })), board.id).toBe(true)
      for (const b of board.blocked) expect(isBeacon(b, board.beacons), board.id).toBe(false)
      for (const c of board.cells ?? [])
        expect(g.pieces.some((p) => samePos(p.pos, c.pos)) || isBlocked(board, c.pos) || (isBeacon(c.pos, board.beacons) && c.effect !== 'invincible'), board.id).toBe(false)
      expect(g.pieces.some((p) => isBlocked(board, p.pos)), board.id).toBe(false)
    }
  })
})
