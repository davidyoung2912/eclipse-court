import { decodeRecord, encodeRecord } from './engine/serialize'
import type { GameRecord } from './engine/log'

/** One unfinished game each for the two modes that cannot use the skirmish save: a Gauntlet fight and a puzzle (or Rush). */
const GAUNTLET_KEY = 'eclipse-court:saved-fight'
const PUZZLE_KEY = 'eclipse-court:saved-puzzle'

export interface SavedFight {
  /** The run it belongs to, so a fight left over from an old run is never offered. */
  seed: number
  stage: number
  record: GameRecord
}

export interface SavedPuzzle {
  index: number
  daily: boolean
  rush?: { order: number[]; score: number }
  record: GameRecord
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Resuming is a convenience; playing on without a save is fine.
  }
}

function remove(key: string) {
  try {
    localStorage.removeItem(key)
  } catch {
    // Nothing was saved either.
  }
}

/** The stored object with its record decoded, or null if absent or unreadable (which also forgets it). */
function read<T extends { code?: unknown }>(key: string): (Omit<T, 'code'> & { record: GameRecord }) | null {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    const { code, ...rest } = JSON.parse(raw) as T
    const record = typeof code === 'string' ? decodeRecord(code) : null
    if (record) return { ...rest, record }
    remove(key)
  } catch {
    // Unreadable saves are treated as absent.
  }
  return null
}

const isInt = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v) && v >= 0

export function saveFight({ record, ...rest }: SavedFight) {
  write(GAUNTLET_KEY, { ...rest, code: encodeRecord(record) })
}

export const clearFight = () => remove(GAUNTLET_KEY)

/** The fight left unfinished, if it is for this run at this stage. */
export function loadFight(run: { seed: number; stage: number } | null): SavedFight | null {
  const fight = read<SavedFight & { code: string }>(GAUNTLET_KEY)
  if (!fight) return null
  if (run && fight.seed === run.seed && fight.stage === run.stage) return fight as SavedFight
  clearFight()
  return null
}

export function savePuzzle({ record, ...rest }: SavedPuzzle) {
  write(PUZZLE_KEY, { ...rest, code: encodeRecord(record) })
}

export const clearPuzzle = () => remove(PUZZLE_KEY)

/** The puzzle left unfinished, if its number is still one that exists. */
export function loadPuzzle(count: number): SavedPuzzle | null {
  const p = read<SavedPuzzle & { code: string }>(PUZZLE_KEY)
  if (!p) return null
  const rush = p.rush
  const okRush = rush === undefined || (Array.isArray(rush.order) && rush.order.every((i) => isInt(i) && i < count) && isInt(rush.score))
  if (isInt(p.index) && p.index < count && typeof p.daily === 'boolean' && okRush) return p as SavedPuzzle
  clearPuzzle()
  return null
}
