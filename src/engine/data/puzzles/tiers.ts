import type { PuzzleTier } from './helpers'
import type { Difficulty } from '../difficulty'

export interface TierInfo {
  tier: PuzzleTier
  name: string
  blurb: string
  /** How well the Umbral side answers in this tier. */
  difficulty: Difficulty
}

export const PUZZLE_TIERS: readonly TierInfo[] = [
  { tier: 'beginner', name: 'Beginner', blurb: 'One idea at a time. The text tells you what to use.', difficulty: 'easy' },
  { tier: 'normal', name: 'Normal', blurb: 'Pieces and spells together, over a few turns.', difficulty: 'normal' },
  { tier: 'expert', name: 'Expert', blurb: 'Tight limits and replies that punish the obvious move.', difficulty: 'hard' },
]
