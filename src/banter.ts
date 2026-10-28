import { LINE_BANKS, type LineCategory } from './engine/data/personaLines'
import type { PersonaId } from './engine/data/personas'
import { otherCourt } from './engine/rules/board'
import { legalMoves, pieceAt } from './engine/rules/moves'
import { rngNext } from './engine/rng'
import type { Action, Court, GameState } from './engine/rules/types'
import type { BanterLevel } from './settings'

/** The fewest plies (single actions) between two lines, so a persona does not chatter on every move. */
export const COOLDOWN_PLIES = 3

/** Moments that always get a line, whatever the cooldown. */
const URGENT: readonly LineCategory[] = ['win', 'lose', 'draw', 'eclipse']

/** Whether the Banter setting lets a line of this category be shown: Quiet keeps only the urgent moments. */
export const lineAllowed = (level: BanterLevel, category: LineCategory): boolean => level === 'full' || (level === 'quiet' && URGENT.includes(category))

const isLeaderThreatened = (state: GameState, court: Court): boolean => {
  const leader = state.pieces.find((p) => p.court === court && p.role === 'leader')
  if (!leader || leader.shrouded) return false
  return state.pieces.some((p) => p.court === otherCourt(court) && legalMoves(state, p).some((to) => to.x === leader.pos.x && to.y === leader.pos.y))
}

/** Which court holds each beacon, in the order of `config.beacons` (null when empty). */
const beaconHolders = (state: GameState) => state.config.beacons.map((b) => pieceAt(state, b)?.court ?? null)

/** What a duel or capture means for the persona's court `side`, or null when nothing fell. */
function fightTrigger(before: GameState, action: Extract<Action, { type: 'move' }>, side: Court): LineCategory | null {
  const mover = before.pieces.find((p) => p.id === action.pieceId)
  const target = pieceAt(before, action.to)
  if (!mover || !target || target.court === mover.court) return null
  const mine = mover.court === side
  const { duel } = action
  if (!duel) return mine ? 'capture' : 'lose-piece'
  if (duel.defenderHp <= 0) return duel.attackerHp > 0 ? (mine ? 'duel-win' : 'lose-piece') : (mine ? 'capture' : 'lose-piece')
  if (duel.attackerHp <= 0) return mine ? 'duel-loss' : 'duel-win'
  return null
}

/**
 * The line category a persona on court `side` would speak for one action, or null for a quiet move.
 * `first` is true when this is that persona's own first action of the game.
 */
export function triggerFor(before: GameState, action: Action, after: GameState, side: Court, first = false): LineCategory | null {
  if (after.winner) return after.winner === 'draw' ? 'draw' : after.winner === side ? 'win' : 'lose'
  if (after.eclipse && !before.eclipse) return 'eclipse'
  if (action.type === 'move') {
    const fight = fightTrigger(before, action, side)
    if (fight) return fight
  }
  const foe = otherCourt(side)
  if (isLeaderThreatened(after, side) && !isLeaderThreatened(before, side)) return 'danger'
  if (isLeaderThreatened(after, foe) && !isLeaderThreatened(before, foe)) return 'threat'
  const was = beaconHolders(before)
  const now = beaconHolders(after)
  if (now.some((c, i) => c === side && was[i] !== side)) return 'beacon-gain'
  if (now.some((c, i) => c === foe && was[i] !== foe)) return 'beacon-lose'
  if (action.type === 'cast') return 'spell'
  if (first && before.turn === side) return 'open'
  return null
}

/** A persona's talking so far: when it last spoke and where it is in each category's shuffled deck. */
export interface BanterState {
  rng: number
  /** The ply of the last line, or -Infinity before the first. */
  lastPly: number
  decks: Partial<Record<LineCategory, { order: number[]; next: number }>>
}

export const newBanter = (seed: number): BanterState => ({ rng: seed >>> 0, lastPly: -Infinity, decks: {} })

function shuffled(size: number, rng: number, avoidFirst: number): [number[], number] {
  const order = Array.from({ length: size }, (_, i) => i)
  for (let i = size - 1; i > 0; i--) {
    const [r, next] = rngNext(rng)
    rng = next
    const j = Math.floor(r * (i + 1))
    ;[order[i], order[j]] = [order[j], order[i]]
  }
  // Do not open a new deck with the line that closed the last one.
  if (size > 1 && order[0] === avoidFirst) [order[0], order[1]] = [order[1], order[0]]
  return [order, rng]
}

/**
 * Picks the next line for a category, cycling through the whole bank before any line returns.
 * Returns null while the cooldown holds (urgent categories ignore it). `ply` counts actions played so far.
 */
export function speak(banter: BanterState, id: PersonaId, category: LineCategory, ply: number): { line: string; banter: BanterState } | null {
  if (!URGENT.includes(category) && ply - banter.lastPly < COOLDOWN_PLIES) return null
  const bank = LINE_BANKS[id][category]
  if (!bank.length) return null
  let deck = banter.decks[category]
  let rng = banter.rng
  if (!deck || deck.next >= deck.order.length) {
    const last = deck ? deck.order[deck.order.length - 1] : -1
    const [order, next] = shuffled(bank.length, rng, last)
    deck = { order, next: 0 }
    rng = next
  }
  const line = bank[deck.order[deck.next]]
  return { line, banter: { rng, lastPly: ply, decks: { ...banter.decks, [category]: { order: deck.order, next: deck.next + 1 } } } }
}
