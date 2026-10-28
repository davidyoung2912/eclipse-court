import { describe, expect, it } from 'vitest'
import { NAME_MAX, PERSONAS, TAG_MAX, personaById, personaStyle } from './personas'
import { PERSONALITIES } from './personality'

describe('personas', () => {
  it('has eight, each with its own id and name', () => {
    expect(PERSONAS).toHaveLength(8)
    expect(new Set(PERSONAS.map((p) => p.id)).size).toBe(8)
    expect(new Set(PERSONAS.map((p) => p.name)).size).toBe(8)
  })

  it('keeps names and tags short enough for a bubble or a button', () => {
    for (const p of PERSONAS) {
      expect(p.name.length).toBeGreaterThan(0)
      expect(p.name.length).toBeLessThanOrEqual(NAME_MAX)
      expect(p.tag.length).toBeGreaterThan(0)
      expect(p.tag.length).toBeLessThanOrEqual(TAG_MAX)
    }
  })

  it('builds each on a real play style', () => {
    for (const p of PERSONAS) expect(PERSONALITIES[p.personality]).toBeDefined()
  })

  it('spreads across the courts, the Marches and the Hour', () => {
    const count = (house: string) => PERSONAS.filter((p) => p.house === house).length
    expect([count('solari'), count('umbral'), count('marches'), count('hour')]).toEqual([3, 3, 1, 1])
  })

  it('finds a persona by id', () => {
    expect(personaById('mudge')?.name).toBe('Mudge')
    expect(personaById('nobody')).toBeUndefined()
  })

  it('plays a persona as its style, nudged by its tweak', () => {
    const plain = personaStyle(personaById('cassia')!)
    expect(plain).toEqual(PERSONALITIES.rusher)
    const digby = personaStyle(personaById('digby')!)
    expect(digby.attack).toBe(PERSONALITIES.rusher.attack)
    expect(digby.guard).toBeLessThan(PERSONALITIES.rusher.guard)
    expect(digby.beacon).toBe(PERSONALITIES.rusher.beacon)
  })
})
