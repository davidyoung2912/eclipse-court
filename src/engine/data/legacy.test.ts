import { describe, expect, it } from 'vitest'
import { newGame } from '../reducer'
import { VETERAN_WINS } from '../rules/growth'
import { validConfig } from '../serialize'
import { aiDraft } from './aiDraft'
import { CLASSIC_ROLES } from './draft'
import { startRun } from './gauntlet'
import { legacyOf, legacyPower, legacyRoles, withLegacy } from './legacy'
import { ROLE_STATS } from './roster'
import { skirmishConfig, type SetupChoice } from './setups'
import { readLegacy } from '../../legacy'

const veteranRun = () => {
  const run = startRun('solari', CLASSIC_ROLES, 3, { relic: 'banner' })
  run.army[0] = { ...run.army[0], wins: VETERAN_WINS, bonus: 2, perk: 'might' }
  return run
}

describe('legacy army', () => {
  it('needs a veteran to be kept', () => {
    expect(legacyOf(startRun('solari', CLASSIC_ROLES, 3))).toBeNull()
    expect(legacyOf(veteranRun())).not.toBeNull()
  })

  it('ranks a stronger army higher', () => {
    const plain = startRun('solari', CLASSIC_ROLES, 3)
    expect(legacyPower(legacyOf(veteranRun())!)).toBeGreaterThan(legacyPower({ ...legacyOf(veteranRun())!, army: plain.army, relics: [] }))
  })

  it('round-trips through storage reading and rejects damage', () => {
    const l = legacyOf(veteranRun())!
    expect(readLegacy(JSON.parse(JSON.stringify(l)))).toEqual(l)
    expect(readLegacy({ ...l, relics: ['nope'] })).toBeNull()
    expect(readLegacy(null)).toBeNull()
  })

  it('starts a skirmish with the carried pieces, relics and growth', () => {
    const l = legacyOf(veteranRun())!
    const choice: SetupChoice = { mode: 'legacy', board: 'classic', legacy: l }
    const config = skirmishConfig(choice, 'solari', 5, { roles: aiDraft(5, 'normal') })
    expect(validConfig(config)).toBe(true)
    expect(config.growth).toBe(true)
    expect(config.promotion).toBe(true)
    const state = withLegacy(newGame(config), l, 'solari')
    const mine = state.pieces.filter((p) => p.court === 'solari')
    expect(mine.map((p) => p.role).sort()).toEqual(['leader', ...legacyRoles(l)].sort())
    const first = mine.find((p) => p.perk === 'might')!
    expect(first.role).toBe(l.army[0].role)
    expect(first.maxHp).toBe(ROLE_STATS[first.role].hp + 2 + 1)
    expect(first.hp).toBe(first.maxHp)
    expect(first.wins).toBe(VETERAN_WINS)
    // The foe is left alone.
    expect(state.pieces.filter((p) => p.court === 'umbral').every((p) => !p.perk)).toBe(true)
  })

  it('falls back to the classic army with no legacy to bring', () => {
    const config = skirmishConfig({ mode: 'legacy', board: 'classic' }, 'solari', 5)
    expect(config.setup).toBe('classic')
  })
})
