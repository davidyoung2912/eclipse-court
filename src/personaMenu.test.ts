import { describe, expect, it } from 'vitest'
import { LINE_BANKS } from './engine/data/personaLines'
import { PERSONAS } from './engine/data/personas'
import { farewellLine, ladderVoice, menuLine, personaOfTheDay, resolvePersona, rivalLine } from './personaMenu'

describe('menuLine', () => {
  it('is stable for a key and always comes from the bank', () => {
    for (const p of PERSONAS) {
      const line = menuLine(p.id, 'greet', '20261028')
      expect(line).toBe(menuLine(p.id, 'greet', '20261028'))
      expect(LINE_BANKS[p.id].greet).toContain(line)
    }
  })
})

describe('resolvePersona', () => {
  it('maps none, a fixed choice and a random one', () => {
    expect(resolvePersona('none', 1)).toBeUndefined()
    expect(resolvePersona('quill', 1)).toBe('quill')
    expect(PERSONAS.map((p) => p.id)).toContain(resolvePersona('random', 99))
    expect(resolvePersona('random', 5)).toBe(resolvePersona('random', 5))
  })
})

describe('personaOfTheDay', () => {
  it('changes each day and cycles through everyone', () => {
    expect(personaOfTheDay(20261028).id).not.toBe(personaOfTheDay(20261029).id)
    const seen = new Set(Array.from({ length: 8 }, (_, i) => personaOfTheDay(20261001 + i).id))
    expect(seen.size).toBe(8)
  })
})

describe('rivals and farewells', () => {
  it('gives each persona style a voice', () => {
    expect(ladderVoice('guardian')).toBe('bea')
    expect(ladderVoice('turtle')).toBe('mudge')
  })
  it('uses briefing lines before a first meeting and rematch lines after', () => {
    expect(LINE_BANKS.bea.briefing).toContain(rivalLine('bea', 'x', undefined))
    expect(LINE_BANKS.bea.rematch).toContain(rivalLine('bea', 'x', { w: 1, d: 0, l: 0 }))
  })
  it('speaks from the persona side of the result', () => {
    expect(LINE_BANKS.pym.win).toContain(farewellLine('pym', 'solari', 'umbral', 'k')!)
    expect(LINE_BANKS.pym.lose).toContain(farewellLine('pym', 'umbral', 'umbral', 'k')!)
    expect(LINE_BANKS.pym.draw).toContain(farewellLine('pym', 'draw', 'umbral', 'k')!)
    expect(farewellLine('pym', null, 'umbral', 'k')).toBeNull()
  })
})
