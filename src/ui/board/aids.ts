import { estimateOdds, type Odds } from '../../engine/reducer'
import { duelCells } from '../../engine/rules/cells'
import { squareLuminance } from '../../engine/rules/luminance'
import { legalMoves, pieceAt } from '../../engine/rules/moves'
import type { Step } from '../../engine/log'
import type { Court, GameState, Piece, Pos } from '../../engine/rules/types'

/** Ids of `court`'s pieces that an enemy piece could attack on its next move. */
export function threatenedIds(state: GameState, court: Court): string[] {
  const hit = new Set<string>()
  for (const foe of state.pieces) {
    if (foe.court === court) continue
    for (const to of legalMoves(state, foe)) {
      const target = pieceAt(state, to)
      if (target && target.court === court) hit.add(target.id)
    }
  }
  return [...hit]
}

/** For each enemy a piece could attack from `moves`, the whole-number chance (0 to 100) that the attacker wins the duel. */
export function attackOdds(state: GameState, attacker: Piece, moves: readonly Pos[]): Record<string, number> {
  const out: Record<string, number> = {}
  for (const to of moves) {
    const defender = pieceAt(state, to)
    if (!defender || defender.court === attacker.court) continue
    const odds = estimateOdds(attacker, defender, squareLuminance(state, to), undefined, duelCells(state, attacker, defender))
    out[defender.id] = Math.round(odds.attacker * 100)
  }
  return out
}

/** Rounds until the Eclipse falls (1 means it falls as this round ends), or null once it has fallen. */
export function eclipseIn(state: GameState): number | null {
  return state.eclipse ? null : Math.max(1, state.config.eclipseRound + 1 - state.round)
}

/** The squares the latest move left and reached, or null when the last thing played was not a move. */
export function lastMoveOf(history: readonly Step[]): { from: Pos; to: Pos } | null {
  const step = history[history.length - 1]
  const before = history[history.length - 2]
  if (!step?.action || step.action.type !== 'move' || !before) return null
  const { pieceId, to } = step.action
  const from = before.state.pieces.find((p) => p.id === pieceId)?.pos
  return from ? { from, to } : null
}

/** The light as it will stand when the round turns: the phase steps on unless an Eclipse or a hold stops it, and the round event changes. */
export function nextLightState(state: GameState): GameState {
  const length = state.config.day.length
  const round = state.round + 1
  return {
    ...state,
    round,
    phase: state.eclipse || state.hold > 0 ? state.phase : (state.phase + state.dir + length) % length,
    eclipse: state.eclipse || round > state.config.eclipseRound,
  }
}

/** For each attackable enemy, the attacker's win chance (0 to 100) once the light has turned. */
export function nextAttackOdds(state: GameState, attacker: Piece, moves: readonly Pos[]): Record<string, number> {
  return attackOdds(nextLightState(state), attacker, moves)
}

/** The duel odds and square light for `attacker` against `defender` on `to` once the light has turned. */
export function nextDetail(state: GameState, attacker: Piece, defender: Piece, to: Pos): { next: Odds; nextLuminance: number } {
  const later = nextLightState(state)
  const nextLuminance = squareLuminance(later, to)
  return { next: estimateOdds(attacker, defender, nextLuminance, undefined, duelCells(later, attacker, defender)), nextLuminance }
}

/** The foe's win chance (0 to 100) from which a square counts as a bad place to stand. */
export const BLUNDER_ODDS = 60

export type Blunder = { kind: 'piece'; odds: number } | { kind: 'leader' }

/** What is wrong with moving `pieceId` to the empty square `to`: an enemy could take it on bad odds, or the move newly exposes the Leader. Null when it looks safe. */
export function blunderOf(state: GameState, pieceId: string, to: Pos): Blunder | null {
  const mover = state.pieces.find((p) => p.id === pieceId)
  if (!mover || pieceAt(state, to)) return null
  const after: GameState = { ...state, pieces: state.pieces.map((p) => (p.id === pieceId ? { ...p, pos: to, moved: true } : p)) }
  const moved = after.pieces.find((p) => p.id === pieceId)!
  let worst = -1
  for (const foe of after.pieces) {
    if (foe.court === mover.court || !legalMoves(after, foe).some((m) => m.x === to.x && m.y === to.y)) continue
    worst = Math.max(worst, Math.round(estimateOdds(foe, moved, squareLuminance(after, to), undefined, duelCells(after, foe, moved)).attacker * 100))
  }
  if (worst >= BLUNDER_ODDS) return { kind: 'piece', odds: worst }
  const leader = after.pieces.find((p) => p.court === mover.court && p.role === 'leader')
  if (leader && leader.id !== pieceId && threatenedIds(after, mover.court).includes(leader.id) && !threatenedIds(state, mover.court).includes(leader.id)) return { kind: 'leader' }
  if (leader && leader.id === pieceId && threatenedIds(after, mover.court).includes(leader.id)) return { kind: 'leader' }
  return null
}
