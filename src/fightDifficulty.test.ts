import { describe, expect, it } from 'vitest'
import { FIGHT_TUNING, tuneCells } from './fightDifficulty'

describe('fight difficulty', () => {
  it('leaves normal fights untouched', () => {
    expect(tuneCells(undefined, 0, FIGHT_TUNING.normal)).toBeUndefined()
  })

  it('helps the human side on easy and hinders it on hard', () => {
    const easy = tuneCells(undefined, 1, FIGHT_TUNING.easy)!
    expect(easy.defender.dealt).toBeGreaterThan(1)
    expect(easy.defender.taken).toBeLessThan(1)
    expect(easy.attacker).toEqual({ dealt: 1, taken: 1 })
    const hard = tuneCells(undefined, 0, FIGHT_TUNING.hard)!
    expect(hard.attacker.dealt).toBeLessThan(1)
    expect(hard.attacker.taken).toBeGreaterThan(1)
  })

  it('stacks with a cell effect', () => {
    const t = tuneCells({ attacker: { dealt: 1.5, taken: 1 }, defender: { dealt: 1, taken: 0 } }, 0, FIGHT_TUNING.easy)!
    expect(t.attacker.dealt).toBeCloseTo(1.875)
    expect(t.defender).toEqual({ dealt: 1, taken: 0 })
  })
})
