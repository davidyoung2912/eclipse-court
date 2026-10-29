import { useRef, useState } from 'react'
import { describeHint, HINT_DIFFICULTY, solutionLine, type Hint } from '../ai/hint'
import { requestAction } from '../ai/client'
import { reduce } from '../engine/reducer'
import type { Action, GameState } from '../engine/rules/types'

export interface PuzzleHelp {
  hints: readonly [string, string]
  solution: readonly Action[]
}

/** Extra puzzle hints bought with Shards: how many are held and how to use one up. */
export interface PackHints {
  held: number
  spend: () => boolean
}

/** The hint card: the AI's best move for the side to move, or a puzzle's own three-step hints and, from a pack, the whole line. */
export function useHint(state: GameState, puzzleHelp: PuzzleHelp | undefined, turnsTaken: number, pack?: PackHints) {
  const [hint, setHint] = useState<Hint | 'thinking' | null>(null)
  /** Puzzles: how far through the hints the player has asked (0 none, 3 the move itself). */
  const [level, setLevel] = useState(0)
  /** The position a hint was asked for, so a slow search cannot land on a later one. */
  const asked = useRef<GameState | null>(null)

  const clear = () => {
    asked.current = null
    setHint(null)
    setLevel(0)
  }

  /** A puzzle's hints: a nudge, then the idea, then the move; the next tap closes them. */
  const askPuzzle = (help: PuzzleHelp) => {
    const next = level + 1
    if (next === 4 && level === 3 && pack && pack.held > 0 && pack.spend()) {
      setLevel(4)
      return setHint({ action: { type: 'pass' }, headline: 'The whole line', detail: solutionLine(state, help.solution.slice(turnsTaken)) })
    }
    if (next > 3) return clear()
    const step = help.solution[turnsTaken]
    const move = next === 3 && step && reduce(state, step) !== state ? describeHint(state, step) : null
    setLevel(next)
    setHint(move ?? { action: { type: 'pass' }, headline: `Hint ${Math.min(next, 2)} of 3`, detail: help.hints[Math.min(next, 2) - 1] })
  }

  const ask = () => {
    if (puzzleHelp) return askPuzzle(puzzleHelp)
    if (hint) return clear()
    asked.current = state
    setHint('thinking')
    requestAction(state, HINT_DIFFICULTY, state.rng + state.round).then((action) => {
      if (asked.current === state) setHint(describeHint(state, action))
    })
  }

  return { hint, level, ask, clear }
}
