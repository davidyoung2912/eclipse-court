import { describe, expect, it } from 'vitest'
import { CLASSIC_ROLES, DRAFT_ROLES, draftProblem, ROLE_MAX } from './draft'
import { ALL_SPELLS, CLASSIC_SPELLS } from '../rules/spells'
import { nextRoleStars, roleLimit, spellUnlocked } from './unlocks'

describe('unlocks', () => {
  it('always open the classic spells and the classic army', () => {
    for (const s of CLASSIC_SPELLS) expect(spellUnlocked(0, s), s).toBe(true)
    for (const r of DRAFT_ROLES) expect(roleLimit(r, 0), r).toBe(CLASSIC_ROLES.filter((x) => x === r).length)
    expect(draftProblem(CLASSIC_ROLES)).toBeNull()
  })

  it('open every spell and role limit with enough stars, never beyond the rules', () => {
    for (const s of ALL_SPELLS) expect(spellUnlocked(24, s), s).toBe(true)
    for (const r of DRAFT_ROLES) expect(roleLimit(r, 24), r).toBeLessThanOrEqual(ROLE_MAX[r])
  })

  it('grow with stars and say what comes next', () => {
    expect(spellUnlocked(2, 'exchange')).toBe(false)
    expect(spellUnlocked(3, 'exchange')).toBe(true)
    expect(roleLimit('bruiser', 3)).toBe(1)
    expect(roleLimit('bruiser', 4)).toBe(2)
    expect(nextRoleStars('bruiser', 0)).toBe(4)
    expect(nextRoleStars('bruiser', 4)).toBeNull()
    expect(nextRoleStars('footsoldier', 2)).toBe(9)
    for (const r of DRAFT_ROLES) for (let n = 0; n < 24; n++) expect(roleLimit(r, n + 1)).toBeGreaterThanOrEqual(roleLimit(r, n))
  })
})
