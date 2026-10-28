import { foeById, nextRating, rankOf, START_RATING, type LadderFoe } from './engine/data/ladder'

/** The ranked ladder's rating; kept apart from the campaign's progress. */
const KEY = 'eclipse-court:ladder'

type Listener = () => void
const listeners = new Set<Listener>()

export type LadderResult = 'win' | 'draw' | 'loss'

export interface LadderGame {
  foe: string
  result: LadderResult
  change: number
}

export interface LadderState {
  rating: number
  peak: number
  games: number
  wins: number
  draws: number
  losses: number
  /** The latest games, newest last. */
  history: readonly LadderGame[]
}

const EMPTY: LadderState = { rating: START_RATING, peak: START_RATING, games: 0, wins: 0, draws: 0, losses: 0, history: [] }
const HISTORY = 10

export const SHARDS_LADDER_WIN = 5
export const SHARDS_LADDER_RANK = 30

const count = (x: unknown) => (typeof x === 'number' && Number.isInteger(x) && x >= 0 ? x : 0)

export function parseLadder(raw: unknown): LadderState {
  const o = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const rating = count(o.rating) || START_RATING
  const history = Array.isArray(o.history)
    ? o.history
        .filter((h): h is LadderGame => !!h && typeof h === 'object' && typeof h.foe === 'string' && !!foeById(h.foe)
          && (h.result === 'win' || h.result === 'draw' || h.result === 'loss') && Number.isInteger(h.change))
        .map((h) => ({ foe: h.foe, result: h.result, change: h.change }))
        .slice(-HISTORY)
    : []
  return { rating, peak: Math.max(rating, count(o.peak)), games: count(o.games), wins: count(o.wins), draws: count(o.draws), losses: count(o.losses), history }
}

function load(): LadderState {
  try {
    return parseLadder(JSON.parse(localStorage.getItem(KEY) ?? 'null'))
  } catch {
    return EMPTY
  }
}

let state = load()

function commit(next: LadderState) {
  state = next
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    // Without storage the rating starts over next visit.
  }
  listeners.forEach((l) => l())
}

export const ladderSnapshot = () => state
export function subscribeLadder(l: Listener) {
  listeners.add(l)
  return () => { listeners.delete(l) }
}

export interface LadderOutcome {
  rating: number
  change: number
  /** The rank title changed upwards. */
  promoted: boolean
  shards: number
  lines: string[]
}

/** Records a finished ladder game and returns what to tell the player; the caller adds the Shards. */
export function recordLadder(foe: LadderFoe, result: LadderResult): LadderOutcome {
  const was = state
  const score = result === 'win' ? 1 : result === 'draw' ? 0.5 : 0
  const rating = nextRating(was.rating, foe.rating, score, was.games)
  const change = rating - was.rating
  const peak = Math.max(was.peak, rating)
  commit({
    rating, peak, games: was.games + 1,
    wins: was.wins + (result === 'win' ? 1 : 0),
    draws: was.draws + (result === 'draw' ? 1 : 0),
    losses: was.losses + (result === 'loss' ? 1 : 0),
    history: [...was.history, { foe: foe.id, result, change }].slice(-HISTORY),
  })
  // Paid once per rank: only a new peak in a higher rank counts.
  const promoted = rankOf(peak) !== rankOf(was.peak)
  const shards = (result === 'win' ? SHARDS_LADDER_WIN : 0) + (promoted ? SHARDS_LADDER_RANK : 0)
  return {
    rating, change, promoted, shards,
    lines: [
      `Ladder vs ${foe.name}: ${result === 'win' ? 'won' : result === 'draw' ? 'drawn' : 'lost'}, rating ${rating} (${change >= 0 ? '+' : ''}${change}).`,
      ...(promoted ? [`New rank: ${rankOf(rating)}. +${SHARDS_LADDER_RANK} Shards.`] : []),
      ...(result === 'win' ? [`Ladder win: +${SHARDS_LADDER_WIN} Shards.`] : []),
    ],
  }
}
