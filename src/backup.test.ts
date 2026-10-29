import { describe, expect, it } from 'vitest'
import { exportSave, importSave } from './backup'

const fake = (init: Record<string, string>) => {
  const m = new Map(Object.entries(init))
  return {
    get length() { return m.size },
    key: (i: number) => [...m.keys()][i] ?? null,
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => { m.set(k, v) },
    m,
  }
}

describe('backup', () => {
  it('round-trips progress keys and skips others', () => {
    const src = fake({ 'eclipse-court:shop': '{"a":1}', 'eclipse-court:saved': 'x', other: 'y' })
    const dst = fake({})
    expect(importSave(exportSave(src), dst)).toBe(1)
    expect([...dst.m.keys()]).toEqual(['eclipse-court:shop'])
  })
  it('carries the Shard sinks', () => {
    const dst = fake({})
    importSave(exportSave(fake({ 'eclipse-court:sinks': '{"freezes":1}' })), dst)
    expect(dst.m.get('eclipse-court:sinks')).toBe('{"freezes":1}')
  })
  it('carries the persona record', () => {
    const dst = fake({})
    importSave(exportSave(fake({ 'eclipse-court:persona-record': '{"pym":{"w":1,"d":0,"l":0,"last":"w"}}' })), dst)
    expect(dst.m.get('eclipse-court:persona-record')).toBe('{"pym":{"w":1,"d":0,"l":0,"last":"w"}}')
  })
  it('rejects text that is not a backup', () => {
    expect(importSave('nope', fake({}))).toBeNull()
    expect(importSave('{"format":"x","data":{}}', fake({}))).toBeNull()
  })
})
