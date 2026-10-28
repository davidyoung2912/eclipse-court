import { describe, expect, it } from 'vitest'
import { CAPTURE_FX, COSMETICS, cosmeticKey, cosmeticsOf, defaultOf, KINDS, VOICES } from './engine/data/cosmetics'
import { THEMES } from './settings'
import { buy, earnShards, equip, equippedId, owns, parseShop, shardsForGame, shopSnapshot, type Earning } from './shop'

const win: Earning = { won: true, draw: false, difficulty: 'normal', firstClear: false, campaign: false, scenario: false, dailyScored: false, achievements: 0 }

describe('cosmetics catalog', () => {
  it('has unique ids per kind and a free default for each', () => {
    expect(new Set(COSMETICS.map(cosmeticKey)).size).toBe(COSMETICS.length)
    for (const kind of KINDS.filter((k) => k !== 'theme')) expect(cosmeticsOf(kind).filter((c) => c.cost === 0 && !c.goals)).toHaveLength(1)
    expect(defaultOf('sound')).toBe('classic')
  })

  it('backs every cosmetic with a theme, voice or effect', () => {
    for (const c of cosmeticsOf('theme')) expect(THEMES.find((t) => t.id === c.id)?.cost, c.id).toBe(c.cost)
    for (const c of cosmeticsOf('sound')) expect(VOICES[c.id], c.id).toBeDefined()
    for (const c of cosmeticsOf('capture')) expect(CAPTURE_FX[c.id], c.id).toBeDefined()
  })
})

describe('shop', () => {
  it('repairs damaged data', () => {
    expect(parseShop(null)).toEqual({ shards: 0, earned: 0, owned: [], equipped: {} })
    const s = parseShop({ shards: -4, owned: ['pieces:gilded', 'pieces:gilded', 'nope', 'sound:classic'], equipped: { pieces: 'jade', sound: 'classic', theme: 'obsidian' } })
    expect(s.shards).toBe(0)
    expect(s.owned).toEqual(['pieces:gilded'])
    expect(s.equipped).toEqual({ sound: 'classic' })
  })

  it('earns, buys and equips', () => {
    const gilded = COSMETICS.find((c) => c.id === 'gilded')!
    expect(buy(gilded)).toBe(false)
    earnShards(gilded.cost + 5)
    expect(shopSnapshot().earned).toBe(gilded.cost + 5)
    expect(equip(gilded)).toBe(false)
    expect(buy(gilded)).toBe(true)
    expect(shopSnapshot().shards).toBe(5)
    expect(buy(gilded)).toBe(false)
    expect(owns(gilded)).toBe(true)
    expect(equip(gilded)).toBe(true)
    expect(equippedId('pieces')).toBe('gilded')
    expect(equip(cosmeticsOf('pieces')[0])).toBe(true)
    expect(equippedId('pieces')).toBe('classic')
  })
})

describe('shardsForGame', () => {
  it('pays more for harder opponents and first clears', () => {
    expect(shardsForGame({ ...win, difficulty: 'hard' })).toBeGreaterThan(shardsForGame({ ...win, difficulty: 'easy' }))
    expect(shardsForGame({ ...win, campaign: true, firstClear: true })).toBeGreaterThan(shardsForGame({ ...win, campaign: true }))
  })

  it('still pays a little for a loss, and for achievements and the daily', () => {
    expect(shardsForGame({ ...win, won: false })).toBeGreaterThan(0)
    expect(shardsForGame({ ...win, achievements: 2 })).toBe(shardsForGame(win) + 20)
    expect(shardsForGame({ ...win, dailyScored: true })).toBeGreaterThan(shardsForGame(win))
  })
})
