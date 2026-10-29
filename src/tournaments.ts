import {
  CUP_SIZE, MAX_PLAYERS, MIN_PLAYERS, NONE, SHARDS_CUP_MATCH, SHARDS_CUP_WON,
  champion, cleanNames, cupField, newBracket, nextMatch, report, roundName, sidesOf, simulate,
  type Bracket, type MatchRef,
} from './engine/data/tournament'
import { PERSONAS, personaById, type PersonaId } from './engine/data/personas'

/** The tournament in progress (a hot-seat bracket or the Persona Cup) and the player's Cup record. Local only. */
const KEY = 'eclipse-court:tournaments'

type Listener = () => void
const listeners = new Set<Listener>()

export type Kind = 'hotseat' | 'cup'

export interface Active {
  kind: Kind
  bracket: Bracket
  /** Fixes the bracket's order and the Cup's simulated matches. */
  seed: number
  /** The Cup's personas; entrant 0 is the player and entrant `i` is `field[i - 1]`. Empty for hot-seat. */
  field: readonly PersonaId[]
  /** Games drawn in the match now open. */
  draws: number
}

export interface Cups {
  entered: number
  won: number
  /** Cups in which the player reached the final. */
  finals: number
}

export interface TournamentState {
  active: Active | null
  cups: Cups
}

const EMPTY: TournamentState = { active: null, cups: { entered: 0, won: 0, finals: 0 } }

/** The player is always the first entrant of a Cup. */
export const PLAYER = 0
const cupNames = (field: readonly PersonaId[]) => ['You', ...field.map((id) => personaById(id)?.name ?? id)]

const isInt = (n: unknown, min: number, max: number): n is number => typeof n === 'number' && Number.isInteger(n) && n >= min && n <= max

function parseActive(raw: unknown): Active | null {
  const o = (raw && typeof raw === 'object' ? raw : null) as Record<string, unknown> | null
  if (!o || (o.kind !== 'hotseat' && o.kind !== 'cup') || !isInt(o.seed, 0, Number.MAX_SAFE_INTEGER) || !isInt(o.draws, 0, 1)) return null
  let field: PersonaId[] = []
  let names: string[]
  if (o.kind === 'cup') {
    const ids = Array.isArray(o.field) ? o.field : []
    const known = new Set<string>(PERSONAS.map((p) => p.id))
    if (ids.length !== CUP_SIZE - 1 || new Set(ids).size !== ids.length || !ids.every((id) => typeof id === 'string' && known.has(id))) return null
    field = ids as PersonaId[]
    names = cupNames(field)
  } else {
    if (!Array.isArray(o.names) || o.names.length < MIN_PLAYERS || o.names.length > MAX_PLAYERS || !o.names.every((n) => typeof n === 'string')) return null
    names = cleanNames(o.names as string[])
  }
  const fresh = newBracket(names, o.seed)
  const rows = Array.isArray(o.results) ? o.results : []
  if (rows.length !== fresh.results.length) return null
  // Each recorded winner must be one of the two who met, replayed round by round.
  let bracket = fresh
  for (const [r, row] of rows.entries()) {
    if (!Array.isArray(row) || row.length !== fresh.results[r].length) return null
    for (const [m, w] of row.entries()) {
      if (!isInt(w, NONE, names.length - 1)) return null
      if (w === NONE || fresh.results[r][m] === w) continue
      const next = report(bracket, { round: r, match: m }, w)
      if (next === bracket) return null
      bracket = next
    }
  }
  return { kind: o.kind, bracket, seed: o.seed, field, draws: o.draws }
}

export function parseTournaments(raw: unknown): TournamentState {
  const o = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const c = (o.cups && typeof o.cups === 'object' ? o.cups : {}) as Record<string, unknown>
  const count = (n: unknown) => (isInt(n, 0, 1e6) ? n : 0)
  const entered = count(c.entered)
  const won = Math.min(count(c.won), entered)
  return { active: parseActive(o.active), cups: { entered, won, finals: Math.max(won, Math.min(count(c.finals), entered)) } }
}

function load(): TournamentState {
  try {
    return parseTournaments(JSON.parse(localStorage.getItem(KEY) ?? 'null'))
  } catch {
    return EMPTY
  }
}

/** Held in memory too, so a device without storage still keeps the bracket for the visit. */
let state = load()

function commit(next: TournamentState) {
  state = next
  try {
    localStorage.setItem(KEY, JSON.stringify({
      cups: next.cups,
      active: next.active && { kind: next.active.kind, names: next.active.bracket.names, seed: next.active.seed, field: next.active.field, draws: next.active.draws, results: next.active.bracket.results },
    }))
  } catch {
    // Without storage the bracket simply does not survive the visit.
  }
  listeners.forEach((l) => l())
}

export const tournamentSnapshot = () => state
export function subscribeTournaments(l: Listener) {
  listeners.add(l)
  return () => { listeners.delete(l) }
}

/** Starts a hot-seat bracket for 4 to 8 players, replacing any tournament in progress. */
export function startHotSeat(names: readonly string[], seed: number): boolean {
  if (names.length < MIN_PLAYERS || names.length > MAX_PLAYERS) return false
  commit({ ...state, active: { kind: 'hotseat', bracket: newBracket(cleanNames(names), seed), seed, field: [], draws: 0 } })
  return true
}

/** Starts a Persona Cup, replacing any tournament in progress; the matches between personas are played out up to the player's first. */
export function startCup(seed: number) {
  const field = cupField(seed)
  const bracket = simulate(newBracket(cupNames(field), seed), seed, PLAYER)
  commit({ active: { kind: 'cup', bracket, seed, field, draws: 0 }, cups: { ...state.cups, entered: state.cups.entered + 1 } })
}

/** Drops the tournament in progress (or shows no more of a finished one). */
export function clearTournament() {
  if (state.active) commit({ ...state, active: null })
}

/** The open match, if the tournament is not over. */
export const openMatch = (a: Active): MatchRef | null => nextMatch(a.bracket)

/**
 * The entrant on each court in the open match. The Cup's player is Solari; in hot-seat the first side is Solari
 * and a drawn game is played again with the courts swapped.
 */
export function matchCourts(a: Active): { solari: number; umbral: number } | null {
  const ref = openMatch(a)
  if (!ref) return null
  const [x, y] = sidesOf(a.bracket, ref)
  if (a.kind === 'cup') return x === PLAYER ? { solari: x, umbral: y } : { solari: y, umbral: x }
  return a.draws % 2 === 0 ? { solari: x, umbral: y } : { solari: y, umbral: x }
}

export interface Outcome {
  shards: number
  lines: string[]
}

/** Notes the result of the open match: the winning entrant, or `'draw'`. The caller adds the Shards. */
export function settleMatch(result: number | 'draw'): Outcome {
  const a = state.active
  const ref = a && openMatch(a)
  if (!a || !ref) return { shards: 0, lines: [] }
  const rounds = a.bracket.results.length
  const [x, y] = sidesOf(a.bracket, ref)
  const names = a.bracket.names
  const round = roundName(ref.round, rounds)

  if (result === 'draw') {
    // Hot-seat: the second draw goes to the first side. The Cup is played again until someone wins.
    if (a.kind === 'hotseat' && a.draws >= 1) return settleMatch(x)
    commit({ ...state, active: { ...a, draws: a.draws + 1 } })
    return { shards: 0, lines: [a.kind === 'cup' ? `${round} drawn: play it again.` : `Drawn: play it again with the courts swapped.`] }
  }
  if (result !== x && result !== y) return { shards: 0, lines: [] }

  let bracket = report(a.bracket, ref, result)
  if (a.kind === 'hotseat') {
    commit({ ...state, active: { ...a, bracket, draws: 0 } })
    const done = champion(bracket)
    return { shards: 0, lines: [done === null ? `${round}: ${names[result]} advances.` : `${names[done]} wins the tournament.`] }
  }

  const won = result === PLAYER
  bracket = simulate(bracket, a.seed, PLAYER)
  let cups = state.cups
  const lines: string[] = []
  let shards = 0
  const winner = champion(bracket)
  if (won) {
    shards = SHARDS_CUP_MATCH
    lines.push(`${round} won. +${SHARDS_CUP_MATCH} Shards.`)
    if (ref.round === rounds - 2) cups = { ...cups, finals: cups.finals + 1 }
    if (winner === PLAYER) {
      shards += SHARDS_CUP_WON
      cups = { ...cups, won: cups.won + 1 }
      lines.push(`You win the Persona Cup! +${SHARDS_CUP_WON} Shards.`)
    }
  } else {
    lines.push(`Knocked out in the ${round} by ${names[result]}.`)
    if (winner !== null) lines.push(`${names[winner]} takes the Cup.`)
  }
  commit({ cups, active: { ...a, bracket, draws: 0 } })
  return { shards, lines }
}
