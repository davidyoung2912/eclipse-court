import { foeById, MIN_RATING, nextRating, rankOf, START_RATING, type LadderFoe } from './engine/data/ladder'

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
  /** The current season, from 1; a season ends when the player starts the next. */
  season: number
  /** Games played this season: the rating settles quickly again after a reset. */
  seasonGames: number
  /** The highest rating reached this season. */
  seasonPeak: number
  /** The peaks of the seasons before this one, oldest first. */
  past: readonly number[]
  /** Results against each opponent, by foe id. */
  rivals: Readonly<Record<string, Tally>>
}

/** Wins, draws and losses against one opponent. */
export interface Tally {
  w: number
  d: number
  l: number
}

const EMPTY: LadderState = { rating: START_RATING, peak: START_RATING, games: 0, wins: 0, draws: 0, losses: 0, history: [], season: 1, seasonGames: 0, seasonPeak: START_RATING, past: [], rivals: {} }
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
  const rivals: Record<string, Tally> = {}
  if (o.rivals && typeof o.rivals === 'object')
    for (const [id, t] of Object.entries(o.rivals as Record<string, Partial<Tally>>))
      if (foeById(id) && t) rivals[id] = { w: count(t.w), d: count(t.d), l: count(t.l) }
  const peak = Math.max(rating, count(o.peak))
  return {
    rating, peak, games: count(o.games), wins: count(o.wins), draws: count(o.draws), losses: count(o.losses), history,
    season: Math.max(1, count(o.season)), seasonGames: count(o.seasonGames),
    seasonPeak: Math.min(peak, Math.max(rating, count(o.seasonPeak))),
    past: Array.isArray(o.past) ? o.past.filter((n): n is number => Number.isInteger(n) && n > 0).slice(-20) : [],
    rivals,
  }
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

const bumped = (t: Tally = { w: 0, d: 0, l: 0 }, result: LadderResult): Tally => ({
  w: t.w + (result === 'win' ? 1 : 0), d: t.d + (result === 'draw' ? 1 : 0), l: t.l + (result === 'loss' ? 1 : 0),
})

/** Games a season must run before the next can begin. */
export const SEASON_MIN_GAMES = 10

/** The rating a new season starts from: halfway back toward the first rung. */
export const seasonStart = (rating: number) => Math.max(MIN_RATING, START_RATING + Math.round((rating - START_RATING) / 2))

export const canStartSeason = (s: LadderState = state) => s.seasonGames >= SEASON_MIN_GAMES

/** Shards paid when a season ends, by the rank its peak reached. */
export const SEASON_SHARDS: Readonly<Record<string, number>> = {
  Squire: 10, Knight: 25, Captain: 45, Marshal: 70, Warden: 100, 'Eclipse Champion': 150,
}

/** What a season's peak earned: its rank, the banner that rank flies and the Shards paid. */
export interface SeasonReward {
  season: number
  peak: number
  rank: string
  shards: number
}

export const seasonReward = (season: number, peak: number): SeasonReward => {
  const rank = rankOf(peak)
  return { season, peak, rank, shards: SEASON_SHARDS[rank] ?? 0 }
}

/** The finished seasons, oldest first, each with its reward. */
export const seasonHistory = (s: LadderState = state): SeasonReward[] => s.past.map((peak, i) => seasonReward(s.season - s.past.length + i, peak))

/** Ends the season: its peak is kept, the rating is pulled halfway back and the placement games begin again. Returns the reward to pay, or null if the season cannot end yet. */
export function startSeason(): SeasonReward | null {
  if (!canStartSeason()) return null
  const reward = seasonReward(state.season, state.seasonPeak)
  const rating = seasonStart(state.rating)
  commit({ ...state, rating, season: state.season + 1, seasonGames: 0, seasonPeak: rating, past: [...state.past, state.seasonPeak].slice(-20) })
  return reward
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
  const rating = nextRating(was.rating, foe.rating, score, was.seasonGames)
  const change = rating - was.rating
  const peak = Math.max(was.peak, rating)
  commit({
    rating, peak, games: was.games + 1,
    wins: was.wins + (result === 'win' ? 1 : 0),
    draws: was.draws + (result === 'draw' ? 1 : 0),
    losses: was.losses + (result === 'loss' ? 1 : 0),
    history: [...was.history, { foe: foe.id, result, change }].slice(-HISTORY),
    season: was.season, seasonGames: was.seasonGames + 1, seasonPeak: Math.max(was.seasonPeak, rating), past: was.past,
    rivals: { ...was.rivals, [foe.id]: bumped(was.rivals[foe.id], result) },
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
