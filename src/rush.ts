import { PUZZLES } from './engine/data/puzzles'
import { rngNext } from './engine/rng'

/** Puzzle Rush: puzzles one after another, easiest tier first; a failed puzzle ends the run. The best run is kept. */
const KEY = 'eclipse-court:rush'

/** The most Shards one run pays. */
export const RUSH_SHARD_CAP = 15

/** The puzzles of a run in order: each tier shuffled from the seed, beginner first and expert last. */
export function rushOrder(seed: number): number[] {
  let state = seed >>> 0
  const roll = () => {
    const [v, next] = rngNext(state)
    state = next
    return v
  }
  return (['beginner', 'normal', 'expert'] as const).flatMap((tier) => {
    const idx = PUZZLES.flatMap((p, i) => (p.tier === tier ? [i] : []))
    for (let i = idx.length - 1; i > 0; i--) {
      const j = Math.floor(roll() * (i + 1))
      ;[idx[i], idx[j]] = [idx[j], idx[i]]
    }
    return idx
  })
}

export function rushBest(): number {
  try {
    const n = Number(localStorage.getItem(KEY))
    return Number.isInteger(n) && n > 0 ? n : 0
  } catch {
    return 0
  }
}

/** Records a finished run's score; true if it is a new best. */
export function recordRush(score: number): boolean {
  if (score <= rushBest()) return false
  try {
    localStorage.setItem(KEY, String(score))
  } catch {
    // The best simply is not kept without storage.
  }
  return true
}
