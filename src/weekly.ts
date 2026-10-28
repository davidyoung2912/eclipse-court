/** The weekly challenge's best scores; kept apart from the campaign's progress. */
const KEY = 'eclipse-court:weekly'

type Listener = () => void
const listeners = new Set<Listener>()

export interface WeeklyState {
  /** The week (Monday's `dailySeed`) the best and attempts below belong to; 0 before the first game. */
  week: number
  best: number
  attempts: number
  /** The week's first win has paid out. */
  paid: boolean
  /** Weeks in which the challenge was won. */
  weeksWon: number
  /** The best score of each of the last weeks played, newest last. */
  history: readonly { week: number; best: number }[]
}

const EMPTY: WeeklyState = { week: 0, best: 0, attempts: 0, paid: false, weeksWon: 0, history: [] }
const HISTORY = 8

export const SHARDS_WEEKLY_WIN = 40
export const SHARDS_WEEKLY_BEST = 10

const count = (x: unknown) => (typeof x === 'number' && Number.isInteger(x) && x >= 0 ? x : 0)

export function parseWeekly(raw: unknown): WeeklyState {
  const o = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const history = Array.isArray(o.history)
    ? o.history
        .filter((h): h is { week: number; best: number } => !!h && typeof h === 'object' && count(h.week) > 0 && count(h.best) >= 0 && 'best' in h)
        .map((h) => ({ week: count(h.week), best: count(h.best) }))
        .slice(-HISTORY)
    : []
  return { week: count(o.week), best: count(o.best), attempts: count(o.attempts), paid: o.paid === true, weeksWon: count(o.weeksWon), history }
}

function load(): WeeklyState {
  try {
    return parseWeekly(JSON.parse(localStorage.getItem(KEY) ?? 'null'))
  } catch {
    return EMPTY
  }
}

let state = load()

function commit(next: WeeklyState) {
  state = next
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    // Without storage the scores start over next visit.
  }
  listeners.forEach((l) => l())
}

export const weeklySnapshot = () => state
export function subscribeWeekly(l: Listener) {
  listeners.add(l)
  return () => { listeners.delete(l) }
}

/** The state as it stands in `week`: a new week starts with nothing played. */
export const forWeek = (s: WeeklyState, week: number): WeeklyState => (s.week === week ? s : { ...s, week, best: 0, attempts: 0, paid: false })

export interface WeeklyOutcome {
  score: number
  best: number
  /** The score beat an earlier one this week. */
  improved: boolean
  shards: number
  lines: string[]
}

/** Records a finished weekly match and returns what to tell the player; the caller adds the Shards. */
export function recordWeekly(week: number, score: number, won: boolean): WeeklyOutcome {
  const was = forWeek(state, week)
  const best = Math.max(was.best, score)
  const improved = score > was.best && was.attempts > 0
  const firstWin = won && !was.paid
  const history = [...was.history.filter((h) => h.week !== week), { week, best }].slice(-HISTORY)
  commit({ week, best, attempts: was.attempts + 1, paid: was.paid || won, weeksWon: was.weeksWon + (firstWin ? 1 : 0), history })
  const shards = (firstWin ? SHARDS_WEEKLY_WIN : 0) + (improved && !firstWin && won ? SHARDS_WEEKLY_BEST : 0)
  return {
    score, best, improved, shards,
    lines: [
      `Weekly challenge: ${score} points${improved ? ' (new best)' : ''}.`,
      ...(firstWin ? [`Weekly win: +${SHARDS_WEEKLY_WIN} Shards.`] : improved && won ? [`Better score: +${SHARDS_WEEKLY_BEST} Shards.`] : []),
    ],
  }
}
