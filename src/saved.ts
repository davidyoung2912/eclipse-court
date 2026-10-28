import type { Difficulty } from './ai/profile'
import { decodeRecord, encodeRecord } from './engine/serialize'
import type { GameRecord } from './engine/log'
import type { PersonaId } from './engine/data/personas'
import type { Court } from './engine/rules/types'

const SAVE_KEY = 'eclipse-court:saved'

/** Who is playing what, plus the game so far as a text code. */
interface Saved {
  human: Court
  difficulty: Difficulty
  campaignIndex: number | null
  /** Two people shared the device; absent in saves from before hot-seat. */
  hotSeat?: boolean
  /** A named opponent, absent in saves from before personas. */
  persona?: PersonaId
  code: string
}

export interface Resumable {
  human: Court
  difficulty: Difficulty
  campaignIndex: number | null
  hotSeat?: boolean
  persona?: PersonaId
  record: GameRecord
}

export function saveGame(game: Resumable) {
  const { record, ...rest } = game
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({ ...rest, code: encodeRecord(record) } satisfies Saved))
  } catch {
    // Resuming is a convenience; playing on without a save is fine.
  }
}

export function clearSaved() {
  try {
    localStorage.removeItem(SAVE_KEY)
  } catch {
    // Nothing was saved either.
  }
}

/** The unfinished game left behind, or null if there is none or it can no longer be read. */
export function loadSaved(): Resumable | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY)
    if (!raw) return null
    const { code, ...rest } = JSON.parse(raw) as Saved
    const record = decodeRecord(code)
    if (record) return { ...rest, record }
    clearSaved()
  } catch {
    // Unreadable saves are treated as absent.
  }
  return null
}
