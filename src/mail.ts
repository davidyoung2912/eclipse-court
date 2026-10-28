/** Play by link: a game passed back and forth one move at a time, each link carrying the whole record. */
import { replay, type GameRecord } from './engine/log'
import { decodeRecord, encodeRecord, pack } from './engine/serialize'
import { otherCourt } from './engine/rules/board'
import type { Court } from './engine/rules/types'

const KEY = 'eclipse-court:mail'
const MAX_GAMES = 20

export interface MailGame {
  id: string
  /** The court this device plays. */
  me: Court
  /** The game so far, as a record code. */
  code: string
  updated: number
}

/** What a pasted record means for the game this device holds. */
export type Receipt =
  /** Not seen before: this device takes the court whose turn it is. */
  | { kind: 'new'; me: Court }
  /** A game that is already decided; there is nothing to play. */
  | { kind: 'over' }
  /** Holds the game plus at least one more move. */
  | { kind: 'update' }
  /** The held game already has everything the record has. */
  | { kind: 'known' }
  /** The record does not continue the held game. */
  | { kind: 'clash' }

const actionKeys = (record: GameRecord) => record.actions.map((a) => JSON.stringify(pack(a)))

/** Two records began from the same position. */
export const sameStart = (a: GameRecord, b: GameRecord) => JSON.stringify(a.initial) === JSON.stringify(b.initial)

/** A short stable name for a game, taken from the position it began from. */
export function gameId(record: GameRecord): string {
  const text = JSON.stringify(record.initial)
  let h = 5381
  for (let i = 0; i < text.length; i++) h = (Math.imul(h, 33) ^ text.charCodeAt(i)) >>> 0
  return h.toString(36)
}

/** The court to move, or null once the game is decided. */
export const toMove = (record: GameRecord): Court | null => {
  const end = replay(record)
  return end && !end.winner ? end.turn : null
}

/** Whether `incoming` is `held` with moves added, the same, shorter, or a different game. */
export function receive(held: GameRecord | null, incoming: GameRecord): Receipt {
  if (!held) {
    const turn = toMove(incoming)
    return turn ? { kind: 'new', me: turn } : { kind: 'over' }
  }
  if (!sameStart(held, incoming)) return { kind: 'clash' }
  const have = actionKeys(held)
  const got = actionKeys(incoming)
  const shared = Math.min(have.length, got.length)
  if (!have.slice(0, shared).every((k, i) => k === got[i])) return { kind: 'clash' }
  return got.length > have.length ? { kind: 'update' } : { kind: 'known' }
}

export type MailStatus = 'yours' | 'theirs' | 'won' | 'lost' | 'draw'

export function statusOf(record: GameRecord, me: Court): MailStatus {
  const end = replay(record)
  if (end?.winner === 'draw') return 'draw'
  if (end?.winner) return end.winner === me ? 'won' : 'lost'
  return end?.turn === me ? 'yours' : 'theirs'
}

export const foeOf = (game: MailGame): Court => otherCourt(game.me)

/** The held game as a record, or null if the saved code no longer decodes (another version). */
export const recordOfGame = (game: MailGame): GameRecord | null => decodeRecord(game.code)

function read(): MailGame[] {
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(KEY) ?? 'null')
    if (!Array.isArray(raw)) return []
    return raw
      .filter((g): g is MailGame => !!g && typeof g.id === 'string' && (g.me === 'solari' || g.me === 'umbral') && typeof g.code === 'string')
      .map((g) => ({ ...g, updated: Number.isFinite(g.updated) ? g.updated : 0 }))
      .slice(0, MAX_GAMES)
  } catch {
    return []
  }
}

/** Held in memory too, so a device without storage works for the visit. */
let games = read()

function save(next: MailGame[]) {
  games = next
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    // Without storage the games last until the page closes.
  }
}

/** Games in progress, most recently changed first. */
export const mailGames = (): readonly MailGame[] => games

export const mailGame = (id: string): MailGame | undefined => games.find((g) => g.id === id)

/** Keeps `record` as the state of its game, as the court `me`. */
export function putMail(record: GameRecord, me: Court, now = Date.now()): MailGame {
  const game: MailGame = { id: gameId(record), me, code: encodeRecord(record), updated: now }
  save([game, ...games.filter((g) => g.id !== game.id)].slice(0, MAX_GAMES))
  return game
}

export const dropMail = (id: string) => save(games.filter((g) => g.id !== id))
