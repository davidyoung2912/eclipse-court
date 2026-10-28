import { describe, expect, it } from 'vitest'
import { PUZZLES } from './engine/data/puzzles'
import { rushOrder } from './rush'

describe('puzzle rush', () => {
  it('orders every puzzle once, easiest tier first', () => {
    const order = rushOrder(5)
    expect(order).toHaveLength(PUZZLES.length)
    expect(new Set(order).size).toBe(PUZZLES.length)
    const rank = { beginner: 0, normal: 1, expert: 2 } as const
    const tiers = order.map((i) => rank[PUZZLES[i].tier as keyof typeof rank])
    expect(tiers).toEqual([...tiers].sort())
  })
  it('is the same for a seed and differs between seeds', () => {
    expect(rushOrder(3)).toEqual(rushOrder(3))
    expect(rushOrder(3)).not.toEqual(rushOrder(4))
  })
})
