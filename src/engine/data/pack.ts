import type { Challenge } from '../challenge'
import { fromBase64Url, FORMAT_VERSION, toBase64Url, validConfig } from '../serialize'
import type { MatchConfig } from '../rules/types'
import { designFromConfig, isCustom, isPuzzleGoal, problems } from './editor'

export const MAX_PACK = 12
export const MAX_PACK_NAME = 24

/** A named set of editor puzzles shared as one code. Every puzzle is Solari's. */
export interface Pack {
  name: string
  puzzles: Challenge[]
}

interface Payload {
  v: number
  n: string
  p: MatchConfig[]
}

export const cleanPackName = (name: string) => name.trim().slice(0, MAX_PACK_NAME)

/** Whether a challenge is a puzzle the editor could have made: a puzzle goal, Solari's side and no problems the editor would report. */
export function validPuzzle(c: Challenge | null | undefined): c is Challenge {
  const o = c?.config?.objective
  if (!c || c.side !== 'solari' || !validConfig(c.config) || !isCustom(c.config) || !o || !isPuzzleGoal(o.kind)) return false
  return problems(designFromConfig(c.config, c.side)).length === 0
}

/** A pack as a short text code; its version is the record format's, so a config change invalidates it too. */
export function encodePack({ name, puzzles }: Pack): string {
  return toBase64Url(JSON.stringify({ v: FORMAT_VERSION, n: cleanPackName(name), p: puzzles.map((c) => c.config) } satisfies Payload))
}

/** The pack a code describes, or null if it is damaged, from another version, empty, too long or holds a puzzle that cannot be played. */
export function decodePack(code: string): Pack | null {
  try {
    const payload = JSON.parse(fromBase64Url(code)) as Partial<Payload>
    if (payload.v !== FORMAT_VERSION || typeof payload.n !== 'string' || !cleanPackName(payload.n)) return null
    if (!Array.isArray(payload.p) || payload.p.length === 0 || payload.p.length > MAX_PACK) return null
    const puzzles = payload.p.map((config): Challenge => ({ config, side: 'solari' }))
    return puzzles.every(validPuzzle) ? { name: cleanPackName(payload.n), puzzles } : null
  } catch {
    return null
  }
}

/** A short stable id for a pack, so the same pack opened twice is kept once. */
export function packId(pack: Pack): string {
  let h = 0
  for (const ch of encodePack(pack)) h = (Math.imul(h, 31) + ch.charCodeAt(0)) | 0
  return `k${(h >>> 0).toString(36)}`
}

/** A puzzle's goal and its round limit, for a list of puzzles. */
export function puzzleGoal(c: Challenge): { kind: 'survive' | 'escort' | 'hold'; limit: number } {
  const o = c.config.objective!
  return { kind: o.kind, limit: o.kind === 'survive' ? o.rounds : o.limit }
}
