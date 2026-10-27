import { ROLE_NAMES } from '../engine/data/roster'
import { estimateOdds } from '../engine/reducer'
import { isBeacon } from '../engine/rules/board'
import { favouredCourt, squareLuminance } from '../engine/rules/luminance'
import { leaderOf, SPELL_INFO } from '../engine/rules/spells'
import { pieceAt } from '../engine/rules/moves'
import type { Action, GameState, Pos } from '../engine/rules/types'

/** Strategy search strength used for hints: the best the AI can offer. */
export const HINT_DIFFICULTY = 'hard' as const

/** A recommended action, described for the context card and for the board to illustrate. */
export interface Hint {
  action: Action
  headline: string
  detail: string
  /** The piece to glow: the mover, attacker or caster. */
  mover?: string
  /** An enemy (or spell target) to flash. */
  target?: string
  /** Where the mover travels to, when it travels; the board loops the movement. */
  from?: Pos
  to?: Pos
  /** A square to mark for a spell that lands on one. */
  square?: Pos
}

const pct = (n: number) => `${Math.round(n * 100)}%`

/** Turns the action the AI would take for the side to move into a plain-language hint. */
export function describeHint(state: GameState, action: Action): Hint {
  const court = state.turn
  const name = (id: string) => {
    const p = state.pieces.find((x) => x.id === id)
    return p ? ROLE_NAMES[p.court][p.role] : 'piece'
  }
  if (action.type === 'pass')
    return { action, headline: 'End your turn', detail: 'No move improves your position right now, so hold and let the light turn.' }

  if (action.type === 'cast') {
    const info = SPELL_INFO[action.spell]
    const leader = leaderOf(state, court)
    const target = action.pieceId
    return {
      action,
      headline: target ? `Cast ${info.name} on ${name(target)}` : `Cast ${info.name}`,
      detail: `${info.text} Costs 1 HP and ends your turn.`,
      mover: leader?.id,
      target,
      from: action.spell === 'blink' ? leader?.pos : undefined,
      to: action.spell === 'blink' ? action.to : undefined,
      square: action.to,
    }
  }

  const mover = state.pieces.find((p) => p.id === action.pieceId)!
  const victim = pieceAt(state, action.to)
  const lum = squareLuminance(state, action.to)
  if (victim) {
    const odds = estimateOdds(mover, victim, lum)
    const edge = odds.attacker >= odds.defender ? 'You are favoured' : 'A risky fight, but the position is worth it'
    return {
      action,
      headline: `Attack ${name(victim.id)} with ${name(mover.id)}`,
      detail: `${edge}: win ${pct(odds.attacker)}, draw ${pct(odds.other)}, lose ${pct(odds.defender)}.`,
      mover: mover.id,
      target: victim.id,
    }
  }
  const why = isBeacon(action.to)
    ? 'It takes a beacon: spell-proof, heals +1, and beacons win the game.'
    : favouredCourt(lum) === court
      ? 'The light favours your court on that square.'
      : 'It improves your position.'
  return {
    action,
    headline: `Move ${name(mover.id)} to the pulsing square`,
    detail: why,
    mover: mover.id,
    from: mover.pos,
    to: action.to,
  }
}
