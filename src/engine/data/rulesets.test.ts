import { describe, expect, it } from 'vitest'
import { decodeRecord, encodeRecord } from '../serialize'
import { checkInvariants, playGame } from '../../sim/game'
import { newGame } from '../reducer'
import { CLASSIC_RULES_SPELLS, RULESETS, rulesetById, skirmishConfig, type SetupChoice } from './setups'
import { loadoutOf } from '../rules/spells'

const choiceOf = (id: string): SetupChoice => ({ mode: 'classic', board: 'classic', ...rulesetById(id)!.rules })

describe('rulesets', () => {
  it('have unique ids, text and valid configs', () => {
    expect(new Set(RULESETS.map((r) => r.id)).size).toBe(3)
    for (const r of RULESETS) {
      expect(r.text.length).toBeGreaterThan(0)
      expect(() => newGame(skirmishConfig(choiceOf(r.id), 'solari', 5))).not.toThrow()
    }
  })

  it('Classic keeps three spells, no passives and no showdown, for both courts', () => {
    const config = skirmishConfig(choiceOf('classic'), 'umbral', 5)
    expect(config.passives).toBe(false)
    expect(config.showdown).toBeFalsy()
    expect(loadoutOf(config, 'solari')).toEqual(CLASSIC_RULES_SPELLS)
    expect(loadoutOf(config, 'umbral')).toEqual(CLASSIC_RULES_SPELLS)
    expect(newGame(config).spells.solari).toEqual(CLASSIC_RULES_SPELLS)
  })

  it('Classic ignores a chosen loadout', () => {
    const config = skirmishConfig({ ...choiceOf('classic'), loadout: ['hold', 'exchange', 'mirror', 'blink'] }, 'solari', 5)
    expect(loadoutOf(config, 'solari')).toEqual(CLASSIC_RULES_SPELLS)
  })

  it('Standard is the full game and Advanced locks nothing', () => {
    const config = skirmishConfig(choiceOf('standard'), 'solari', 5)
    expect(config.passives).toBe(true)
    expect(config.loadouts).toBeUndefined()
    expect(config.showdown).toBe(true)
    expect(rulesetById('advanced')!.locks).toEqual([])
    expect(RULESETS.filter((r) => r.presets).map((r) => r.id)).toEqual(['advanced'])
  })

  it('survive a share-code round trip', () => {
    for (const r of RULESETS) {
      const initial = newGame(skirmishConfig(choiceOf(r.id), 'solari', 7))
      const back = decodeRecord(encodeRecord({ initial, actions: [] }))
      expect(back?.initial.config).toEqual(initial.config)
    }
  })

  it('leave a config without the new fields as it was', () => {
    const config = skirmishConfig({ mode: 'classic', board: 'classic' }, 'solari', 5)
    expect(config.passives).toBe(true)
    expect(config.loadouts).toBeUndefined()
  })

  it('finish a soak-test game each', () => {
    for (const r of RULESETS) {
      for (const seed of [3, 11]) {
        const result = playGame(seed, 'normal', 'normal', 600, skirmishConfig(choiceOf(r.id), 'solari', seed))
        expect(result.problems).toEqual([])
        expect(result.state.winner).not.toBeNull()
        expect(checkInvariants(result.state)).toEqual([])
      }
    }
  }, 180_000)
})
