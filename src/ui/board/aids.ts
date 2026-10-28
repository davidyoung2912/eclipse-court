import { estimateOdds } from '../../engine/reducer'
import { duelCells } from '../../engine/rules/cells'
import { squareLuminance } from '../../engine/rules/luminance'
import { legalMoves, pieceAt } from '../../engine/rules/moves'
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
