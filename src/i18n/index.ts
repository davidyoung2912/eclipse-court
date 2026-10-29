import { en, type StringKey } from './en'

type Raw = keyof typeof en

export type { StringKey }
type Catalog = Partial<Record<Raw, string>>
type Params = Record<string, string | number>

const catalogs: Record<string, Catalog> = { en }
let locale = 'en'

/** Adds or extends the text for a language; keys left out fall back to English. */
export function registerLocale(code: string, catalog: Catalog) {
  catalogs[code] = { ...catalogs[code], ...catalog }
}

/** The languages the setting offers, each named in itself; add one here when its catalog is registered. */
export const LOCALES: readonly { code: string; name: string }[] = [{ code: 'en', name: 'English' }]

export function setLocale(code: string) {
  locale = catalogs[code] ? code : 'en'
}

export const getLocale = () => locale

const fill = (text: string, params: Params) => text.replace(/\{(\w+)\}/g, (whole, name: string) => (name in params ? String(params[name]) : whole))

/** The text for a key in the current language with `{name}` values filled in; a `count` picks the `_one` or `_other` form. */
export function t(key: StringKey, params: Params = {}): string {
  const pick = (k: string) => catalogs[locale]?.[k as Raw] ?? en[k as Raw]
  let text: string | undefined
  if ('count' in params) {
    const form = new Intl.PluralRules(locale).select(Number(params.count))
    text = pick(`${key}_${form}`) ?? pick(`${key}_other`)
  }
  return fill(text ?? pick(key) ?? key, params)
}
