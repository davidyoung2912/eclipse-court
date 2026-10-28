import { saveBlob } from './saveFile'

const PREFIX = 'eclipse-court:'
const FORMAT = 'eclipse-court-save'

/** Keys that describe a game in flight or a transient link, not progress; left out of a backup. */
const SKIP = new Set(['eclipse-court:saved', 'eclipse-court:run'])

/** Every progress key in `storage` as one JSON text. */
export function exportSave(storage: Pick<Storage, 'length' | 'key' | 'getItem'> = localStorage): string {
  const data: Record<string, string> = {}
  for (let i = 0; i < storage.length; i++) {
    const k = storage.key(i)
    const v = k && k.startsWith(PREFIX) && !SKIP.has(k) ? storage.getItem(k) : null
    if (k && v !== null) data[k] = v
  }
  return JSON.stringify({ format: FORMAT, v: 1, data })
}

/** Writes a backup's keys into `storage`; the number restored, or null if the text is not a backup. */
export function importSave(text: string, storage: Pick<Storage, 'setItem'> = localStorage): number | null {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    return null
  }
  const o = parsed as { format?: unknown; data?: unknown } | null
  if (!o || o.format !== FORMAT || !o.data || typeof o.data !== 'object') return null
  const entries = Object.entries(o.data as Record<string, unknown>).filter(
    (e): e is [string, string] => e[0].startsWith(PREFIX) && !SKIP.has(e[0]) && typeof e[1] === 'string',
  )
  if (entries.length === 0) return null
  for (const [k, v] of entries) storage.setItem(k, v)
  return entries.length
}

/** Offers the backup as a download; false where the browser cannot. */
export const downloadSave = () => saveBlob(new Blob([exportSave()], { type: 'application/json' }), 'eclipse-court-save.json')
