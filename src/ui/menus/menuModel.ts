import { CAMPAIGN } from '../../engine/data/campaign'
import { PUZZLES } from '../../engine/data/puzzles'
import { normalRules, type PresetRules } from '../../engine/data/setups'
import { clearedCount, liveStreak, totalStars, type Progress } from '../../progress'

export type PrimaryKind = 'resume' | 'learn' | 'campaign' | 'skirmish'

export interface PrimaryAction {
  kind: PrimaryKind
  label: string
}

/** The one action the main menu leads with: finish what was left, learn, carry on, or just play. */
export function primaryAction(progress: Progress, hasSaved: boolean, firstRun: boolean): PrimaryAction {
  if (hasSaved) return { kind: 'resume', label: 'Resume Game' }
  if (firstRun) return { kind: 'learn', label: 'Learn to Play' }
  const cleared = clearedCount(progress)
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

export type SectionId = 'army' | 'spells' | 'win' | 'hazards' | 'clock'

/** The rule fields (as `normalRules` spells them) each collapsible section of the setup screen holds. */
const SECTION_FIELDS: Record<SectionId, readonly (keyof ReturnType<typeof normalRules>)[]> = {
  army: [],
  spells: ['recharge'],
  win: ['winMode', 'cycle', 'reverse'],
  hazards: ['events', 'showdown', 'growth', 'promotion'],
  clock: ['seconds', 'bank'],
}

export interface SetupValues {
  rules: PresetRules
  armyMode: string
  boardId: string
  spellMode: 'classic' | 'loadout'
}

/** The sections whose rule fields differ from `base`, a tier's own rules. */
export function changedRuleSections(rules: PresetRules, base: PresetRules): SectionId[] {
  const mine = normalRules(rules)
  const theirs = normalRules(base)
  return (Object.keys(SECTION_FIELDS) as SectionId[]).filter((id) => SECTION_FIELDS[id].some((f) => mine[f] !== theirs[f]))
}

/** The sections of the setup screen holding anything other than the tier's defaults. */
export function changedSections(v: SetupValues, tierRules: PresetRules): SectionId[] {
  const sections = new Set(changedRuleSections(v.rules, tierRules))
  if (v.armyMode !== 'classic' || v.boardId !== 'classic') sections.add('army')
  if (v.spellMode !== 'classic') sections.add('spells')
  return [...sections]
}
