import { battlesIn, CAMPAIGN, grandBattles } from './engine/data/campaign'
import { GAUNTLET_STAGES } from './engine/data/gauntlet'
import { PUZZLE_TIERS, PUZZLES, puzzlesIn } from './engine/data/puzzles'
import { SCENARIOS } from './engine/data/scenarios'
import { BONDS, CHAPTERS } from './engine/data/story'
import type { IconName } from './ui/menus/icons'
import {
  ACHIEVEMENTS, clearedCount, liveStreak, scenarioStars, starCount, STAR_WIN, totalStars, type Progress, type Tally,
} from './progress'
import type { Cups } from './tournaments'
import { achievements as storyAchievements, bondRead, type StoryState } from './story'

export interface StatRow {
  label: string
  value: string
  /** 0 to 1: draws a small bar under the row. */
  fraction?: number
}

export interface StatSection {
  id: string
  title: string
  icon: IconName
  /** How much of the area is done, 0 to 1; null where there is nothing to complete. */
  fraction: number | null
  rows: StatRow[]
}

const ratio = (n: number, of: number) => (of === 0 ? 0 : Math.min(1, n / of))
export const percent = (f: number) => `${Math.round(f * 100)}%`
const outOf = (n: number, of: number) => `${n} / ${of}`
const rate = (t: Tally) => (t.games === 0 ? '–' : percent(t.wins / t.games))
const record = (t: Tally) => (t.games === 0 ? 'None yet' : `${t.wins} won · ${t.losses} lost · ${t.draws} drawn`)

const DIFFICULTY_NAMES = { easy: 'Easy', normal: 'Normal', hard: 'Hard' } as const

/** The headline figures at the top of the page. */
export function totals(p: Progress): StatRow[] {
  const { stats } = p
  return [
    { label: 'Games played', value: String(stats.games) },
    { label: 'Win rate', value: stats.games === 0 ? '–' : percent(stats.wins / stats.games) },
    { label: 'Won / lost / drawn', value: `${stats.wins} / ${stats.losses} / ${stats.draws}` },
    { label: 'Enemy pieces taken', value: String(stats.captures) },
    { label: 'Own pieces lost', value: String(stats.piecesLost) },
    { label: 'Capture ratio', value: stats.piecesLost === 0 ? (stats.captures === 0 ? '–' : `${stats.captures} : 0`) : (stats.captures / stats.piecesLost).toFixed(2) },
  ]
}

/** One section for each part of the game, with how far the player has got in it. */
export function sections(p: Progress, story: StoryState, today: number, cups?: Cups): StatSection[] {
  const battleTotal = CAMPAIGN.length
  const stars = totalStars(p)
  const campaignTiers: [string, typeof CAMPAIGN][] = [
    ['Beginner', battlesIn('easy')], ['Normal', battlesIn('normal')], ['Expert', battlesIn('hard')], ['Grand Court', grandBattles()],
  ]
  const campaign: StatSection = {
    id: 'campaign', title: 'Campaign', icon: 'banner', fraction: ratio(stars, battleTotal * 3),
    rows: [
      { label: 'Battles beaten', value: outOf(clearedCount(p), battleTotal), fraction: ratio(clearedCount(p), battleTotal) },
      { label: 'Stars earned', value: outOf(stars, battleTotal * 3), fraction: ratio(stars, battleTotal * 3) },
      { label: 'Three-star battles', value: String(Object.values(p.battles).filter((b) => starCount(b) === 3).length) },
      ...campaignTiers.map(([name, list]): StatRow => {
        const done = list.filter((o) => (p.battles[o.id] ?? 0) & STAR_WIN).length
        return { label: name, value: outOf(done, list.length), fraction: ratio(done, list.length) }
      }),
      { label: 'Tournaments won', value: String(p.tournaments) },
      ...(cups ? [{ label: 'Persona Cups won', value: outOf(cups.won, cups.entered) }, { label: 'Persona Cup finals', value: String(cups.finals) }] : []),
      { label: 'Battle record', value: record(p.areas.campaign) },
    ],
  }

  const cleared = SCENARIOS.filter((x) => (p.scenarios[x.id] ?? 0) & STAR_WIN).length
  const scenarioTiers = (['easy', 'normal', 'hard'] as const).map((d): StatRow => {
    const list = SCENARIOS.filter((x) => x.difficulty === d)
    const done = list.filter((x) => (p.scenarios[x.id] ?? 0) & STAR_WIN).length
    return { label: DIFFICULTY_NAMES[d], value: outOf(done, list.length), fraction: ratio(done, list.length) }
  })
  const scenarios: StatSection = {
    id: 'scenarios', title: 'Scenarios', icon: 'target', fraction: ratio(scenarioStars(p), SCENARIOS.length * 3),
    rows: [
      { label: 'Scenarios cleared', value: outOf(cleared, SCENARIOS.length), fraction: ratio(cleared, SCENARIOS.length) },
      { label: 'Stars earned', value: outOf(scenarioStars(p), SCENARIOS.length * 3), fraction: ratio(scenarioStars(p), SCENARIOS.length * 3) },
      { label: 'Three-star scenarios', value: String(SCENARIOS.filter((x) => starCount(p.scenarios[x.id] ?? 0) === 3).length) },
      ...scenarioTiers,
      { label: 'Scenario record', value: record(p.areas.scenario) },
    ],
  }

  const solved = PUZZLES.filter((z) => p.puzzles.includes(z.id)).length
  const puzzles: StatSection = {
    id: 'puzzles', title: 'Puzzles', icon: 'puzzle', fraction: ratio(solved, PUZZLES.length),
    rows: [
      { label: 'Puzzles solved', value: outOf(solved, PUZZLES.length), fraction: ratio(solved, PUZZLES.length) },
      ...PUZZLE_TIERS.map(({ tier, name }): StatRow => {
        const list = puzzlesIn(tier)
        const done = list.filter((z) => p.puzzles.includes(z.id)).length
        return { label: name, value: outOf(done, list.length), fraction: ratio(done, list.length) }
      }),
    ],
  }

  const g = p.gauntlet
  const gauntlet: StatSection = {
    id: 'gauntlet', title: 'Gauntlet', icon: 'flame', fraction: ratio(g.best, GAUNTLET_STAGES),
    rows: [
      { label: 'Furthest stage', value: outOf(Math.min(g.best, GAUNTLET_STAGES), GAUNTLET_STAGES), fraction: ratio(g.best, GAUNTLET_STAGES) },
      { label: 'Runs begun', value: String(g.runs) },
      { label: 'Runs won', value: String(g.won) },
      { label: 'Run win rate', value: g.runs === 0 ? '–' : percent(g.won / g.runs) },
    ],
  }

  const daily = p.daily
  const last = daily.last
  const dailySection: StatSection = {
    id: 'daily', title: 'Daily Match', icon: 'sun', fraction: null,
    rows: [
      { label: 'Current streak', value: `${liveStreak(p, today)} ${liveStreak(p, today) === 1 ? 'day' : 'days'}` },
      { label: 'Best streak', value: `${daily.best} ${daily.best === 1 ? 'day' : 'days'}` },
      { label: 'Latest result', value: last ? `${last.won ? 'Won' : 'Lost'} in ${last.turns} rounds, ${last.lost} lost` : 'None yet' },
      { label: 'Daily record', value: record(p.areas.daily) },
    ],
  }

  const skirmish: StatSection = {
    id: 'skirmish', title: 'Skirmish', icon: 'clash', fraction: null,
    rows: [
      { label: 'Games played', value: String(p.areas.skirmish.games) },
      { label: 'Win rate', value: rate(p.areas.skirmish) },
      { label: 'Skirmish record', value: record(p.areas.skirmish) },
    ],
  }

  const vsAi: StatSection = {
    id: 'ai', title: 'Against the AI', icon: 'shield', fraction: null,
    rows: (['easy', 'normal', 'hard'] as const).map((d): StatRow => {
      const t = p.byDifficulty[d]
      return { label: DIFFICULTY_NAMES[d], value: t.games === 0 ? 'None yet' : `${t.wins}–${t.losses}–${t.draws} · ${rate(t)} won` }
    }),
  }

  const practice = p.areas.practice
  const practiceSection: StatSection = {
    id: 'practice', title: 'Practice Arena', icon: 'bolt', fraction: null,
    rows: [
      { label: 'Duels fought', value: String(practice.games) },
      { label: 'Duel win rate', value: rate(practice) },
      { label: 'Duel record', value: record(practice) },
    ],
  }

  const versus: StatSection = {
    id: 'versus', title: 'Against Friends', icon: 'chain', fraction: null,
    rows: [
      { label: 'Online games', value: String(p.areas.online.games) },
      { label: 'Online record', value: record(p.areas.online) },
      { label: 'Hot-seat games', value: String(p.areas.hotseat.games) },
      { label: 'Hot-seat results', value: p.areas.hotseat.games === 0 ? 'None yet' : `Solari ${p.areas.hotseat.wins} · Umbral ${p.areas.hotseat.losses} · drawn ${p.areas.hotseat.draws}` },
    ],
  }

  const chaptersRead = CHAPTERS.filter((c) => story.read.has(c.id)).length
  const bondsRead = BONDS.filter((b) => bondRead(story, b.id)).length
  const medals = storyAchievements(story)
  const medalsEarned = medals.filter((m) => m.earned).length
  const storySection: StatSection = {
    id: 'story', title: 'Story', icon: 'book', fraction: ratio(chaptersRead + bondsRead, CHAPTERS.length + BONDS.length),
    rows: [
      { label: 'Chapters read', value: outOf(chaptersRead, CHAPTERS.length), fraction: ratio(chaptersRead, CHAPTERS.length) },
      { label: 'Bond scenes read', value: outOf(bondsRead, BONDS.length), fraction: ratio(bondsRead, BONDS.length) },
      { label: 'Story achievements', value: outOf(medalsEarned, medals.length), fraction: ratio(medalsEarned, medals.length) },
      { label: 'Ending chosen', value: story.ending ? 'Yes' : 'Not yet' },
    ],
  }

  const badges = p.achievements.length
  const achievementSection: StatSection = {
    id: 'achievements', title: 'Achievements', icon: 'trophy', fraction: ratio(badges, ACHIEVEMENTS.length),
    rows: [{ label: 'Earned', value: outOf(badges, ACHIEVEMENTS.length), fraction: ratio(badges, ACHIEVEMENTS.length) }],
  }

  return [campaign, scenarios, puzzles, gauntlet, storySection, skirmish, vsAi, dailySection, practiceSection, versus, achievementSection]
}

/** How much of everything with a goal is done: the average of those areas. */
export function overall(list: readonly StatSection[]): number {
  const scored = list.filter((s) => s.fraction !== null)
  return scored.length === 0 ? 0 : scored.reduce((n, s) => n + s.fraction!, 0) / scored.length
}
