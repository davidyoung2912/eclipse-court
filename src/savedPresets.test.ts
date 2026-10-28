import { describe, expect, it } from 'vitest'
import { MAX_NAME, MAX_SAVED_PRESETS, deletePreset, loadPresets, savePreset } from './savedPresets'

function fakeStorage() {
  const m = new Map<string, string>()
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) }
}

describe('saved presets', () => {
  it('saves, loads and deletes', () => {
    const s = fakeStorage()
    const list = savePreset('Fast game', { fog: true }, s)
    expect(loadPresets(s)).toEqual(list)
    expect(list[0].choices).toEqual({ fog: true })
    expect(deletePreset(list[0].id, s)).toEqual([])
    expect(loadPresets(s)).toEqual([])
  })

  it('overwrites a name already used, ignoring case', () => {
    const s = fakeStorage()
    savePreset('Mine', { fog: true }, s)
    const list = savePreset(' mine ', { fog: false }, s)
    expect(list).toHaveLength(1)
    expect(list[0].choices).toEqual({ fog: false })
  })

  it('trims names, ignores blank ones and caps the count', () => {
    const s = fakeStorage()
    expect(savePreset('   ', {}, s)).toEqual([])
    expect(savePreset('x'.repeat(100), {}, s)[0].name).toHaveLength(MAX_NAME)
    for (let i = 0; i < MAX_SAVED_PRESETS + 3; i++) savePreset(`p${i}`, {}, s)
    expect(loadPresets(s)).toHaveLength(MAX_SAVED_PRESETS)
  })

  it('survives corrupt storage', () => {
    const s = fakeStorage()
    s.setItem('eclipse-court:presets', '{nope')
    expect(loadPresets(s)).toEqual([])
    s.setItem('eclipse-court:presets', JSON.stringify([{ id: 1 }, null, { id: 'a', name: 'ok', choices: {} }]))
    expect(loadPresets(s).map((p) => p.name)).toEqual(['ok'])
  })
})
