import type { Difficulty } from './difficulty'

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

/** The Grand Court section: hand-built 9x9 battles at mixed AI levels, opened by campaign stars. */
export const GRAND_TIER = { name: 'Grand Court', blurb: 'The 9x9 board, sixteen pieces a side, and longer reach for every piece.' }
