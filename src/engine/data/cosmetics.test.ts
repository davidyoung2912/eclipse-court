import { describe, expect, it } from 'vitest'
import { COSMETICS, rarityOf } from './cosmetics'

describe('rarityOf', () => {
  it('ranks free as common, earned as legend and sold by price', () => {
    expect(rarityOf({ cost: 0 })).toBe('common')
    expect(rarityOf({ cost: 80 })).toBe('uncommon')
    expect(rarityOf({ cost: 150 })).toBe('rare')
    expect(rarityOf({ cost: 340 })).toBe('epic')
    expect(rarityOf({ cost: 0, goals: 6 })).toBe('legend')
  })

  it('gives every cosmetic a rarity', () => {
    for (const c of COSMETICS) expect(rarityOf(c)).toBeTruthy()
  })
})
