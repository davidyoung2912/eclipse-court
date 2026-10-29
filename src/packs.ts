import type { Challenge } from './engine/challenge'
import { cleanPackName, MAX_PACK, packId, validPuzzle, type Pack } from './engine/data/pack'

/** Puzzle packs the player has kept, their progress, and the editor's pack in the making. Local only. */
const KEY = 'eclipse-court:packs'
export const MAX_PACKS = 10

export interface KeptPack extends Pack {
  id: string
  /** Indexes of the puzzles solved. */
  solved: number[]
}

export interface PackStore {
  packs: KeptPack[]
  /** Puzzles collected in the editor and not yet kept or sent. */
  draft: Challenge[]
}

const readPuzzles = (raw: unknown, max: number): Challenge[] =>
  (Array.isArray(raw) ? raw : []).filter((c): c is Challenge => validPuzzle(c)).slice(0, max)

/** The saved text read back; anything damaged is dropped, and a pack with no playable puzzle goes with it. */
export function parsePacks(raw: unknown): PackStore {
  const o = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const packs: KeptPack[] = []
  for (const p of Array.isArray(o.packs) ? o.packs : []) {
    const q = (p && typeof p === 'object' ? p : {}) as Record<string, unknown>
    const name = typeof q.name === 'string' ? cleanPackName(q.name) : ''
    const puzzles = readPuzzles(q.puzzles, MAX_PACK)
    if (!name || puzzles.length === 0 || packs.length >= MAX_PACKS) continue
    const id = packId({ name, puzzles })
    if (packs.some((k) => k.id === id)) continue
    const solved = [...new Set(Array.isArray(q.solved) ? q.solved : [])]
      .filter((i): i is number => Number.isInteger(i) && i >= 0 && i < puzzles.length)
    packs.push({ id, name, puzzles, solved })
  }
  return { packs, draft: readPuzzles(o.draft, MAX_PACK) }
}

function load(): PackStore {
  try {
    return parsePacks(JSON.parse(localStorage.getItem(KEY) ?? 'null'))
  } catch {
    return parsePacks(null)
  }
}

let state = load()

const save = (next: PackStore) => {
  state = next
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    // Storage may be full or blocked; the packs still live in memory for the visit.
  }
}

export const packSnapshot = (): PackStore => state

/** Forgets everything held, in memory and in storage. */
export function clearPacks() {
  save(parsePacks(null))
  try {
    localStorage.removeItem(KEY)
  } catch {
    // Nothing stored to remove.
  }
}

/** Adds a puzzle to the pack being made; false when it is not a puzzle or the draft is full. */
export function addToDraft(puzzle: Challenge): boolean {
  if (!validPuzzle(puzzle) || state.draft.length >= MAX_PACK) return false
  save({ ...state, draft: [...state.draft, puzzle] })
  return true
}

export const removeFromDraft = (index: number) => save({ ...state, draft: state.draft.filter((_, i) => i !== index) })

export const clearDraft = () => save({ ...state, draft: [] })

/** Keeps a pack on the Puzzles screen. A pack already kept stays as it is, with its progress; false when the shelf is full or the pack is empty. */
export function keepPack(pack: Pack): boolean {
  const name = cleanPackName(pack.name)
  const puzzles = pack.puzzles.filter(validPuzzle).slice(0, MAX_PACK)
  if (!name || puzzles.length === 0) return false
  const id = packId({ name, puzzles })
  if (state.packs.some((p) => p.id === id)) return true
  if (state.packs.length >= MAX_PACKS) return false
  save({ ...state, packs: [...state.packs, { id, name, puzzles, solved: [] }] })
  return true
}

export const deletePack = (id: string) => save({ ...state, packs: state.packs.filter((p) => p.id !== id) })

export function markPackSolved(id: string, index: number) {
  save({ ...state, packs: state.packs.map((p) => (p.id === id && !p.solved.includes(index) && index < p.puzzles.length ? { ...p, solved: [...p.solved, index] } : p)) })
}
