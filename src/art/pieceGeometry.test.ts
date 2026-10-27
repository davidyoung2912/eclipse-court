import { describe, expect, it } from 'vitest'
import { lostPanes } from './pieceGeometry'

describe('lostPanes', () => {
  it('greys nothing at full HP and keeps one pane for a living piece', () => {
    expect(lostPanes(5, 5).size).toBe(0)
    expect(lostPanes(1, 20).size).toBe(7)
    expect(lostPanes(0, 5).size).toBe(8)
  })

  it('rounds the coloured share up, so one lost HP of five greys one pane', () => {
    expect(lostPanes(4, 5).size).toBe(1)
    expect(lostPanes(3, 5).size).toBe(3)
  })

  it('greys counter-clockwise from the top and never un-greys a pane as HP falls', () => {
    expect([...lostPanes(4, 5)]).toEqual([5])
    expect([...lostPanes(3, 5)]).toEqual([5, 4, 3])
    for (let hp = 8; hp > 0; hp--) {
      const more = lostPanes(hp - 1, 8)
      for (const i of lostPanes(hp, 8)) expect(more.has(i)).toBe(true)
    }
  })
})
