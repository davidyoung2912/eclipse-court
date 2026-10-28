import type { Summary } from './engine/data/summary'

/** Personal bests that the campaign's progress does not keep; kept apart from it. */
const KEY = 'eclipse-court:records'

type Listener = () => void
const listeners = new Set<Listener>()

export interface Records {
  /** Fewest rounds in a win against a Normal or Hard AI; 0 before the first. */
  fastestWin: number
  /** Wins in a row, now and at best. */
  streak: number
  bestStreak: number
  /** Wins that cost no piece. */
  flawless: number
  /** Most enemy pieces taken in one game. */
  mostTaken: number
}

const EMPTY: Records = { fastestWin: 0, streak: 0, bestStreak: 0, flawless: 0, mostTaken: 0 }

const count = (x: unknown) => (typeof x === 'number' && Number.isInteger(x) && x >= 0 ? x : 0)

export function parseRecords(raw: unknown): Records {
  const o = (raw && typeof raw === 'object' ? raw : {}) as Partial<Record<keyof Records, unknown>>
  const streak = count(o.streak)
  return { fastestWin: count(o.fastestWin), streak, bestStreak: Math.max(streak, count(o.bestStreak)), flawless: count(o.flawless), mostTaken: count(o.mostTaken) }
}

/** The records after one more finished game. */
export function withGame(r: Records, s: Summary): Records {
  const serious = s.difficulty !== 'easy'
  const streak = s.won ? r.streak + 1 : s.draw ? r.streak : 0
  return {
    fastestWin: s.won && serious && s.turns > 0 ? (r.fastestWin === 0 ? s.turns : Math.min(r.fastestWin, s.turns)) : r.fastestWin,
    streak,
    bestStreak: Math.max(r.bestStreak, streak),
    flawless: r.flawless + (s.won && s.lost === 0 ? 1 : 0),
    mostTaken: Math.max(r.mostTaken, s.taken),
  }
}

function load(): Records {
  try {
    return parseRecords(JSON.parse(localStorage.getItem(KEY) ?? 'null'))
  } catch {
    return EMPTY
  }
}

let state = load()

export const recordsSnapshot = () => state
export function subscribeRecords(l: Listener) {
  listeners.add(l)
  return () => { listeners.delete(l) }
}

/** Notes a finished game against the personal records. */
export function recordGameResult(s: Summary) {
  state = withGame(state, s)
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    // Without storage the records last for the visit.
  }
  listeners.forEach((l) => l())
}
