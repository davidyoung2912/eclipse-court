/** When a persona speaks; `meet`, `ahead`, `behind` and `grudge` stand in for greet and briefing by the head-to-head record; see docs/personas-plan.md for the full table. */
export const LINE_CATEGORIES = [
  'greet',
  'picked',
  'briefing',
  'open',
  'capture',
  'lose-piece',
  'duel-win',
  'duel-loss',
  'beacon-gain',
  'beacon-lose',
  'spell',
  'eclipse',
  'danger',
  'threat',
  'idle',
  'win',
  'lose',
  'draw',
  'rematch',
  'meet',
  'ahead',
  'behind',
  'grudge',
] as const

export type LineCategory = (typeof LINE_CATEGORIES)[number]

/** A persona's hand-written lines: every category has at least a handful, and no line repeats. */
export type PersonaLines = Record<LineCategory, readonly string[]>

/** The longest a line may be, so a bubble stays two lines on a phone. */
export const LINE_MAX = 90
/** The fewest lines a persona must have in one category, and in total. */
export const LINES_PER_CATEGORY_MIN = 6
export const LINES_TOTAL_MIN = 100
