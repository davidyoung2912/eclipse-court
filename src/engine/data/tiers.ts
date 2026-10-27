import type { Difficulty } from '../../ai/profile'

export interface CampaignTier {
  name: string
  blurb: string
  /** The AI level every battle and scenario in the tier is played at. */
  difficulty: Difficulty
}

/** The sections of the Campaign page; a tier is its AI level, so Beginner is easy and Expert is hard. */
export const CAMPAIGN_TIERS: readonly CampaignTier[] = [
  { name: 'Beginner', blurb: 'A forgiving Umbral court. One twist at a time.', difficulty: 'easy' },
  { name: 'Normal', blurb: 'A sharper court with a harder twist.', difficulty: 'normal' },
  { name: 'Expert', blurb: 'The hard AI, and rules that bite.', difficulty: 'hard' },
]
