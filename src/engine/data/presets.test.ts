import { describe, expect, it } from 'vitest'
import { aiLoadout } from '../../ai/draft'
import { checkInvariants, playGame } from '../../sim/game'
import { newGame } from '../reducer'
import { matchesPreset, PRESETS, skirmishConfig } from './setups'

describe('presets', () => {
  it('have unique ids and sane fields', () => {
    expect(new Set(PRESETS.map((p) => p.id)).size).toBe(PRESETS.length)
    for (const p of PRESETS) {
      expect(p.text.length).toBeGreaterThan(0)
      expect(p.stars).toBeGreaterThanOrEqual(0)
    }
  })

  it('make a valid config that matches themselves and no other', () => {
    for (const p of PRESETS) {
      const choice = { mode: 'classic' as const, board: 'classic', ...p.rules }
      const config = skirmishConfig(choice, 'solari', 5)
      expect(() => newGame(config)).not.toThrow()
      expect(matchesPreset(choice, p)).toBe(true)
      for (const other of PRESETS) if (other !== p) expect(matchesPreset(choice, other)).toBe(false)
      expect(matchesPreset({ ...choice, reverse: !choice.reverse }, p)).toBe(false)
    }
  })

  it('finish a soak-test game', () => {
    for (const p of PRESETS) {
      const config = skirmishConfig({ mode: 'classic', board: 'classic', ...p.rules }, 'solari', 9)
      const r = playGame(9, 'normal', 'normal', 600, { ...config, loadouts: { solari: aiLoadout(9, 'solari'), umbral: aiLoadout(10, 'umbral') } })
      expect(r.problems).toEqual([])
      expect(r.state.winner).not.toBeNull()
      expect(checkInvariants(r.state)).toEqual([])
    }
  }, 120_000)
})
