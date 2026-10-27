/** One-time guidance cards: which have been dismissed is remembered on this device. */
const KEY = 'eclipse-court:tips'

type Listener = () => void
const listeners = new Set<Listener>()

function read(): string[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(KEY) ?? '[]')
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : []
  } catch {
    return []
  }
}

/** Held in memory too, so a device without storage still shows each card only once per visit. */
let seen = new Set(read())

export const tipSeen = (id: string) => seen.has(id)

export function markTipSeen(id: string) {
  seen = new Set(seen).add(id)
  try {
    localStorage.setItem(KEY, JSON.stringify([...seen]))
  } catch {
    // Without storage the card simply returns next visit.
  }
  listeners.forEach((l) => l())
}

/** Brings every card back, for a player who wants the guidance again. */
export function resetTips() {
  seen = new Set()
  try {
    localStorage.removeItem(KEY)
  } catch {
    // Nothing was stored.
  }
  listeners.forEach((l) => l())
}

export const subscribeTips = (l: Listener) => {
  listeners.add(l)
  return () => { listeners.delete(l) }
}

/** Identity changes whenever the set does, for `useSyncExternalStore`. */
export const tipsSnapshot = () => seen
