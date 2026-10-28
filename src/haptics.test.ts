import { afterEach, describe, expect, it, vi } from 'vitest'
import { haptic, HAPTIC_PATTERNS, hitHaptic } from './haptics'
import { updateSettings } from './settings'

describe('haptics', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    updateSettings({ haptics: true })
  })

  it('vibrates with the pattern for the kind', () => {
    const vibrate = vi.fn()
    vi.stubGlobal('navigator', { vibrate })
    haptic('capture')
    expect(vibrate).toHaveBeenCalledWith([...HAPTIC_PATTERNS.capture])
  })

  it('stays silent when switched off or unsupported', () => {
    const vibrate = vi.fn()
    vi.stubGlobal('navigator', { vibrate })
    updateSettings({ haptics: false })
    haptic('select')
    expect(vibrate).not.toHaveBeenCalled()
    updateSettings({ haptics: true })
    vi.stubGlobal('navigator', {})
    expect(() => haptic('select')).not.toThrow()
  })

  it('picks a distinct pattern per kind of duel hit', () => {
    expect(hitHaptic(1, false)).toBe('hit')
    expect(hitHaptic(3, false)).toBe('heavyHit')
    expect(hitHaptic(1, true)).toBe('ko')
  })

  it('gives each event its own pattern: a double tap for a capture, a long build for the Eclipse', () => {
    expect(new Set(Object.values(HAPTIC_PATTERNS).map((p) => p.join(','))).size).toBe(Object.keys(HAPTIC_PATTERNS).length)
    expect(HAPTIC_PATTERNS.capture.length).toBe(3)
    expect(HAPTIC_PATTERNS.rumble.reduce((a, b) => a + b, 0)).toBeGreaterThan(HAPTIC_PATTERNS.ko.reduce((a, b) => a + b, 0))
  })
})
