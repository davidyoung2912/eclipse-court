import { decodeChallenge, encodeChallenge, type Challenge } from './engine/challenge'
import { decodeGhost, encodeGhost, type Ghost } from './engine/ghost'
import type { GameRecord } from './engine/log'
import { decodePack, encodePack, type Pack } from './engine/data/pack'
import { boardById, grandBoardById } from './engine/data/boards'
import { SETUP_INFO, type SetupMode } from './engine/data/setups'
import { modeOf, MODE_INFO, objectiveGoal } from './engine/rules/events'
import { isCustom } from './engine/data/editor'
import { decodeRecord, encodeRecord } from './engine/serialize'

/** What a pasted link or code holds. */
export type Shared =
  | { kind: 'challenge'; challenge: Challenge }
  /** A friend's daily or weekly result to beat on the same match. */
  | { kind: 'ghost'; ghost: Ghost }
  /** Several editor puzzles to keep on the Puzzles screen. */
  | { kind: 'pack'; pack: Pack }
  | { kind: 'replay'; record: GameRecord }
  /** A game played by link: the same record as a replay, but meant to be continued. */
  | { kind: 'turn'; record: GameRecord }
  /** A finished game to watch move by move: the same record as a replay, opened as a spectator. */
  | { kind: 'watch'; record: GameRecord }

const CODE = /^[A-Za-z0-9_-]+$/

/** A link to this page that opens `code` as a challenge (`c`), a replay (`r`), a spectated game (`w`), a ghost result (`x`), a puzzle pack (`p`) or a turn of a game by link (`g`). */
export function shareLink(kind: 'c' | 'r' | 'w' | 'g' | 'x' | 'p', code: string): string {
  const { origin, pathname } = window.location
  return `${origin}${pathname}#${kind}=${code}`
}

export const challengeLink = (challenge: Challenge) => shareLink('c', encodeChallenge(challenge))

export const packLink = (pack: Pack) => shareLink('p', encodePack(pack))

export const ghostLink = (ghost: Ghost) => shareLink('x', encodeGhost(ghost))

export const replayLink = (record: GameRecord) => shareLink('r', encodeRecord(record))

export const watchLink = (record: GameRecord) => shareLink('w', encodeRecord(record))

export const turnLink = (record: GameRecord) => shareLink('g', encodeRecord(record))

/**
 * Reads a whole link, a `#c=…` fragment, a `c=…` pair or a bare code. A bare code is tried as a
 * replay, then a challenge, then a ghost, then a pack. Returns null for anything that is not a valid code of this version.
 */
export function parseShared(text: string): Shared | null {
  const trimmed = text.trim()
  const hash = trimmed.includes('#') ? trimmed.slice(trimmed.indexOf('#') + 1) : trimmed
  const pair = /^([crgwxp])=(.*)$/.exec(hash)
  const code = pair ? pair[2] : hash
  if (!CODE.test(code)) return null
  const kind = pair?.[1]
  if (kind !== 'c' && kind !== 'x' && kind !== 'p') {
    const record = decodeRecord(code)
    if (record) return { kind: pair?.[1] === 'g' ? 'turn' : pair?.[1] === 'w' ? 'watch' : 'replay', record }
  }
  if (kind !== 'r' && kind !== 'g' && kind !== 'w' && kind !== 'x' && kind !== 'p') {
    const challenge = decodeChallenge(code)
    if (challenge) return { kind: 'challenge', challenge }
  }
  if (!pair || kind === 'x') {
    const ghost = decodeGhost(code)
    if (ghost) return { kind: 'ghost', ghost }
  }
  if (!pair || kind === 'p') {
    const pack = decodePack(code)
    if (pack) return { kind: 'pack', pack }
  }
  return null
}

/** Offers `url` (and a line of `text` to go with it) through the system share sheet where there is one, else copies them. */
export async function shareOrCopy(title: string, url: string, text?: string): Promise<'shared' | 'copied' | 'failed'> {
  try {
    if (typeof navigator.share === 'function') {
      await navigator.share(text ? { title, text, url } : { title, url })
      return 'shared'
    }
  } catch (e) {
    // Closing the share sheet is not an error; any other failure falls back to the clipboard.
    if (e instanceof DOMException && e.name === 'AbortError') return 'failed'
  }
  try {
    await navigator.clipboard.writeText(text ? `${text}\n${url}` : url)
    return 'copied'
  } catch {
    return 'failed'
  }
}

/** The match's rules in a few words, for the screen that asks whether to accept. */
export function describeConfig({ config }: Challenge): string[] {
  const out = isCustom(config) ? [
    `Custom ${config.size === 9 ? '9x9' : '7x7'} board from the editor`,
    `Win by: ${config.objective ? objectiveGoal(config.objective) : MODE_INFO[modeOf(config)].goal}`,
  ] : [
    `${SETUP_INFO[config.setup && config.setup in SETUP_INFO ? (config.setup as SetupMode) : 'classic'].name} army on the ${(config.size === 9 ? grandBoardById(config.board) : boardById(config.board)).name} board`,
    `Win by: ${config.objective ? objectiveGoal(config.objective) : MODE_INFO[modeOf(config)].goal}`,
  ]
  if (config.day.length !== 8) out.push(`${config.day.length}-round day`)
  if (config.reverse) out.push('Light runs the other way')
  if (config.events) out.push('Day events')
  if (config.showdown) out.push('Eclipse showdown')
  if (config.turnClock) out.push(`Blitz: ${config.turnClock.seconds} s a turn${config.turnClock.bank ? `, ${config.turnClock.bank} s extra` : ''}`)
  if (config.fog) out.push('Fog of war')
  if (config.suddenDeath) out.push(`Sudden death from round ${config.suddenDeath}`)
  if (config.edge) out.push(`${config.edge.court === 'solari' ? 'Solari' : 'Umbral'} start with +${config.edge.hp} HP a piece`)
  if (config.growth) out.push('Veterancy')
  if (config.promotion) out.push('Promotion')
  if (config.recharge) out.push(`Spells recharge after ${config.recharge} rounds`)
  if (config.loadouts) out.push('Spell loadouts')
  return out
}
