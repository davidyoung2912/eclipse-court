import { CAMPAIGN } from '../../engine/data/campaign'
import { PUZZLES } from '../../engine/data/puzzles'
import { normalRules, type PresetRules } from '../../engine/data/setups'
import { GAUNTLET_STAGES } from '../../engine/data/gauntlet'
import { SCENARIOS } from '../../engine/data/scenarios'
import { BONDS, CHAPTERS } from '../../engine/data/story'
import { clearedCount, liveStreak, STAR_WIN, totalStars, type Progress } from '../../progress'
import { achievements as storyAchievements, bondRead, storySummary, type StoryState } from '../../story'

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

/** What a mode card shows: up to two short lines and, where the mode has a goal, how far along it is (0 to 1). */
export interface CardInfo {
  lines: string[]
  fraction: number | null
}

export interface CardSummaries {
  battle: CardInfo
  campaign: CardInfo
  gauntlet: CardInfo
  puzzles: CardInfo
  story: CardInfo
  /** Days in a row with a daily match, still alive on `today`. */
  streak: number
}

const share = (n: number, of: number) => (of === 0 ? 0 : Math.min(1, n / of))
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`

/** The lines of progress each mode card shows. */
export function cardSummaries(progress: Progress, today: number, story: StoryState): CardSummaries {
  const { best, runs, won } = progress.gauntlet
  const { skirmish, practice, online, hotseat } = progress.areas
  const stars = totalStars(progress)
  const solved = progress.puzzles.length
  const scenarios = SCENARIOS.filter((x) => (progress.scenarios[x.id] ?? 0) & STAR_WIN).length
  const chapters = CHAPTERS.filter((c) => story.read.has(c.id)).length
  const bonds = BONDS.filter((b) => bondRead(story, b.id)).length
  const medals = storyAchievements(story).filter((m) => m.earned).length
  const friends = online.games + hotseat.games
  return {
    battle: {
      lines: [
        skirmish.games === 0 ? 'Skirmish · Practice · Codes' : `${plural(skirmish.games, 'skirmish', 'skirmishes')} · ${Math.round((skirmish.wins / skirmish.games) * 100)}% won`,
        `${plural(practice.games, 'duel')} · ${plural(friends, 'friend game')}`,
      ],
      fraction: null,
    },
    campaign: {
      lines: [`${clearedCount(progress)} of ${CAMPAIGN.length} beaten · ${stars}★`, `${scenarios} of ${SCENARIOS.length} scenarios`],
      fraction: share(stars, CAMPAIGN.length * 3),
    },
    gauntlet: {
      lines: runs === 0 ? ['No runs yet', 'Eight foes, one army'] : [`Best: stage ${Math.min(best, GAUNTLET_STAGES)} of ${GAUNTLET_STAGES}`, `${plural(won, 'win')} in ${plural(runs, 'run')}`],
      fraction: share(best, GAUNTLET_STAGES),
    },
    puzzles: {
      lines: [`${solved} of ${PUZZLES.length} solved`, `${Math.round(share(solved, PUZZLES.length) * 100)}% complete`],
      fraction: share(solved, PUZZLES.length),
    },
    story: {
      lines: [storySummary(story.read), `${plural(bonds, 'bond scene')} · ${medals} of ${storyAchievements(story).length} story achievements`],
      fraction: share(chapters + bonds, CHAPTERS.length + BONDS.length),
    },
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
