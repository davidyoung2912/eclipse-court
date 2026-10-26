import { describe, expect, it } from 'vitest'
import { ROLE_INFO, courtFight } from './pieceInfo'
import { ROLE_NAMES } from './roster'

describe('piece info', () => {
  it('describes every role and court', () => {
    for (const role of Object.keys(ROLE_NAMES.solari) as (keyof typeof ROLE_INFO)[]) {
      expect(ROLE_INFO[role].move.length).toBeGreaterThan(0)
      expect(ROLE_INFO[role].fight.length).toBeGreaterThan(0)
      expect(courtFight('umbral', role).length).toBeGreaterThan(0)
    }
  })
})
