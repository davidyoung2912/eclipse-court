import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { LOCALES, getLocale, registerLocale, setLocale, t } from '.'
import { en } from './en'

describe('t', () => {
  afterEach(() => setLocale('en'))

  it('fills values and picks plural forms', () => {
    expect(t('daily.opponent', { name: 'Zed', difficulty: 'hard' })).toBe('Opponent: Zed, hard')
    expect(t('common.day', { count: 1 })).toBe('1 day')
  })

  it('falls back to English for a missing key and to the key itself for an unknown one', () => {
    registerLocale('xx', { 'common.back': 'Retour' })
    setLocale('xx')
    expect(t('common.back')).toBe('Retour')
    expect(t('settings.title')).toBe('Settings')
    expect(t('nope.nothing' as never)).toBe('nope.nothing')
  })

  it('ignores an unknown locale', () => {
    setLocale('zz')
    expect(getLocale()).toBe('en')
  })

  it('keeps the same {values} in every plural form and has no empty text', () => {
    for (const [k, v] of Object.entries(en)) expect(v.length, k).toBeGreaterThan(0)
    expect(en['common.day_one']).toContain('{count}')
    expect(en['common.day_other']).toContain('{count}')
  })

  it('has a plural pair for every _one or _other key, with the same {values} in both', () => {
    const keys = Object.keys(en) as (keyof typeof en)[]
    const values = (k: keyof typeof en) => [...en[k].matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join()
    for (const k of keys) {
      const m = /^(.*)_(one|other)$/.exec(k)
      if (!m) continue
      const twin = `${m[1]}_${m[2] === 'one' ? 'other' : 'one'}` as keyof typeof en
      expect(en[twin], `${k} has no ${twin}`).toBeDefined()
      expect(values(k), k).toBe(values(twin))
    }
  })

  it('offers only languages with a catalog, English first', () => {
    expect(LOCALES[0].code).toBe('en')
    for (const { code } of LOCALES) {
      setLocale(code)
      expect(getLocale()).toBe(code)
    }
  })

  it('finds a key for every computed t(`prefix.${value}`) call in the source', () => {
    const files: string[] = []
    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        const path = join(dir, name)
        if (statSync(path).isDirectory()) walk(path)
        else if (/\.tsx?$/.test(name) && !name.endsWith('.test.ts')) files.push(path)
      }
    }
    walk(join(__dirname, '..'))
    const keys = Object.keys(en)
    let seen = 0
    for (const file of files) {
      for (const m of readFileSync(file, 'utf8').matchAll(/\bt\(`([a-z][A-Za-z0-9.]*\.)\$\{/g)) {
        seen++
        expect(keys.some((k) => k.startsWith(m[1])), `${file}: no key starts with ${m[1]}`).toBe(true)
      }
    }
    expect(seen).toBeGreaterThan(0)
  })
})
