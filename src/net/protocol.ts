import { FORMAT_VERSION, pack, unpack, type Packed } from '../engine/serialize'
import type { Action, GameState } from '../engine/rules/types'

/** Bumped whenever the messages change, so two different builds refuse to play each other. */
export const PROTOCOL_VERSION = 1

/** Longest message accepted; a whole challenge code is a few hundred characters. */
const MAX_MESSAGE = 20_000

export type Message =
  /** First message each way: both sides check they speak the same protocol and code format. */
  | { t: 'hello'; v: number; fmt: number }
  /** Host to guest: the match to play, as a challenge code (the court named is the guest's). */
  | { t: 'start'; challenge: string }
  /** Guest to host: the match was accepted. */
  | { t: 'ready' }
  /** An action: its number (the count of actions played before it), its packed form, and a checksum of the state after it. */
  | { t: 'act'; n: number; a: Packed; sum: string }
  | { t: 'resign' }

export const hello = (): Message => ({ t: 'hello', v: PROTOCOL_VERSION, fmt: FORMAT_VERSION })

export const actMessage = (n: number, action: Action, after: GameState): Message => ({ t: 'act', n, a: pack(action), sum: stateSum(after) })

export const encodeMessage = (message: Message): string => JSON.stringify(message)

/** The message a text holds, or null if it is damaged or not one of ours. */
export function decodeMessage(text: string): Message | null {
  if (text.length > MAX_MESSAGE) return null
  try {
    const m = JSON.parse(text) as Record<string, unknown> | null
    if (!m || typeof m !== 'object') return null
    if (m.t === 'hello' && Number.isInteger(m.v) && Number.isInteger(m.fmt)) return { t: 'hello', v: m.v as number, fmt: m.fmt as number }
    if (m.t === 'start' && typeof m.challenge === 'string') return { t: 'start', challenge: m.challenge }
    if (m.t === 'ready') return { t: 'ready' }
    if (m.t === 'resign') return { t: 'resign' }
    if (m.t === 'act' && Number.isInteger(m.n) && (m.n as number) >= 0 && Array.isArray(m.a) && typeof m.sum === 'string')
      return { t: 'act', n: m.n as number, a: m.a as Packed, sum: m.sum }
    return null
  } catch {
    return null
  }
}

/** The action an `act` message carries, or null if it is not a well-formed action. */
export const actionOf = (m: Extract<Message, { t: 'act' }>): Action | null => unpack(m.a)

/** JSON with object keys in order, so two states that are equal always print the same. */
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`
  if (value && typeof value === 'object') {
    const entries = Object.entries(value).filter(([, v]) => v !== undefined).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${canonical(v)}`).join(',')}}`
  }
  return JSON.stringify(value)
}

/** A short checksum of a whole game state (FNV-1a over its canonical text), to catch the two sides drifting apart. */
export function stateSum(state: GameState): string {
  let h = 0x811c9dc5
  for (const c of canonical(state)) {
    h ^= c.codePointAt(0)!
    h = Math.imul(h, 0x01000193) >>> 0
  }
  return h.toString(16).padStart(8, '0')
}
