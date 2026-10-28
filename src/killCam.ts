/** Kill-cam: pure numbers and the choice of what to replay after a decisive capture. */
import type { Step } from './engine/log'
import type { GameState, Pos } from './engine/rules/types'
import { piecesLost } from './juice'

/** The final capture of a won game: the position just before it, just after it, and the square it was taken on. */
export interface KillShot {
  before: GameState
  after: GameState
  at: Pos
}

/** The final capture, or null when the game ended any other way (a draw, a beacon, the clock) or no step took a piece. */
export function killShotOf(steps: readonly Step[]): KillShot | null {
  if (steps.length < 2) return null
  const after = steps[steps.length - 1].state
  const before = steps[steps.length - 2].state
  if (!after.winner || after.winner === 'draw' || piecesLost(before, after) === 0) return null
  const gone = before.pieces.find((p) => !after.pieces.some((q) => q.id === p.id))
  const at = after.lastDuel?.at ?? gone?.pos
  return at ? { before, after, at } : null
}

/** Milliseconds the camera pushes in on the square before the capture plays, how long the capture takes, and the hold after. */
export const KILL_PUSH_MS = 900
export const KILL_PLAY_MS = 1800
export const KILL_HOLD_MS = 900
/** How far the camera zooms in on the capture. */
export const KILL_ZOOM = 2.2

/** Total time the kill-cam holds the screen; none when motion is reduced. */
export const killCamMs = (reduceMotion: boolean) => (reduceMotion ? 0 : KILL_PUSH_MS + KILL_PLAY_MS + KILL_HOLD_MS)

/** Where the camera zooms to, as percentages of the board's width and height (the board may be shown flipped). */
export function killOrigin(at: Pos, size: number, flip: boolean): { x: number; y: number } {
  const col = flip ? size - 1 - at.x : at.x
  const row = flip ? at.y : size - 1 - at.y
  return { x: ((col + 0.5) / size) * 100, y: ((row + 0.5) / size) * 100 }
}
