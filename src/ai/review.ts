import { evaluate } from './strategy'
import type { Judgement } from './strategy'
import type { Step } from '../engine/log'
import type { Action, Court } from '../engine/rules/types'

/** Values beyond this are a won or lost game and are treated alike, so a missed win is a big but finite loss. */
export const EVAL_CAP = 40

export type Grade = 'best' | 'good' | 'inaccuracy' | 'mistake' | 'blunder'
export const GRADES: readonly Grade[] = ['best', 'good', 'inaccuracy', 'mistake', 'blunder']

export const GRADE_TEXT: Record<Grade, string> = {
  best: 'Best move',
  good: 'Good move',
  inaccuracy: 'Inaccuracy',
  mistake: 'Mistake',
  blunder: 'Blunder',
}

/** What the search made of one move of the game. */
export interface MoveReview {
  /** The court that made the move. */
  court: Court
  played: Action
  best: Action
  grade: Grade
  /** Points given up against the best move, 0 or more. */
  loss: number
  /** The position before the move, from Solari's side: positive favours Solari, within ±EVAL_CAP. */
  evalBefore: number
}

const clamp = (v: number) => Math.max(-EVAL_CAP, Math.min(EVAL_CAP, v))

export function classify(loss: number): Grade {
  if (loss <= 0.05) return 'best'
  if (loss < 0.75) return 'good'
  if (loss < 2) return 'inaccuracy'
  if (loss < 4) return 'mistake'
  return 'blunder'
}

/** The review of the move that led from `steps[i]` to `steps[i + 1]`, given the search's judgement of it. */
export function reviewOf(steps: readonly Step[], i: number, j: Judgement): MoveReview {
  const state = steps[i].state
  const loss = Math.max(0, clamp(j.bestValue) - clamp(j.playedValue))
  return {
    court: state.turn,
    played: steps[i + 1].action!,
    best: j.best,
    grade: classify(loss),
    loss,
    evalBefore: clamp(state.turn === 'solari' ? j.bestValue : -j.bestValue),
  }
}

/** How a finished position reads on the evaluation bar: the result if the game is decided, else the static score. */
export const finalEval = (steps: readonly Step[]) => clamp(evaluate(steps[steps.length - 1].state, 'solari'))

export type Judge = (state: Step['state'], played: Action) => Promise<Judgement>

/**
 * Reviews every move in turn, reporting each as it is done. Stops quietly when `cancelled()` turns true.
 * Returns the reviews made.
 */
export async function reviewGame(
  steps: readonly Step[],
  judge: Judge,
  onMove: (i: number, review: MoveReview) => void,
  cancelled: () => boolean = () => false,
): Promise<MoveReview[]> {
  const out: MoveReview[] = []
  for (let i = 0; i + 1 < steps.length; i++) {
    if (cancelled()) break
    const review = reviewOf(steps, i, await judge(steps[i].state, steps[i + 1].action!))
    out.push(review)
    onMove(i, review)
  }
  return out
}

export interface SideSummary {
  moves: number
  counts: Record<Grade, number>
  /** 0 to 100: how little the side gave up on average, with any one move counting for at most 6 points. */
  accuracy: number
}

export function summarise(reviews: readonly (MoveReview | null)[], court: Court): SideSummary {
  const counts: Record<Grade, number> = { best: 0, good: 0, inaccuracy: 0, mistake: 0, blunder: 0 }
  let lost = 0
  let moves = 0
  for (const r of reviews) {
    if (!r || r.court !== court) continue
    moves++
    counts[r.grade]++
    lost += Math.min(r.loss, 6)
  }
  return { moves, counts, accuracy: moves ? Math.round(100 * (1 - lost / moves / 6)) : 100 }
}

/** Indices (into the reviews) of the moves worth a second look: mistakes and blunders. */
export const keyMoments = (reviews: readonly (MoveReview | null)[]): number[] =>
  reviews.flatMap((r, i) => (r && (r.grade === 'mistake' || r.grade === 'blunder') ? [i] : []))
