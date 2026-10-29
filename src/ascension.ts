import { MAX_ASCENSION } from './engine/data/gauntlet'
import { dayIndex } from './engine/data/setups'

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
  /** The `dailySeed` of the latest day the daily run was won; 0 before the first. */
  lastWon: number
  /** Consecutive days the daily run has been won, as of `lastWon`. */
  streak: number
  bestStreak: number
  /** The most Endless fights won past the boss in one run. */
  endlessBest: number
}

const EMPTY: AscensionState = { unlocked: 0, day: 0, dayBest: 0, dayWon: false, daysWon: 0, lastWon: 0, streak: 0, bestStreak: 0, endlessBest: 0 }

export const SHARDS_ASCENSION_WIN = 20
export const SHARDS_DAILY_RUN = 30
/** Each earlier day in a daily-run streak adds this many Shards to a win, up to STREAK_BONUS_DAYS days. */
export const SHARDS_STREAK_STEP = 2
export const STREAK_BONUS_DAYS = 5

const count = (x: unknown, max = 1e9) => (typeof x === 'number' && Number.isInteger(x) && x >= 0 && x <= max ? x : 0)

export function parseAscension(raw: unknown): AscensionState {
  const o = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  return { unlocked: count(o.unlocked, MAX_ASCENSION), day: count(o.day), dayBest: count(o.dayBest, 9), dayWon: o.dayWon === true, daysWon: count(o.daysWon), lastWon: count(o.lastWon, 99991231), streak: count(o.streak), bestStreak: count(o.bestStreak), endlessBest: count(o.endlessBest, 9999) }
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

/** The daily-run streak still alive on `day`: it lapses once a day passes without a win. */
export const liveStreak = (s: AscensionState, day: number): number =>
  s.lastWon && dayIndex(day) - dayIndex(s.lastWon) <= 1 ? s.streak : 0

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
    let streak = {}
    if (firstWin) {
      const len = liveStreak(was, run.daily) + 1
      const bonus = SHARDS_STREAK_STEP * Math.min(len - 1, STREAK_BONUS_DAYS)
      shards += SHARDS_DAILY_RUN + bonus
      lines.push(`Daily run won: +${SHARDS_DAILY_RUN} Shards.`)
      if (len > 1) lines.push(`Streak of ${len} days${bonus ? `: +${bonus} Shards` : ''}.`)
      streak = { lastWon: run.daily, streak: len, bestStreak: Math.max(was.bestStreak, len) }
    }
    next = { ...was, ...streak, dayBest: Math.max(was.dayBest, Math.min(stage, 9)), dayWon: was.dayWon || won, daysWon: was.daysWon + (firstWin ? 1 : 0) }
  }
  if (next !== state) commit(next)
  return { shards, lines }
}

/** Records how deep an Endless run got; true if that is a new record. */
export function recordEndless(depth: number): boolean {
  if (depth <= state.endlessBest) return false
  commit({ ...state, endlessBest: Math.min(depth, 9999) })
  return true
}
