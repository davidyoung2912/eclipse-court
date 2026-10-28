import { existsSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { PERSONAS } from './engine/data/personas'

describe('persona pictures', () => {
  it('has a public/personas/<id>.webp for every persona', () => {
    for (const p of PERSONAS) expect(existsSync(`public/personas/${p.id}.webp`), p.id).toBe(true)
  })
})
