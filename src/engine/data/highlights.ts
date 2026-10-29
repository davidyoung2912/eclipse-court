/** Game of the Week: how a finished game is rated for drama, and which kept game is the week's best. */
import { dayIndex } from './setups'

/** What a finished game was like, counted from its steps. */
export interface GameFacts {
  /** Pieces taken, both sides. */
  captures: number
  /** Named moments met (a check, a capture streak, the Eclipse, first blood). */
  moments: number
  /** Times the side ahead on pieces changed. */
  leadChanges: number
  /** Rounds played. */
  turns: number
  /** The player won. */
  won: boolean
  /** Pieces between the sides at the end; 0 is a tight finish. */
  margin: number
}

export interface Highlight {
  /** The day it finished, as a `dailySeed`. */
  day: number
  score: number
  facts: GameFacts
  /** The game as a record code. */
  code: string
}

/** Days a game stays in the running, today included. */
export const WEEK_DAYS = 7
/** Games kept, best first; older and lesser ones are dropped. */
export const KEEP = 8
/** Longest record code kept, so the store stays small and the link stays shareable. */
export const MAX_CODE = 12000

/** The drama of a game: captures, named moments, swings in the lead and a close finish all count; a long game counts a little. */
export function rateFacts(f: GameFacts): number {
  const close = f.margin <= 1 ? 6 : f.margin <= 2 ? 3 : 0
  return Math.min(f.captures, 16) * 2 + f.moments * 5 + Math.min(f.leadChanges, 6) * 4 + close + Math.min(f.turns, 30) / 3 + (f.won ? 2 : 0)
}

/** Days from `from` to `to`, both `dailySeed`s. */
const daysBetween = (from: number, to: number) => dayIndex(to) - dayIndex(from)

/** Whether a game of `day` is still in the week that ends `today`. */
export const inWeek = (day: number, today: number) => {
  const d = daysBetween(day, today)
  return d >= 0 && d < WEEK_DAYS
}

/** The best game of the last seven days: the highest score, the later one on a tie. Null if none. */
export function gameOfTheWeek(games: readonly Highlight[], today: number): Highlight | null {
  let best: Highlight | null = null
  for (const g of games) {
    if (!inWeek(g.day, today)) continue
    if (!best || g.score > best.score || (g.score === best.score && g.day > best.day)) best = g
  }
  return best
}

/** `games` with `add` in it, keeping the last two weeks' best `KEEP` of them. */
export function keepBest(games: readonly Highlight[], add: Highlight, today: number): Highlight[] {
  return [...games, add]
    .filter((g) => daysBetween(g.day, today) >= 0 && daysBetween(g.day, today) < WEEK_DAYS * 2)
    .sort((a, b) => b.score - a.score || b.day - a.day)
    .slice(0, KEEP)
}
