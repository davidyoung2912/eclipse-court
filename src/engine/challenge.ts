import { fromBase64Url, FORMAT_VERSION, toBase64Url, validConfig } from './serialize'
import type { Court, MatchConfig } from './rules/types'

/** A match to play with no moves made yet, and the court the recipient is invited to take. */
export interface Challenge {
  config: MatchConfig
  side: Court
}

interface Payload {
  v: number
  c: MatchConfig
  s: Court
}

/** A challenge as a short text code. It shares the record format's version, so a change to the config invalidates both. */
export function encodeChallenge({ config, side }: Challenge): string {
  return toBase64Url(JSON.stringify({ v: FORMAT_VERSION, c: config, s: side } satisfies Payload))
}

/** The challenge a code describes, or null if it is damaged, from another version, or asks for something out of range. */
export function decodeChallenge(code: string): Challenge | null {
  try {
    const payload = JSON.parse(fromBase64Url(code)) as Partial<Payload>
    if (payload.v !== FORMAT_VERSION || !validConfig(payload.c) || (payload.s !== 'solari' && payload.s !== 'umbral')) return null
    return { config: payload.c, side: payload.s }
  } catch {
    return null
  }
}
