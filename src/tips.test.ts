import { beforeEach, describe, expect, it } from 'vitest'
import { markTipSeen, resetTips, tipSeen } from './tips'
import { TIPS } from './ui/tips/tipData'

describe('tips', () => {
  beforeEach(() => resetTips())

  it('remembers a dismissed card until reset', () => {
    expect(tipSeen('menu-1')).toBe(false)
    markTipSeen('menu-1')
    expect(tipSeen('menu-1')).toBe(true)
    resetTips()
    expect(tipSeen('menu-1')).toBe(false)
  })

  it('gives every card a unique id, a title and several sentences', () => {
    const ids = Object.values(TIPS).flat().map((t) => t.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const t of Object.values(TIPS).flat()) {
      expect(t.title.length).toBeGreaterThan(0)
      expect(t.text.split(/[.!?] /).length).toBeGreaterThanOrEqual(2)
    }
  })

  it('has guidance for the fight screen and every page added with the newer modes', () => {
    for (const page of ['duel', 'duel-touch', 'duel-mouse', 'duel-defend', 'duel-cells', 'ladder', 'weekly', 'collection', 'mail', 'mail-send', 'story-reader', 'story-ending'] as const) {
      expect(TIPS[page].length).toBeGreaterThan(0)
    }
  })
})
