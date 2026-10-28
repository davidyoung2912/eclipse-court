import { afterEach, describe, expect, it, vi } from 'vitest'
import { haptic, HAPTIC_PATTERNS } from './haptics'
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
})
