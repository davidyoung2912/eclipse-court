import { MAX_ASCENSION } from './engine/data/gauntlet'

/** Gauntlet ascension and daily-run records; kept apart from the campaign's progress. */
const KEY = 'eclipse-court:ascension'

type Listener = () => void
const listeners = new Set<Listener>()

export interface AscensionState {
  /** The highest ascension that can be chosen: winning at level n opens n + 1. */
  unlocked: number
  /** The day (a `dailySeed`) the daily run record below belongs to; 0 before the first. */
  day: number
  /** The furthest stage reached in that day's run. */
  dayBest: number
  dayWon: boolean
  /** Days on which the daily run was won. */
  daysWon: number
}

const EMPTY: AscensionState = { unlocked: 0, day: 0, dayBest: 0, dayWon: false, daysWon: 0 }

export const SHARDS_ASCENSION_WIN = 20
export const SHARDS_DAILY_RUN = 30

const count = (x: unknown, max = 1e9) => (typeof x === 'number' && Number.isInteger(x) && x >= 0 && x <= max ? x : 0)

export function parseAscension(raw: unknown): AscensionState {
  const o = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  return { unlocked: count(o.unlocked, MAX_ASCENSION), day: count(o.day), dayBest: count(o.dayBest, 9), dayWon: o.dayWon === true, daysWon: count(o.daysWon) }
}

function load(): AscensionState {
  try {
    return parseAscension(JSON.parse(localStorage.getItem(KEY) ?? 'null'))
  } catch {
    return EMPTY
  }
}

let state = load()

function commit(next: AscensionState) {
  state = next
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    // Without storage the records start over next visit.
  }
  listeners.forEach((l) => l())
}

export const ascensionSnapshot = () => state
export function subscribeAscension(l: Listener) {
  listeners.add(l)
  return () => { listeners.delete(l) }
}

/** The daily record as it stands on `day`: a new day starts with nothing played. */
export const forDay = (s: AscensionState, day: number): AscensionState => (s.day === day ? s : { ...s, day, dayBest: 0, dayWon: false })

export interface RunOutcome {
  shards: number
  lines: string[]
}

/** Records a finished run (`stage` as in `runSummary`); the caller adds the Shards. */
export function recordAscension(run: { ascension: number; daily: number }, stage: number, won: boolean): RunOutcome {
  const lines: string[] = []
  let shards = 0
  let next = state
  if (won && run.ascension > 0) {
    shards += SHARDS_ASCENSION_WIN * run.ascension
    lines.push(`Ascension ${run.ascension} cleared: +${SHARDS_ASCENSION_WIN * run.ascension} Shards.`)
  }
  if (won && run.ascension >= state.unlocked && state.unlocked < MAX_ASCENSION) {
    next = { ...next, unlocked: run.ascension + 1 }
    lines.push(`Ascension ${run.ascension + 1} unlocked.`)
  }
  if (run.daily) {
    const was = forDay(next, run.daily)
    const firstWin = won && !was.dayWon
    if (firstWin) {
      shards += SHARDS_DAILY_RUN
      lines.push(`Daily run won: +${SHARDS_DAILY_RUN} Shards.`)
    }
    next = { ...was, dayBest: Math.max(was.dayBest, Math.min(stage, 9)), dayWon: was.dayWon || won, daysWon: was.daysWon + (firstWin ? 1 : 0) }
  }
  if (next !== state) commit(next)
  return { shards, lines }
}
