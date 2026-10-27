import { fixedCourt, inBounds, isBlocked, samePos, SIZE } from './board'
import { eventAt } from './events'
import { squareLuminance } from './luminance'
import type { GameState, Piece, Pos } from './types'

const DIRS: readonly Pos[] = [
  { x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 },
  { x: 1, y: 1 }, { x: 1, y: -1 }, { x: -1, y: 1 }, { x: -1, y: -1 },
]

const KNIGHT: readonly Pos[] = [
  { x: 1, y: 2 }, { x: 2, y: 1 }, { x: -1, y: 2 }, { x: -2, y: 1 },
  { x: 1, y: -2 }, { x: 2, y: -1 }, { x: -1, y: -2 }, { x: -2, y: -1 },
]

export const pieceAt = (state: Pick<GameState, 'pieces'>, p: Pos) =>
  state.pieces.find((q) => samePos(q.pos, p))

/** Straight-line steps in 8 directions; `over` lets the piece fly past other pieces. */
function slide(state: GameState, piece: Piece, maxSteps: number, over: boolean): Pos[] {
  const out: Pos[] = []
  for (const d of DIRS) {
    for (let k = 1; k <= maxSteps; k++) {
      const p = { x: piece.pos.x + d.x * k, y: piece.pos.y + d.y * k }
      if (!inBounds(p)) break
      if (isBlocked(state.config, p)) {
        if (over) continue
        break
      }
      const occ = pieceAt(state, p)
      if (!occ) out.push(p)
      else if (occ.court !== piece.court && !occ.shrouded) {
        out.push(p)
        if (!over) break
      } else if (!over) break
    }
  }
  return out
}

/** Solari passive: a Flier on a square of the shifting board in full light reaches one square further. */
const flierBonus = (state: GameState, piece: Piece) =>
  state.config.passives && piece.court === 'solari' && !fixedCourt(piece.pos) && squareLuminance(state, piece.pos) >= 2 ? 1 : 0

/** Fog cuts the reach of long-range movers by one square. */
const reach = (state: GameState, steps: number) => (eventAt(state.config, state.round) === 'fog' ? Math.max(1, steps - 1) : steps)

/** Every square the piece may move to; a square holding an enemy means an attack. */
export function legalMoves(state: GameState, piece: Piece): Pos[] {
  if (piece.bound) return []
  switch (piece.role) {
    case 'footsoldier':
    case 'bruiser':
      return slide(state, piece, 1, false)
    case 'marksman':
      return slide(state, piece, reach(state, 2), false)
    case 'flier':
      return slide(state, piece, reach(state, 3 + flierBonus(state, piece)), true)
    case 'aura':
      return slide(state, piece, reach(state, 3), true)
    case 'charger':
      return KNIGHT.map((d) => ({ x: piece.pos.x + d.x, y: piece.pos.y + d.y })).filter((p) => {
        if (!inBounds(p) || isBlocked(state.config, p)) return false
        const occ = pieceAt(state, p)
        return !occ || (occ.court !== piece.court && !occ.shrouded)
      })
    case 'leader': {
      // Teleports to any empty square within 4 steps.
      const out: Pos[] = []
      for (let y = 0; y < SIZE; y++)
        for (let x = 0; x < SIZE; x++) {
          const p = { x, y }
          const dist = Math.abs(x - piece.pos.x) + Math.abs(y - piece.pos.y)
          if (dist >= 1 && dist <= 4 && !pieceAt(state, p) && !isBlocked(state.config, p)) out.push(p)
        }
      return out
    }
  }
}
