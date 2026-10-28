/** App-wide motion: pure numbers for count-up figures, staggered entrances, the tap ripple and the menu's light parallax. */

/** Milliseconds a figure takes to count up, longer for a bigger jump but never dragging. */
export function countUpMs(from: number, to: number): number {
  return Math.min(1100, 350 + Math.abs(to - from) * 12)
}

/** The figure shown `elapsed` ms into a count from `from` to `to`, easing out; a finished or zero-length count shows `to`. */
export function countUpValue(from: number, to: number, elapsed: number): number {
  const ms = countUpMs(from, to)
  if (from === to || elapsed >= ms) return to
  const t = Math.max(0, elapsed) / ms
  return Math.round(from + (to - from) * (1 - (1 - t) ** 3))
}

/** Milliseconds between one list item entering and the next, and how many items stagger before the rest arrive together. */
export const STAGGER_STEP_MS = 45
export const STAGGER_MAX_ITEMS = 8

/** The entrance delay of the item at `index`. */
export const staggerDelay = (index: number): number => Math.min(STAGGER_MAX_ITEMS, Math.max(0, index)) * STAGGER_STEP_MS

/** How long a tap ripple or hover sheen lasts before it is removed. */
export const RIPPLE_MS = 520
export const SHEEN_MS = 700

/** Where inside a box a pointer landed, as percentages, clamped to the box. */
export function rippleSpot(box: { left: number; top: number; width: number; height: number }, x: number, y: number): { x: number; y: number } {
  const pct = (v: number, size: number) => (size <= 0 ? 50 : Math.min(100, Math.max(0, (v / size) * 100)))
  return { x: pct(x - box.left, box.width), y: pct(y - box.top, box.height) }
}

/** The most the menu's lit layers shift, in pixels, as the pointer moves from the centre to an edge. */
export const PARALLAX_PX = 10

/** How far the sky shifts for a pointer at (x, y) in a viewport of the given size: opposite to the pointer, so it reads as depth. */
export function parallaxShift(x: number, y: number, width: number, height: number, reach = PARALLAX_PX): { dx: number; dy: number } {
  if (width <= 0 || height <= 0) return { dx: 0, dy: 0 }
  const unit = (v: number, size: number) => Math.min(1, Math.max(-1, (v / size - 0.5) * 2))
  return { dx: -unit(x, width) * reach, dy: -unit(y, height) * reach }
}
