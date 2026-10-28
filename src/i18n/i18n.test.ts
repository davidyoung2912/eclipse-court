import { afterEach, describe, expect, it } from 'vitest'
import { getLocale, registerLocale, setLocale, t } from '.'
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
})
