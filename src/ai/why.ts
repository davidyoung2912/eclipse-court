import { ROLE_NAMES } from '../engine/data/roster'
import { PERSONALITIES, type PersonalityId } from '../engine/data/personality'
import { estimateOdds } from '../engine/reducer'
import { isBeacon } from '../engine/rules/board'
import { duelCells } from '../engine/rules/cells'
import { favouredCourt, squareLuminance } from '../engine/rules/luminance'
import { legalMoves, pieceAt } from '../engine/rules/moves'
import { SPELL_INFO } from '../engine/rules/spells'
import type { Action, GameState, Pos } from '../engine/rules/types'

const same = (a: Pos, b: Pos) => a.x === b.x && a.y === b.y

/** What each personality is going for, said in its own voice when nothing more specific applies. */
const TASTE: Record<PersonalityId, string> = {
  balanced: 'It improves the position.',
  rusher: 'It keeps up the pressure.',
  turtle: 'It keeps its pieces safe.',
  grabber: 'It is racing for the beacons.',
  caster: 'It wants its Leader casting.',
}

/** Whether any piece of the side not on move could attack `at` next turn. */
function attacked(state: GameState, at: Pos, court: GameState['turn']): boolean {
  return state.pieces.some((f) => f.court !== court && legalMoves(state, f).some((to) => same(to, at)))
}

/**
 * A one-line reason for the action the AI is about to play from `state`, read off the position
 * rather than the search: the plainest factor that the move serves, then the personality's taste.
 */
export function explainMove(state: GameState, action: Action, personality: PersonalityId = 'balanced'): string {
  const court = state.turn
  const name = (id: string) => {
    const p = state.pieces.find((x) => x.id === id)
    return p ? ROLE_NAMES[p.court][p.role] : 'piece'
  }
  const who = PERSONALITIES[personality].name
  const line = (reason: string) => (personality === 'balanced' ? reason : `${who}: ${reason}`)

  if (action.type === 'pass') return line('Nothing improves its position, so it waits for the light to turn.')
  if (action.type === 'cast') {
    const text = `Casts ${SPELL_INFO[action.spell].name}${action.pieceId ? ` on ${name(action.pieceId)}` : ''}.`
    return line(personality === 'caster' ? `${text} Spells are its thing.` : text)
  }

  const mover = state.pieces.find((p) => p.id === action.pieceId)!
  const victim = pieceAt(state, action.to)
  if (victim) {
    const odds = estimateOdds(mover, victim, squareLuminance(state, action.to), undefined, duelCells(state, mover, victim))
    const chance = Math.round(odds.attacker * 100)
    const edge = chance >= 50 ? 'The odds favour it' : personality === 'rusher' ? 'It takes the risk' : 'A gamble for position'
    return line(`${name(mover.id)} attacks your ${name(victim.id)}. ${edge}: about ${chance}% to win.`)
  }
  if (isBeacon(action.to, state.config.beacons) && !isBeacon(mover.pos, state.config.beacons))
    return line(`${name(mover.id)} takes a beacon, where it is spell-proof and heals.`)
  if (mover.hp < mover.maxHp * 0.6 && attacked(state, mover.pos, court) && !attacked(state, action.to, court))
    return line(`${name(mover.id)} is wounded, so it pulls back out of reach.`)
  if (favouredCourt(squareLuminance(state, action.to)) === court && favouredCourt(squareLuminance(state, mover.pos)) !== court)
    return line(`${name(mover.id)} moves into light that favours its court.`)
  return line(`${name(mover.id)} moves. ${TASTE[personality]}`)
}
