import { ROLE_NAMES } from './engine/data/roster'
import { pieceAt } from './engine/rules/moves'
import { SPELL_INFO } from './engine/rules/spells'
import type { Action, Court, GameState, Piece, Pos } from './engine/rules/types'

const COURT_NAME: Record<Court, string> = { solari: 'Solari', umbral: 'Umbral' }

/** A square as a screen reader says it: a column letter (a is the left on the Solari player's screen) and a row number from the Solari edge. */
export function squareName({ x, y }: Pos): string {
  return `${String.fromCharCode(97 + y)}${x + 1}`
}

const nameOf = (p: Piece) => `${COURT_NAME[p.court]} ${ROLE_NAMES[p.court][p.role]}`

/** Where a piece stands and how hurt it is, for the board cursor to read out. */
export function describeSquare(state: GameState, pos: Pos): string {
  const piece = pieceAt(state, pos)
  return piece ? `${squareName(pos)}: ${nameOf(piece)}, ${piece.hp} of ${piece.maxHp} HP` : `${squareName(pos)}: empty`
}

/** One sentence saying what an action did, written from the position before it and the position after. */
export function narrate(before: GameState, action: Action, after: GameState): string {
  const parts: string[] = []
  if (action.type === 'pass') parts.push(`${COURT_NAME[before.turn]} passes.`)
  else if (action.type === 'move') {
    const mover = before.pieces.find((p) => p.id === action.pieceId)
    if (mover) {
      const target = pieceAt(before, action.to)
      if (!target || target.court === mover.court) parts.push(`${nameOf(mover)} moves to ${squareName(action.to)}.`)
      else {
        const duel = action.duel
        const verdict = !duel ? 'captures'
          : duel.defenderHp <= 0 ? (duel.attackerHp > 0 ? 'wins the duel' : 'and the defender both fall')
          : duel.attackerHp <= 0 ? 'loses the duel' : 'draws the duel'
        const left = after.pieces.find((p) => p.id === mover.id)
        parts.push(`${nameOf(mover)} attacks ${nameOf(target)} at ${squareName(action.to)} and ${verdict}${left ? `, ${left.hp} HP left` : ''}.`)
      }
    }
  } else {
    const target = action.pieceId ? before.pieces.find((p) => p.id === action.pieceId) : undefined
    const at = action.to ? ` on ${squareName(action.to)}` : target ? ` on ${nameOf(target)}` : ''
    parts.push(`${COURT_NAME[before.turn]} casts ${SPELL_INFO[action.spell].name}${at}.`)
  }
  if (after.winner) parts.push(after.winner === 'draw' ? 'The game is drawn.' : `${COURT_NAME[after.winner]} wins.`)
  else if (after.round !== before.round) parts.push(`Round ${after.round}${after.eclipse && !before.eclipse ? ', the Eclipse begins' : ''}.`)
  return parts.join(' ')
}
