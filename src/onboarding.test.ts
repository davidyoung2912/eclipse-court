import { beforeEach, describe, expect, it } from 'vitest'
import { adviceFor, checklist, hideAdvice, isFirstBattle, onboardingSnapshot, recordAiGame, resetOnboarding, showChecklist } from './onboarding'
import { emptyProgress } from './progress'

describe('onboarding', () => {
  beforeEach(() => resetOnboarding())

  it('advises an easier level after two losses in a row at one difficulty', () => {
    recordAiGame('hard', 'loss')
    expect(adviceFor(onboardingSnapshot())).toBeNull()
    recordAiGame('hard', 'loss')
    expect(adviceFor(onboardingSnapshot())?.to).toBe('normal')
  })

  it('stays quiet on Easy, after a win, or across difficulties', () => {
    recordAiGame('easy', 'loss'); recordAiGame('easy', 'loss')
    expect(adviceFor(onboardingSnapshot())).toBeNull()
    resetOnboarding()
    recordAiGame('normal', 'loss'); recordAiGame('hard', 'loss')
    expect(adviceFor(onboardingSnapshot())).toBeNull()
    recordAiGame('normal', 'loss'); recordAiGame('normal', 'loss'); recordAiGame('normal', 'win')
    expect(adviceFor(onboardingSnapshot())).toBeNull()
  })

  it('stays dismissed until another game is played', () => {
    recordAiGame('normal', 'loss'); recordAiGame('normal', 'loss')
    hideAdvice()
    expect(adviceFor(onboardingSnapshot())).toBeNull()
    recordAiGame('normal', 'loss')
    expect(adviceFor(onboardingSnapshot())?.to).toBe('easy')
  })

  it('lists first steps, even before the rules are learned, until all are done or put away', () => {
    const p = emptyProgress()
    expect(showChecklist(checklist(p, false), onboardingSnapshot())).toBe(true)
    const steps = checklist(p, true)
    expect(steps.map((s) => s.done)).toEqual([true, false, false, false, false])
    expect(showChecklist(steps, onboardingSnapshot())).toBe(true)
    expect(showChecklist(steps.map((s) => ({ ...s, done: true })), onboardingSnapshot())).toBe(false)
  })

  it('coaches only the very first campaign battle', () => {
    const p = emptyProgress()
    expect(isFirstBattle(p, 0)).toBe(true)
    expect(isFirstBattle(p, 1)).toBe(false)
    expect(isFirstBattle(p, null)).toBe(false)
  })
})
