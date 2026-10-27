import { describe, expect, it } from 'vitest'
import { actLabel, CHAPTERS, CHARACTERS, chapterById } from '.'

describe('story data', () => {
  it('gives every chapter a unique id, title, blurb and some beats', () => {
    expect(new Set(CHAPTERS.map((c) => c.id)).size).toBe(CHAPTERS.length)
    for (const c of CHAPTERS) {
      expect(c.title.length).toBeGreaterThan(0)
      expect(c.blurb.length).toBeGreaterThan(0)
      expect(c.beats.length).toBeGreaterThan(0)
      expect(chapterById(c.id)).toBe(c)
    }
  })

  it('has only speakers from the cast and no empty lines', () => {
    for (const c of CHAPTERS)
      for (const b of c.beats) {
        expect(b.text.trim().length).toBeGreaterThan(0)
        if (b.kind === 'say') expect(CHARACTERS[b.who]).toBeDefined()
      }
  })

  it('keys each character by its own id', () => {
    for (const [id, c] of Object.entries(CHARACTERS)) expect(c.id).toBe(id)
  })

  it('labels acts', () => {
    expect(actLabel('prologue')).toBe('Prologue')
    expect(actLabel(2)).toBe('Act 2')
  })
})
