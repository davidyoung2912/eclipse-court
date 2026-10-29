import type { Difficulty } from './data/difficulty'
import { dailyMatch } from './data/daily'
import type { PersonalityId } from './data/personality'
import { dailySeed } from './data/setups'
import { weeklyMatch, weeklyScore, WEEKLY_COURT } from './data/weekly'
import { decodeRecord, fromBase64Url, FORMAT_VERSION, toBase64Url } from './serialize'
import type { Court, MatchConfig } from './rules/types'

/** A daily or weekly result sent to a friend, with the game that earned it where it fits in a code. */
export interface Ghost {
  kind: 'daily' | 'weekly'
  /** The day (daily) or the week's Monday (weekly) as a `dailySeed`. */
  id: number
  won: boolean
  draw: boolean
  turns: number
  lost: number
  /** The game as a record code, so the friend can watch it. */
  record?: string
}

interface Payload {
  v: number
  k: 'd' | 'w'
  i: number
  w: 0 | 1
  d: 0 | 1
  t: number
  l: number
  r?: string
}

/** A record longer than this is left out of a ghost code, which would otherwise be too long to send. */
export const MAX_GHOST_RECORD = 6000

/** The match a ghost was set on, rebuilt from its date. */
export interface GhostMatch {
  config: MatchConfig
  court: Court
  difficulty: Difficulty
  personality: PersonalityId
  blurb: string
}

const dateOf = (seed: number) => new Date(Math.floor(seed / 10000), Math.floor((seed % 10000) / 100) - 1, seed % 100)

/** The match of the ghost's day or week, or null if the date is not a real day (or a week's Monday). */
export function ghostMatch({ kind, id }: Pick<Ghost, 'kind' | 'id'>): GhostMatch | null {
  if (!Number.isInteger(id) || id < 20000101 || id > 99991231) return null
  const date = dateOf(id)
  if (dailySeed(date) !== id) return null
  if (kind === 'daily') {
    const m = dailyMatch(date)
    return { config: m.config, court: m.court, difficulty: m.difficulty, personality: m.personality, blurb: m.blurb }
  }
  const m = weeklyMatch(date)
  return m.week === id ? { config: m.config, court: WEEKLY_COURT, difficulty: m.difficulty, personality: m.personality, blurb: m.blurb } : null
}

/** Points for a ghost's result; both kinds use the weekly scale so two results compare. */
export const ghostScore = (g: Pick<Ghost, 'won' | 'draw' | 'turns' | 'lost'>) => weeklyScore(g)

export function encodeGhost(g: Ghost): string {
  const payload: Payload = { v: FORMAT_VERSION, k: g.kind === 'daily' ? 'd' : 'w', i: g.id, w: g.won ? 1 : 0, d: g.draw ? 1 : 0, t: g.turns, l: g.lost }
  if (g.record && g.record.length <= MAX_GHOST_RECORD) payload.r = g.record
  return toBase64Url(JSON.stringify(payload))
}

const count = (x: unknown, max: number): x is number => typeof x === 'number' && Number.isInteger(x) && x >= 0 && x <= max

/** The ghost a code holds, or null if it is damaged, from another version, from a date with no match, or carries a game that is not that match. */
export function decodeGhost(code: string): Ghost | null {
  try {
    const p = JSON.parse(fromBase64Url(code)) as Partial<Payload>
    if (p.v !== FORMAT_VERSION || (p.k !== 'd' && p.k !== 'w') || !count(p.i, 99991231) || (p.w !== 0 && p.w !== 1) || (p.d !== 0 && p.d !== 1)) return null
    if (!count(p.t, 1000) || !count(p.l, 24) || (p.w === 1 && p.d === 1)) return null
    const ghost: Ghost = { kind: p.k === 'd' ? 'daily' : 'weekly', id: p.i, won: p.w === 1, draw: p.d === 1, turns: p.t, lost: p.l }
    const match = ghostMatch(ghost)
    if (!match) return null
    if (p.r !== undefined) {
      if (typeof p.r !== 'string' || p.r.length > MAX_GHOST_RECORD || !/^[A-Za-z0-9_-]+$/.test(p.r)) return null
      const record = decodeRecord(p.r)
      if (!record || JSON.stringify(record.initial.config) !== JSON.stringify(match.config)) return null
      ghost.record = p.r
    }
    return ghost
  } catch {
    return null
  }
}

export type GhostVerdict = 'ahead' | 'level' | 'behind'

/** How a finished game of the ghost's match compares with the ghost's result. */
export function compareGhost(ghost: Ghost, mine: Pick<Ghost, 'won' | 'draw' | 'turns' | 'lost'>): { verdict: GhostVerdict; mine: number; theirs: number } {
  const m = ghostScore(mine)
  const theirs = ghostScore(ghost)
  return { verdict: m > theirs ? 'ahead' : m < theirs ? 'behind' : 'level', mine: m, theirs }
}
