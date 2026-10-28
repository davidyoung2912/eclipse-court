import { describe, expect, it } from 'vitest'
import { newGame, reduce } from '../engine/reducer'
import { replaySteps } from '../engine/log'
import { classify, EVAL_CAP, keyMoments, reviewGame, reviewOf, summarise, type MoveReview } from './review'
import { judgeMove, chooseAction } from './strategy'

/** A short real game: the AI's own choices for each side. */
function playout(plies: number) {
  let state = newGame(11)
  const actions = []
  for (let i = 0; i < plies && !state.winner; i++) {
    const a = chooseAction(state, 'easy', i + 1)
    const next = reduce(state, a)
    if (next === state) break
    actions.push(a)
    state = next
  }
  return replaySteps(newGame(11), actions)!
}

describe('review', () => {
  it('grades a loss by size', () => {
    expect(classify(0)).toBe('best')
    expect(classify(0.5)).toBe('good')
    expect(classify(1)).toBe('inaccuracy')
    expect(classify(3)).toBe('mistake')
    expect(classify(9)).toBe('blunder')
  })

  it('rates the move the search would pick as best', () => {
    const s = newGame(5)
    const j = judgeMove(s, { type: 'pass' }, 'easy')
    const again = judgeMove(s, j.best, 'easy')
    expect(again.playedValue).toBe(again.bestValue)
    expect(j.playedValue).toBeLessThanOrEqual(j.bestValue)
  })

  it('reviews every move of a game and keeps the evaluation inside the cap', async () => {
    const steps = playout(6)
    const seen: number[] = []
    const reviews = await reviewGame(steps, async (state, played) => judgeMove(state, played, 'easy'), (i) => seen.push(i))
    expect(reviews).toHaveLength(steps.length - 1)
    expect(seen).toEqual(reviews.map((_, i) => i))
    for (const r of reviews) {
      expect(r.loss).toBeGreaterThanOrEqual(0)
      expect(Math.abs(r.evalBefore)).toBeLessThanOrEqual(EVAL_CAP)
    }
    expect(reviews[0].court).toBe(steps[0].state.turn)
  })

  it('stops when cancelled', async () => {
    const steps = playout(4)
    let n = 0
    const reviews = await reviewGame(steps, async (s, a) => judgeMove(s, a, 'easy'), () => n++, () => n >= 2)
    expect(reviews).toHaveLength(2)
  })

  it('flags a thrown-away move as a mistake worth revisiting', () => {
    const steps = playout(2)
    const j = judgeMove(steps[0].state, steps[1].action!, 'easy')
    const r = reviewOf(steps, 0, { ...j, bestValue: 10, playedValue: 3 })
    expect(r.grade).toBe('blunder')
    expect(keyMoments([null, r])).toEqual([1])
  })

  it('summarises each side', () => {
    const mk = (court: 'solari' | 'umbral', loss: number): MoveReview => ({ court, played: { type: 'pass' }, best: { type: 'pass' }, grade: classify(loss), loss, evalBefore: 0 })
    const rs = [mk('solari', 0), mk('umbral', 6), mk('solari', 3)]
    const solari = summarise(rs, 'solari')
    expect(solari.moves).toBe(2)
    expect(solari.counts.best).toBe(1)
    expect(solari.counts.mistake).toBe(1)
    expect(solari.accuracy).toBe(75)
    expect(summarise(rs, 'umbral').accuracy).toBe(0)
    expect(summarise([], 'solari').accuracy).toBe(100)
  })
})
