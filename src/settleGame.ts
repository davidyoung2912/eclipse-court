import { encodeRecord } from './engine/serialize'
import { SCENARIOS } from './engine/data/scenarios'
import { COOP_SCENARIOS } from './engine/data/coop'
import type { Difficulty } from './engine/data/difficulty'
import type { DailyMatch } from './engine/data/daily'
import type { GameRecord } from './engine/log'
import type { Court, GameState } from './engine/rules/types'
import {
  recordDaily, recordGame, recordScenario, STAR_FLAWLESS, STAR_SWIFT, STAR_TEXT, STAR_WIN, starsEarned, summarise,
  type PlayArea, type Progress,
} from './progress'
import type { Summary } from './engine/data/summary'
import { CAMPAIGN } from './engine/data/campaign'
import { shardsForGame } from './shop'
import { shardMultiplier } from './engine/data/modifiers'

export interface Settled {
  summary: Summary | null
  progress: Progress
  /** What to tell the player about the game: stars, achievements, the daily's result. */
  lines: string[]
  /** Shards earned by the game; the caller adds them to the wallet. */
  shards: number
  /** A streak freeze kept the daily streak alive; the caller uses one up. */
  froze: boolean
}

interface Context {
  winner: GameState['winner']
  finished: GameRecord
  human: Court
  difficulty: Difficulty
  campaignIndex: number | null
  /** A scenario of the campaign's second tab: its index. */
  scenario: number | undefined
  /** A co-op scenario of the campaign's third tab: its index. */
  coop?: number
  /** The game is today's daily match. */
  daily: boolean
  /** Streak freezes held, which cover one missed day of the daily streak. */
  freezes?: number
  today: Pick<DailyMatch, 'date'>
  /** Count the game towards the player's record and stars (tournament games are scored apart). */
  stats: boolean
}

/** Records a finished game against the player's progress and returns the lines to show about it. */
export function settleGame(progress: Progress, c: Context): Settled {
  const { winner, finished, human, difficulty, campaignIndex, daily, today, stats } = c
  const set = c.scenario !== undefined ? SCENARIOS[c.scenario] : c.coop !== undefined ? COOP_SCENARIOS[c.coop] : undefined
  const summary = winner ? summarise(finished, human, difficulty, stats ? campaignIndex : null) : null
  if (!summary) return { summary: null, lines: [], progress, shards: 0, froze: false }
  const area: PlayArea = set ? 'scenario' : stats && daily ? 'daily' : campaignIndex !== null ? 'campaign' : 'skirmish'
  const { progress: played, earned } = recordGame(progress, summary, encodeRecord(finished), area)
  const stars = starsEarned(summary)
  const scored = stats && daily
    ? recordDaily(played, { date: today.date, won: summary.won, turns: summary.turns, lost: summary.lost }, c.freezes ?? 0)
    : null
  let next = scored?.progress ?? played
  const lines: string[] = []
  const battle = campaignIndex !== null ? CAMPAIGN[campaignIndex] : null
  const firstClear = battle ? !((progress.battles[battle.id] ?? 0) & STAR_WIN) : !!set && !((progress.scenarios[set.id] ?? 0) & STAR_WIN)
  let scenarioAchievements = 0
  if (set && summary.won) {
    const x = set
    const bits = STAR_WIN | (summary.lost === 0 ? STAR_FLAWLESS : 0) | (x.bonus.met(summary) ? STAR_SWIFT : 0)
    const result = recordScenario(next, x.id, bits)
    next = result.progress
    scenarioAchievements = result.earned.length
    lines.push(`Stars: Win${bits & STAR_FLAWLESS ? ', no pieces lost' : ''}${bits & STAR_SWIFT ? `, ${x.bonus.text.toLowerCase()}` : ''}.`, ...result.earned.map((a) => `Achievement: ${a.name}`))
  }
  const shards = shardsForGame({
    won: summary.won, draw: summary.draw, difficulty, firstClear, campaign: campaignIndex !== null, scenario: !!set,
    dailyScored: !!scored?.scored, multiplier: shardMultiplier(finished.initial.config, human), achievements: earned.length + (scored?.earned.length ?? 0) + scenarioAchievements,
  })
  return {
    summary,
    progress: next,
    shards,
    froze: !!scored?.froze,
    lines: [
      `Shards: +${shards}.`,
      ...(scored?.froze ? ['A streak freeze covered the day you missed.'] : []),
      ...(scored?.scored ? [`Daily match scored: ${summary.won ? 'won' : 'lost'} in ${summary.turns} rounds.`] : daily && stats ? ['Daily match: replays are not scored.'] : []),
      ...(scored?.earned ?? []).map((a) => `Achievement: ${a.name}`),
      ...(stats && campaignIndex !== null && summary.won ? [`Stars: ${STAR_TEXT.filter((t) => stars & t.bit).map((t) => t.text).join(', ')}.`] : []),
      ...earned.map((a) => `Achievement: ${a.name}`),
      ...lines,
    ],
  }
}
