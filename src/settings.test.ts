import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS, parseSettings, THEMES, themeById, themeUnlocked } from './settings'

describe('settings', () => {
  it('falls back to the defaults for damaged data', () => {
    expect(parseSettings(null)).toEqual(DEFAULT_SETTINGS)
    expect(parseSettings({ theme: 'nope', reduceMotion: 'yes', marks: 1 })).toEqual(DEFAULT_SETTINGS)
    expect(parseSettings({ theme: 'frost', reduceMotion: true, marks: true })).toEqual({ theme: 'frost', reduceMotion: true, marks: true, largeUi: false })
  })

  it('opens themes with stars, the first always', () => {
    expect(THEMES[0].stars).toBe(0)
    expect(new Set(THEMES.map((t) => t.id)).size).toBe(THEMES.length)
    expect(themeUnlocked(themeById('frost'), 4)).toBe(false)
    expect(themeUnlocked(themeById('frost'), 5)).toBe(true)
    expect(themeById('missing')).toBe(THEMES[0])
  })

  it('gives every themed palette the same variables', () => {
    const keys = Object.keys(THEMES[1].vars).sort()
    for (const t of THEMES.slice(1)) expect(Object.keys(t.vars).sort(), t.id).toEqual(keys)
  })
})
