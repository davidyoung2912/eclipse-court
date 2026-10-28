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

describe('coach-marks', () => {
  beforeEach(() => resetTips())

  it('uses unique coach- ids that resetCoach clears without touching other cards', async () => {
    const { COACH } = await import('./ui/tips/coachData')
    const { resetCoach, COACH_PREFIX } = await import('./tips')
    expect(new Set(COACH.map((s) => s.id)).size).toBe(COACH.length)
    for (const s of COACH) expect(s.id.startsWith(COACH_PREFIX)).toBe(true)
    markTipSeen('menu-1')
    markTipSeen(COACH[0].id)
    resetCoach()
    expect(tipSeen(COACH[0].id)).toBe(false)
    expect(tipSeen('menu-1')).toBe(true)
  })
})
