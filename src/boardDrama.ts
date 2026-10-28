/** Board capture drama: pure numbers for the slash streak, Leader hit-stop, light-ray sweep, threat and win cues and the streak meter. */
import { reduceLegal } from './engine/reducer'
import { legalMoves, pieceAt } from './engine/rules/moves'
import type { Step } from './engine/log'
import type { Court, GameState, Pos } from './engine/rules/types'
import { piecesLost } from './juice'

/** Milliseconds the board freezes when a Leader falls (60 to 80 is the aim); none when motion is reduced. */
export const LEADER_STOP_MS = 70
export const leaderStopMs = (leaderFell: boolean, reduceMotion: boolean) => (leaderFell && !reduceMotion ? LEADER_STOP_MS : 0)

/** The two ends of a slash across the cell at `at`, along the way the attacker came (in squares from the cell centre). */
export function slashEnds(from: Pos, at: Pos, reach = 0.7): { dx: number; dy: number } {
  const dx = at.x - from.x
  const dy = at.y - from.y
  const len = Math.hypot(dx, dy)
  // A capture that did not move the attacker (it held its square) is slashed on the diagonal.
  return len === 0 ? { dx: reach * 0.707, dy: reach * 0.707 } : { dx: (dx / len) * reach, dy: (dy / len) * reach }
}

/** Milliseconds between one cell and the next as the light-ray wavefront crosses the board. */
export const RAY_STEP_MS = 55

/**
 * When the wavefront reaches a cell: a sweep from the Solari edge as the light rises, from the Umbral edge as it wanes
 * (a slight slant makes it a ray rather than a wall), and a ring out from the centre once the Eclipse has fallen.
 */
export function rayDelay(p: Pos, size: number, dir: number, eclipse: boolean): number {
  const mid = (size - 1) / 2
  if (eclipse) return (Math.abs(p.x - mid) + Math.abs(p.y - mid)) * RAY_STEP_MS
  const along = (dir >= 0 ? p.x : size - 1 - p.x) + p.y * 0.4
  return Math.round(along * RAY_STEP_MS)
}

/** True when an enemy could take `court`'s Leader next turn. */
export function leaderInDanger(state: GameState, court: Court, endangered: readonly string[]): boolean {
  const leader = state.pieces.find((p) => p.court === court && p.role === 'leader')
  return !!leader && endangered.includes(leader.id)
}

/** Seconds of one slow heartbeat while the Leader is in danger. */
export const HEARTBEAT_S = 1.6

/**
 * Empty squares `court` could step onto this turn to win the game on the spot. Captures are left out: their duels are not
 * known in advance, so a win that rides on one is never promised.
 */
export function winningSquares(state: GameState, court: Court): Pos[] {
  if (state.winner || state.turn !== court) return []
  const out: Pos[] = []
  for (const piece of state.pieces) {
    if (piece.court !== court) continue
    for (const to of legalMoves(state, piece)) {
      if (pieceAt(state, to)) continue
      if (reduceLegal(state, { type: 'move', pieceId: piece.id, to }).winner === court) out.push(to)
    }
  }
  return out.filter((p, i) => out.findIndex((q) => q.x === p.x && q.y === p.y) === i)
}

/** Each court's running capture streak after the latest step (see `streakAfter`, which names only the court that just acted). */
export function streaksOf(steps: readonly Step[]): Record<Court, number> {
  const counts: Record<Court, number> = { solari: 0, umbral: 0 }
  for (let i = 1; i < steps.length; i++) {
    const court = steps[i - 1].state.turn
    counts[court] = piecesLost(steps[i - 1].state, steps[i].state) > 0 ? counts[court] + 1 : 0
  }
  return counts
}

/** Segments in the streak meter; a streak past this keeps it full. */
export const METER_SEGMENTS = 5

/** Spark particles around the meter: none for a lone capture, then more as the streak climbs. */
export const meterSparks = (count: number) => (count < 2 ? 0 : Math.min(12, 2 + count * 2))
