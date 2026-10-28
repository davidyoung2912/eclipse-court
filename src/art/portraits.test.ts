import { describe, expect, it } from 'vitest'
import { CHARACTERS } from '../engine/data/story'
import { BOSSES } from '../engine/data/bosses'
import { PERSONAS } from '../engine/data/personas'
import { bossPortrait, characterPortrait, personaPortrait, PORTRAITS } from './portraits'

describe('portraits', () => {
  it('has a window for every named character', () => {
    for (const id of Object.keys(CHARACTERS) as (keyof typeof CHARACTERS)[]) expect(PORTRAITS[characterPortrait(id)]).toBeDefined()
  })

  it('has a window for every boss, and none for an ordinary foe', () => {
    for (const b of BOSSES) expect(bossPortrait(b.id)).toBe(b.id)
    expect(bossPortrait('squire-1')).toBeNull()
  })

  it('has a window for every persona', () => {
    for (const p of PERSONAS) expect(PORTRAITS[personaPortrait(p.id)]).toBeDefined()
  })

  it('gives every window three glass colours and some gear', () => {
    for (const spec of Object.values(PORTRAITS)) {
      expect(spec.glass).toHaveLength(3)
      expect(spec.gear.length).toBeGreaterThan(0)
    }
  })
})
