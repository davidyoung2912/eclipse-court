import type { Pos } from '../../engine/rules/types'

const ARROWS: Record<string, readonly [number, number]> = { ArrowRight: [1, 0], ArrowLeft: [-1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }

/** The square one arrow key to the side on screen, kept on the board; null for any other key. The screen is turned when `flip`. */
export function stepCursor(from: Pos, key: string, flip: boolean, size: number): Pos | null {
  const d = ARROWS[key]
  if (!d) return null
  // Unflipped, screen right is +y and screen up is +x; flipped, both reverse.
  const [sx, sy] = d
  const dy = flip ? -sx : sx
  const dx = flip ? sy : -sy
  return { x: Math.min(size - 1, Math.max(0, from.x + dx)), y: Math.min(size - 1, Math.max(0, from.y + dy)) }
}
