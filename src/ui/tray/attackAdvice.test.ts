import { describe, expect, it } from 'vitest'
import { adviceFor } from './attackAdvice'
import type { Piece } from '../../engine/rules/types'

const foe = (role: Piece['role']) => ({ role }) as Piece

describe('adviceFor', () => {
  it('backs a lopsided win and warns off a likely loss', () => {
    expect(adviceFor({ attacker: 0.9, defender: 0.05, other: 0.05 }, foe('footsoldier')).tone).toBe('go')
    expect(adviceFor({ attacker: 0.1, defender: 0.8, other: 0.1 }, foe('footsoldier')).tone).toBe('stop')
  })
  it('calls an even fight close, and notes an exposed Leader', () => {
    expect(adviceFor({ attacker: 0.4, defender: 0.3, other: 0.3 }, foe('footsoldier')).tone).toBe('even')
    expect(adviceFor({ attacker: 0.55, defender: 0.3, other: 0.15 }, foe('leader')).text).toContain('Leader')
  })
  it('keeps every line short enough for one line', () => {
    for (const w of [0, 0.3, 0.55, 0.7, 0.9]) for (const l of [0, 0.3, 0.5, 0.7])
      expect(adviceFor({ attacker: w, defender: l, other: Math.max(0, 1 - w - l) }, foe('leader')).text.length).toBeLessThanOrEqual(42)
  })
})
