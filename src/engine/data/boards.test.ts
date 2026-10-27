import { describe, expect, it } from 'vitest'
import { isBlocked, isBeacon, samePos } from '../rules/board'
import { cellsSymmetric } from '../rules/cells'
import { newGame } from '../reducer'
import { BOARDS } from './boards'
import { skirmishConfig } from './setups'

describe('boards', () => {
  it('place cells mirror-symmetrically, off walls and beacons,', () => {
    for (const board of BOARDS) {
      const cells = board.cells ?? []
      expect(cellsSymmetric(cells), board.id).toBe(true)
      for (const c of cells) {
        expect(isBlocked(board, c.pos), board.id).toBe(false)
        expect(cells.filter((o) => samePos(o.pos, c.pos)), board.id).toHaveLength(1)
      }
    }
  })

  it('keep cells off the starting armies, and off beacons except the centre pulse', () => {
    for (const board of BOARDS)
      for (const c of board.cells ?? []) {
        expect(c.pos.x >= 2 && c.pos.x <= 4, board.id).toBe(true)
        if (isBeacon(c.pos, board.beacons)) expect(c.effect).toBe('invincible')
      }
  })

  it('carry the cells into a new game', () => {
    for (const board of BOARDS.filter((b) => b.cells)) {
      const g = newGame(skirmishConfig({ mode: 'classic', board: board.id }, 'solari', 1))
      expect(g.config.cells).toEqual(board.cells)
      expect(g.pieces.some((p) => (board.cells ?? []).some((c) => samePos(c.pos, p.pos)))).toBe(false)
    }
  })
})
