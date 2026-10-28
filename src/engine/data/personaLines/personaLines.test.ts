import { describe, expect, it } from 'vitest'
import { PERSONAS } from '../personas'
import { LINES_PER_CATEGORY_MIN, LINES_TOTAL_MIN, LINE_BANKS, LINE_CATEGORIES, LINE_MAX, personaLines } from '.'

const written = Object.entries(LINE_BANKS)

describe('persona line banks', () => {
  it('has a bank for every persona, and only for real personas', () => {
    for (const [id] of written) expect(PERSONAS.some((p) => p.id === id)).toBe(true)
    for (const p of PERSONAS) expect(LINE_BANKS[p.id]).toBeDefined()
    expect(written).toHaveLength(8)
  })

  it.each(written)('%s covers every category with enough lines', (_id, bank) => {
    expect(Object.keys(bank).sort()).toEqual([...LINE_CATEGORIES].sort())
    for (const c of LINE_CATEGORIES) expect(bank[c].length).toBeGreaterThanOrEqual(LINES_PER_CATEGORY_MIN)
    expect(LINE_CATEGORIES.reduce((n, c) => n + bank[c].length, 0)).toBeGreaterThanOrEqual(LINES_TOTAL_MIN)
  })

  it.each(written)('%s has no empty, overlong, or repeated lines', (_id, bank) => {
    const all = LINE_CATEGORIES.flatMap((c) => bank[c])
    for (const line of all) {
      expect(line.trim()).toBe(line)
      expect(line.length).toBeGreaterThan(0)
      expect(line.length).toBeLessThanOrEqual(LINE_MAX)
    }
    expect(new Set(all).size).toBe(all.length)
  })

  it('reads a category for any persona', () => {
    for (const p of PERSONAS) expect(personaLines(p.id, 'win').length).toBeGreaterThan(0)
  })
})
