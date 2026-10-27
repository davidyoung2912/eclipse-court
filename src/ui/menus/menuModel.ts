import { CAMPAIGN } from '../../engine/data/campaign'
import { PUZZLES } from '../../engine/data/puzzles'
import { liveStreak, totalStars, type Progress } from '../../progress'

export type PrimaryKind = 'resume' | 'learn' | 'campaign' | 'skirmish'

export interface PrimaryAction {
  kind: PrimaryKind
  label: string
}

/** The one action the main menu leads with: finish what was left, learn, carry on, or just play. */
export function primaryAction(progress: Progress, hasSaved: boolean, firstRun: boolean): PrimaryAction {
  if (hasSaved) return { kind: 'resume', label: 'Resume Game' }
  if (firstRun) return { kind: 'learn', label: 'Learn to Play' }
  const { cleared } = progress
  if (cleared < CAMPAIGN.length)
    return { kind: 'campaign', label: cleared === 0 ? 'Start Campaign' : `Continue Campaign · Battle ${cleared + 1}` }
  return { kind: 'skirmish', label: 'Play Skirmish' }
}

export interface CardSummaries {
  campaign: string
  gauntlet: string
  puzzles: string
  /** Days in a row with a daily match, still alive on `today`. */
  streak: number
}

/** The one line of progress each mode card shows. */
export function cardSummaries(progress: Progress, today: number): CardSummaries {
  const { best, runs } = progress.gauntlet
  return {
    campaign: `${totalStars(progress)} of ${CAMPAIGN.length * 3} stars`,
    gauntlet: runs === 0 ? 'No runs yet' : `Best: stage ${best}`,
    puzzles: `${progress.puzzles.length} of ${PUZZLES.length} solved`,
    streak: liveStreak(progress, today),
  }
}
