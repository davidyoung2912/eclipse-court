import { describe, expect, it } from 'vitest'
import { LINE_BANKS } from './engine/data/personaLines'
import { PERSONAS } from './engine/data/personas'
import { recordLine } from './personaMenu'
import { bumpHead, parsePersonaRecord, personaRecordSnapshot, recordPersonaGame, variantFor, type Head } from './personaRecord'

const head = (w: number, d: number, l: number, last: Head['last']): Head => ({ w, d, l, last })

describe('parsePersonaRecord', () => {
  it('repairs damaged data and drops unknown personas and empty heads', () => {
    expect(parsePersonaRecord(null)).toEqual({})
    expect(parsePersonaRecord({ cassia: { w: 2, d: -1, l: 'x', last: 'q' }, nobody: { w: 4 }, pym: { w: 0, d: 0, l: 0 }, bea: 5 }))
      .toEqual({ cassia: { w: 2, d: 0, l: 0, last: null } })
  })
})

describe('variantFor', () => {
  it('chooses a bank by the head-to-head record', () => {
    expect(variantFor(undefined, 'greet')).toBe('meet')
    expect(variantFor(head(0, 0, 0, null), 'briefing')).toBe('meet')
    expect(variantFor(head(3, 0, 1, 'l'), 'greet')).toBe('grudge')
    expect(variantFor(head(3, 0, 1, 'w'), 'greet')).toBe('ahead')
    expect(variantFor(head(1, 0, 3, 'w'), 'briefing')).toBe('behind')
    expect(variantFor(head(2, 1, 2, 'd'), 'greet')).toBe('greet')
    expect(variantFor(head(2, 1, 2, 'w'), 'briefing')).toBe('briefing')
  })
})

describe('recording', () => {
  it('counts results and keeps the latest', () => {
    const h = bumpHead(bumpHead(undefined, 'w'), 'l')
    expect(h).toEqual({ w: 1, d: 0, l: 1, last: 'l' })
  })

  it('drives the greeting from the stored record', () => {
    const meet = new Set(LINE_BANKS.mudge.meet)
    expect(meet.has(recordLine('mudge', 'greet', 'k'))).toBe(true)
    recordPersonaGame('mudge', 'l')
    expect(personaRecordSnapshot().mudge).toEqual({ w: 0, d: 0, l: 1, last: 'l' })
    expect(new Set(LINE_BANKS.mudge.grudge).has(recordLine('mudge', 'briefing', 'k'))).toBe(true)
    recordPersonaGame('mudge', 'w')
    recordPersonaGame('mudge', 'w')
    expect(new Set(LINE_BANKS.mudge.ahead).has(recordLine('mudge', 'greet', 'k'))).toBe(true)
  })

  it('has lines for every persona and variant', () => {
    for (const p of PERSONAS) for (const c of ['meet', 'ahead', 'behind', 'grudge'] as const) expect(LINE_BANKS[p.id][c].length).toBeGreaterThanOrEqual(6)
  })
})
