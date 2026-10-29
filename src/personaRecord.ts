import { PERSONAS, type PersonaId } from './engine/data/personas'
import type { LineCategory } from './engine/data/personaLines'

/** The player's head-to-head result against each named persona, from the player's side. */
const KEY = 'eclipse-court:persona-record'

type Listener = () => void
const listeners = new Set<Listener>()

export type Result = 'w' | 'd' | 'l'

export interface Head {
  w: number
  d: number
  l: number
  /** The latest result, null before the first game. */
  last: Result | null
}

export type PersonaRecord = Readonly<Partial<Record<PersonaId, Head>>>

const EMPTY_HEAD: Head = { w: 0, d: 0, l: 0, last: null }
const MAX_COUNT = 9999

const count = (x: unknown) => (typeof x === 'number' && Number.isInteger(x) && x >= 0 ? Math.min(x, MAX_COUNT) : 0)

export function parsePersonaRecord(raw: unknown): PersonaRecord {
  const o = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const out: Partial<Record<PersonaId, Head>> = {}
  for (const p of PERSONAS) {
    const h = o[p.id]
    if (!h || typeof h !== 'object') continue
    const { w, d, l, last } = h as Record<string, unknown>
    const head: Head = { w: count(w), d: count(d), l: count(l), last: last === 'w' || last === 'd' || last === 'l' ? last : null }
    if (head.w + head.d + head.l > 0) out[p.id] = { ...head, last: head.last }
  }
  return out
}

function load(): PersonaRecord {
  try {
    return parsePersonaRecord(JSON.parse(localStorage.getItem(KEY) ?? 'null'))
  } catch {
    return {}
  }
}

/** Held in memory too, so a device without storage still remembers for the visit. */
let state = load()

function commit(next: PersonaRecord) {
  state = next
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    // Without storage the record simply starts over next visit.
  }
  listeners.forEach((l) => l())
}

export const personaRecordSnapshot = () => state
export function subscribePersonaRecord(l: Listener) {
  listeners.add(l)
  return () => { listeners.delete(l) }
}

/** The pure step: `head` after one more game with this `result`. */
export const bumpHead = (head: Head = EMPTY_HEAD, result: Result): Head => ({
  w: Math.min(MAX_COUNT, head.w + (result === 'w' ? 1 : 0)),
  d: Math.min(MAX_COUNT, head.d + (result === 'd' ? 1 : 0)),
  l: Math.min(MAX_COUNT, head.l + (result === 'l' ? 1 : 0)),
  last: result,
})

/** Notes a finished game against a persona. */
export const recordPersonaGame = (id: PersonaId, result: Result) =>
  commit({ ...state, [id]: bumpHead(state[id], result) })

/**
 * Which line bank suits how the two stand: a first meeting, a grudge after the player's last loss,
 * the player ahead, the persona ahead, or (level, last game not lost) the plain `base` bank.
 */
export function variantFor(head: Head | undefined, base: Extract<LineCategory, 'greet' | 'briefing'>): LineCategory {
  if (!head || head.w + head.d + head.l === 0) return 'meet'
  if (head.last === 'l') return 'grudge'
  if (head.w > head.l) return 'ahead'
  if (head.l > head.w) return 'behind'
  return base
}
