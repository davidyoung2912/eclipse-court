import { recordOf, replaySteps, type GameRecord } from './log'
import { newGame } from './reducer'
import type { Action, Court, GameState, MatchConfig, MatchMode, Perk, Pos, PromotionRole, Role, Spell } from './rules/types'
import { ALL_SPELLS } from './rules/spells'

const MODES: readonly MatchMode[] = ['beacons', 'leader', 'score', 'hill']
const PERKS: readonly Perk[] = ['might', 'ward', 'vigour']
const PROMOTED: readonly PromotionRole[] = ['charger', 'marksman']
const ROLES: readonly Role[] = ['footsoldier', 'flier', 'marksman', 'bruiser', 'charger', 'aura', 'leader']

/** Bumped whenever the encoding changes, so old saves and links are recognised and refused cleanly. */
export const FORMAT_VERSION = 1

/** Parts of an opening position that a match config does not determine (campaign handicaps, say). */
type Overrides = Partial<Pick<GameState, 'pieces' | 'spells' | 'dir'>>

/** Actions as short arrays: [0, piece, x, y, attackerHp?, defenderHp?, perk?, promotion?] (a gap is -1 / ''), [1, spell, piece?, x?, y?], [2]. */
type Packed = (string | number)[]

interface Payload {
  v: number
  c: MatchConfig
  o?: Overrides
  a: Packed[]
}

const OVERRIDE_KEYS = ['pieces', 'spells', 'dir'] as const

function pack(a: Action): Packed {
  if (a.type === 'pass') return [2]
  if (a.type === 'move') {
    const base: Packed = [0, a.pieceId, a.to.x, a.to.y]
    if (a.duel) base.push(a.duel.attackerHp, a.duel.defenderHp)
    else if (a.perk || a.promote) base.push(-1, -1)
    if (a.perk || a.promote) base.push(a.perk ?? '', a.promote ?? '')
    return base
  }
  return a.to ? [1, a.spell, a.pieceId ?? '', a.to.x, a.to.y] : a.pieceId ? [1, a.spell, a.pieceId] : [1, a.spell]
}

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)
const isStr = (v: unknown): v is string => typeof v === 'string'

function unpack(p: unknown): Action | null {
  if (!Array.isArray(p)) return null
  if (p[0] === 2) return { type: 'pass' }
  if (p[0] === 0 && isStr(p[1]) && isNum(p[2]) && isNum(p[3])) {
    const move: Action = { type: 'move', pieceId: p[1], to: { x: p[2], y: p[3] } }
    if (isNum(p[4]) && isNum(p[5]) && p[4] >= 0) move.duel = { attackerHp: p[4], defenderHp: p[5] }
    if (isStr(p[6]) && (PERKS as readonly string[]).includes(p[6])) move.perk = p[6] as Perk
    if (isStr(p[7]) && (PROMOTED as readonly string[]).includes(p[7])) move.promote = p[7] as PromotionRole
    return move
  }
  if (p[0] === 1 && isStr(p[1]) && (ALL_SPELLS as readonly string[]).includes(p[1])) {
    const cast: Action = { type: 'cast', spell: p[1] as Spell }
    if (isStr(p[2]) && p[2]) cast.pieceId = p[2]
    if (isNum(p[3]) && isNum(p[4])) cast.to = { x: p[3], y: p[4] }
    return cast
  }
  return null
}

function toBase64Url(text: string): string {
  const bytes = new TextEncoder().encode(text)
  let binary = ''
  for (const b of bytes) binary += String.fromCharCode(b)
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '')
}

function fromBase64Url(code: string): string {
  const padded = code.replaceAll('-', '+').replaceAll('_', '/').padEnd(Math.ceil(code.length / 4) * 4, '=')
  const binary = atob(padded)
  return new TextDecoder().decode(Uint8Array.from(binary, (c) => c.charCodeAt(0)))
}

/**
 * A game as a short text code: the match config, anything about the opening that differs from what
 * the config alone would give, and the actions. Everything else is rebuilt by replaying.
 */
export function encodeRecord(record: GameRecord): string {
  const fresh = newGame(record.initial.config)
  const overrides: Overrides = {}
  for (const key of OVERRIDE_KEYS)
    if (JSON.stringify(record.initial[key]) !== JSON.stringify(fresh[key])) Object.assign(overrides, { [key]: record.initial[key] })
  const payload: Payload = { v: FORMAT_VERSION, c: record.initial.config, a: record.actions.map(pack) }
  if (Object.keys(overrides).length) payload.o = overrides
  return toBase64Url(JSON.stringify(payload))
}

const validPos = (p: Partial<Pos> | undefined) => isNum(p?.x) && isNum(p?.y)
const validLayout = (l: unknown) =>
  Array.isArray(l) && l.every((p) => isStr(p?.role) && ROLES.includes(p.role as Role) && validPos(p))

const validLoadouts = (l: Partial<Record<Court, unknown>>) =>
  (['solari', 'umbral'] as const).every((c) => Array.isArray(l[c]) && (l[c] as unknown[]).every((s) => isStr(s) && (ALL_SPELLS as readonly string[]).includes(s)))

const validConfig = (c: Partial<MatchConfig> | undefined): c is MatchConfig =>
  !!c && isNum(c.seed) && isNum(c.eclipseRound) && isNum(c.roundLimit) &&
  Array.isArray(c.day) && c.day.length > 0 && c.day.every(isNum) &&
  Array.isArray(c.beacons) && c.beacons.every((b) => isNum(b?.x) && isNum(b?.y)) &&
  validLayout(c.layout) && (c.umbralLayout === undefined || validLayout(c.umbralLayout)) &&
  (c.blocked === undefined || (Array.isArray(c.blocked) && c.blocked.every(validPos))) &&
  (c.setup === undefined || isStr(c.setup)) && (c.board === undefined || isStr(c.board)) &&
  (c.loadouts === undefined || validLoadouts(c.loadouts)) &&
  (c.recharge === undefined || isNum(c.recharge)) && (c.passives === undefined || typeof c.passives === 'boolean') &&
  (c.mode === undefined || (MODES as readonly unknown[]).includes(c.mode)) &&
  (['events', 'showdown', 'reverse', 'growth', 'promotion'] as const).every((k) => c[k] === undefined || typeof c[k] === 'boolean')

/** The game a code describes, or null if it is damaged, from another version, or not a legal game. */
export function decodeRecord(code: string): GameRecord | null {
  try {
    const payload = JSON.parse(fromBase64Url(code)) as Partial<Payload>
    if (payload.v !== FORMAT_VERSION || !validConfig(payload.c) || !Array.isArray(payload.a)) return null
    const actions = payload.a.map(unpack)
    if (actions.some((a) => a === null)) return null
    const initial: GameState = { ...newGame(payload.c), ...payload.o }
    const steps = replaySteps(initial, actions as Action[])
    return steps && recordOf(steps)
  } catch {
    return null
  }
}
