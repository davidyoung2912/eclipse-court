import { useEffect, useState } from 'react'
import { requestAction } from '../ai/client'
import type { PersonalityId } from '../engine/data/personality'
import type { AiLevel } from '../engine/data/difficulty'
import { pieceAt } from '../engine/rules/moves'
import type { Action, GameState } from '../engine/rules/types'
import { useLatest } from './useLatest'

const AI_DELAY_MS = 450
/** How long the AI's chosen piece flashes before it moves. */
const AI_FLASH_MS = 1080

interface Options {
  state: GameState
  /** The AI may act: it is its court's turn and nothing else is in the way. */
  active: boolean
  difficulty: AiLevel
  personality: PersonalityId | undefined
  /** Plays the chosen action. */
  onAct: (action: Action) => void
}

/**
 * Has the AI court take its turn after a short pause, searching off the main thread and flashing
 * the piece about to move. Returns the piece to spotlight, if any.
 */
export function useAiTurn({ state, active, difficulty, personality, onAct }: Options) {
  const [focus, setFocus] = useState<{ mover: string; target?: string } | null>(null)
  const act = useLatest(onAct)

  useEffect(() => {
    if (!active) return
    let cancelled = false
    let flash: ReturnType<typeof setTimeout> | undefined
    const timer = setTimeout(() => {
      requestAction(state, difficulty, state.rng + state.round, personality).then((action) => {
        if (cancelled) return
        const go = () => {
          setFocus(null)
          act(action)
        }
        const mover = action.type === 'move' || action.type === 'cast' ? action.pieceId : undefined
        if (!mover) return go()
        setFocus({ mover, target: action.type === 'move' ? pieceAt(state, action.to)?.id : undefined })
        flash = setTimeout(go, AI_FLASH_MS)
      })
    }, AI_DELAY_MS)
    return () => {
      cancelled = true
      clearTimeout(timer)
      clearTimeout(flash)
      setFocus(null)
    }
  }, [state, active, difficulty, personality, act])

  return focus
}
