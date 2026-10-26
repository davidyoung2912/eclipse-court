import { describe, expect, it } from 'vitest'
import { newGame } from '../reducer'
import { legalMoves } from './moves'
import type { GameState, Piece, Pos, Role } from './types'

const piece = (role: Role, pos: Pos, court: Piece['court'] = 'solari', id: string = role): Piece => ({
  id, court, role, hp: 5, maxHp: 5, pos, rest: 0, moved: false, bound: false,
})
const world = (...pieces: Piece[]): GameState => ({ ...newGame(), pieces })
const keys = (ps: Pos[]) => ps.map((p) => `${p.x},${p.y}`).sort()

describe('legalMoves', () => {
  it('footsoldier steps one square in any direction', () => {
    const p = piece('footsoldier', { x: 3, y: 3 })
    expect(legalMoves(world(p), p)).toHaveLength(8)
  })
  it('does not step onto friends but may attack enemies', () => {
    const p = piece('footsoldier', { x: 3, y: 3 })
    const friend = piece('flier', { x: 4, y: 3 }, 'solari', 'f')
    const foe = piece('flier', { x: 2, y: 3 }, 'umbral', 'e')
    const moves = keys(legalMoves(world(p, friend, foe), p))
    expect(moves).not.toContain('4,3')
    expect(moves).toContain('2,3')
  })
  it('marksman reaches two squares but is blocked by pieces', () => {
    const p = piece('marksman', { x: 3, y: 3 })
    expect(legalMoves(world(p), p)).toHaveLength(16)
    const block = piece('footsoldier', { x: 4, y: 3 }, 'solari', 'b')
    const moves = keys(legalMoves(world(p, block), p))
    expect(moves).not.toContain('4,3')
    expect(moves).not.toContain('5,3')
  })
  it('flier flies up to 3 squares over pieces', () => {
    const p = piece('flier', { x: 0, y: 0 })
    const block = piece('footsoldier', { x: 1, y: 0 }, 'umbral', 'b')
    const moves = keys(legalMoves(world(p, block), p))
    expect(moves).toContain('1,0')
    expect(moves).toContain('3,0')
    expect(moves).not.toContain('4,0')
  })
  it('charger jumps like a knight', () => {
    const p = piece('charger', { x: 3, y: 3 })
    expect(legalMoves(world(p), p)).toHaveLength(8)
    const corner = piece('charger', { x: 0, y: 0 })
    expect(keys(legalMoves(world(corner), corner))).toEqual(['1,2', '2,1'])
  })
  it('leader teleports to any empty square within 4 and cannot capture', () => {
    const p = piece('leader', { x: 3, y: 3 })
    const foe = piece('footsoldier', { x: 3, y: 4 }, 'umbral', 'e')
    const moves = keys(legalMoves(world(p, foe), p))
    expect(moves).not.toContain('3,4')
    expect(moves).toContain('3,6')
    expect(moves).toContain('0,2')
    expect(moves).not.toContain('0,0')
  })
})
