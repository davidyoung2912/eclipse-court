import { decodeChallenge, encodeChallenge, type Challenge } from './engine/challenge'
import type { GameRecord } from './engine/log'
import { boardById } from './engine/data/boards'
import { SETUP_INFO, type SetupMode } from './engine/data/setups'
import { modeOf, MODE_INFO } from './engine/rules/events'
import { decodeRecord, encodeRecord } from './engine/serialize'

/** What a pasted link or code holds. */
export type Shared =
  | { kind: 'challenge'; challenge: Challenge }
  | { kind: 'replay'; record: GameRecord }

const CODE = /^[A-Za-z0-9_-]+$/

/** A link to this page that opens `code` as a challenge (`c`) or a replay (`r`). */
export function shareLink(kind: 'c' | 'r', code: string): string {
  const { origin, pathname } = window.location
  return `${origin}${pathname}#${kind}=${code}`
}

export const challengeLink = (challenge: Challenge) => shareLink('c', encodeChallenge(challenge))

export const replayLink = (record: GameRecord) => shareLink('r', encodeRecord(record))

/**
 * Reads a whole link, a `#c=…` fragment, a `c=…` pair or a bare code. A bare code is tried as a
 * replay and then as a challenge. Returns null for anything that is not a valid code of this version.
 */
export function parseShared(text: string): Shared | null {
  const trimmed = text.trim()
  const hash = trimmed.includes('#') ? trimmed.slice(trimmed.indexOf('#') + 1) : trimmed
  const pair = /^([cr])=(.*)$/.exec(hash)
  const code = pair ? pair[2] : hash
  if (!CODE.test(code)) return null
  if (pair?.[1] !== 'c') {
    const record = decodeRecord(code)
    if (record) return { kind: 'replay', record }
  }
  if (pair?.[1] !== 'r') {
    const challenge = decodeChallenge(code)
    if (challenge) return { kind: 'challenge', challenge }
  }
  return null
}

/** Offers `url` through the system share sheet where there is one, else copies it. */
export async function shareOrCopy(title: string, url: string): Promise<'shared' | 'copied' | 'failed'> {
  try {
    if (typeof navigator.share === 'function') {
      await navigator.share({ title, url })
      return 'shared'
    }
  } catch (e) {
    // Closing the share sheet is not an error; any other failure falls back to the clipboard.
    if (e instanceof DOMException && e.name === 'AbortError') return 'failed'
  }
  try {
    await navigator.clipboard.writeText(url)
    return 'copied'
  } catch {
    return 'failed'
  }
}

/** The match's rules in a few words, for the screen that asks whether to accept. */
export function describeConfig({ config }: Challenge): string[] {
  const out = [
    `${SETUP_INFO[config.setup && config.setup in SETUP_INFO ? (config.setup as SetupMode) : 'classic'].name} army on the ${boardById(config.board).name} board`,
    `Win by: ${MODE_INFO[modeOf(config)].goal}`,
  ]
  if (config.day.length !== 8) out.push(`${config.day.length}-round day`)
  if (config.reverse) out.push('Light runs the other way')
  if (config.events) out.push('Day events')
  if (config.showdown) out.push('Eclipse showdown')
  if (config.growth) out.push('Veterancy')
  if (config.promotion) out.push('Promotion')
  if (config.recharge) out.push(`Spells recharge after ${config.recharge} rounds`)
  if (config.loadouts) out.push('Spell loadouts')
  return out
}
