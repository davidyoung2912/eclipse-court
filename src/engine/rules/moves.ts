import { fixedCourt, inBounds, isBlocked, samePos, sizeOf } from './board'
import { eventAt } from './events'
import { favouredCourt, squareLuminance } from './luminance'
import type { BoardSize, GameState, Piece, Pos, Role } from './types'

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
      if (!inBounds(p, sizeOf(state.config))) break
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

/** How far each role reaches (a Charger jumps like a knight, whatever the size). The 9x9 board is longer, so its walkers go further. */
export const MOVE_RANGE: Record<BoardSize, Record<Exclude<Role, 'charger'>, number>> = {
  7: { footsoldier: 1, bruiser: 1, marksman: 2, flier: 3, aura: 3, leader: 4 },
  9: { footsoldier: 2, bruiser: 2, marksman: 3, flier: 3, aura: 3, leader: 5 },
}

/** On the 9x9 board a walker or shooter standing in full light for its own court moves one square further. */
const LIGHT_BONUS: Record<BoardSize, boolean> = { 7: false, 9: true }

const lightBonus = (state: GameState, piece: Piece) => {
  if (!LIGHT_BONUS[state.config.size ?? 7]) return 0
  const lum = squareLuminance(state, piece.pos)
  return favouredCourt(lum) === piece.court && Math.abs(lum) >= 2 ? 1 : 0
}

/** Solari passive: a Flier on a square of the shifting board in full light reaches one square further. */
const flierBonus = (state: GameState, piece: Piece) =>
  state.config.passives && piece.court === 'solari' && !fixedCourt(piece.pos, sizeOf(state.config)) && squareLuminance(state, piece.pos) >= 2 ? 1 : 0

/** Fog cuts the reach of long-range movers by one square. */
const reach = (state: GameState, steps: number) => (eventAt(state.config, state.round) === 'fog' ? Math.max(1, steps - 1) : steps)

/** Every square the piece may move to; a square holding an enemy means an attack. */
export function legalMoves(state: GameState, piece: Piece): Pos[] {
  if (piece.bound) return []
  const range = MOVE_RANGE[state.config.size ?? 7]
  switch (piece.role) {
    case 'footsoldier':
    case 'bruiser':
      return slide(state, piece, range[piece.role] + lightBonus(state, piece), false)
    case 'marksman':
      return slide(state, piece, reach(state, range.marksman + lightBonus(state, piece)), false)
    case 'flier':
      return slide(state, piece, reach(state, range.flier + flierBonus(state, piece)), true)
    case 'aura':
      return slide(state, piece, reach(state, range.aura), true)
    case 'charger':
      return KNIGHT.map((d) => ({ x: piece.pos.x + d.x, y: piece.pos.y + d.y })).filter((p) => {
        if (!inBounds(p, sizeOf(state.config)) || isBlocked(state.config, p)) return false
        const occ = pieceAt(state, p)
        return !occ || (occ.court !== piece.court && !occ.shrouded)
      })
    case 'leader': {
      // Teleports to any empty square within its range (4 steps, 5 on the 9x9 board).
      const out: Pos[] = []
      const size = sizeOf(state.config)
      for (let y = 0; y < size; y++)
        for (let x = 0; x < size; x++) {
          const p = { x, y }
          const dist = Math.abs(x - piece.pos.x) + Math.abs(y - piece.pos.y)
          if (dist >= 1 && dist <= range.leader && !pieceAt(state, p) && !isBlocked(state.config, p)) out.push(p)
        }
      return out
    }
  }
}
