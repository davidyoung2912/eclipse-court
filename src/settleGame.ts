import { encodeRecord } from './engine/serialize'
import { SCENARIOS } from './engine/data/scenarios'
import type { Difficulty } from './engine/data/difficulty'
import type { DailyMatch } from './engine/data/daily'
import type { GameRecord } from './engine/log'
import type { Court, GameState } from './engine/rules/types'
import {
  recordDaily, recordGame, recordScenario, STAR_FLAWLESS, STAR_SWIFT, STAR_TEXT, STAR_WIN, starsEarned, summarise,
  type Progress,
} from './progress'
import type { Summary } from './engine/data/summary'

export interface Settled {
  summary: Summary | null
  progress: Progress
  /** What to tell the player about the game: stars, achievements, the daily's result. */
  lines: string[]
}

interface Context {
  winner: GameState['winner']
  finished: GameRecord
  human: Court
  difficulty: Difficulty
  campaignIndex: number | null
  /** A scenario of the campaign's second tab: its index. */
  scenario: number | undefined
  /** The game is today's daily match. */
  daily: boolean
  today: Pick<DailyMatch, 'date'>
  /** Count the game towards the player's record and stars (tournament games are scored apart). */
  stats: boolean
}

/** Records a finished game against the player's progress and returns the lines to show about it. */
export function settleGame(progress: Progress, c: Context): Settled {
  const { winner, finished, human, difficulty, campaignIndex, scenario, daily, today, stats } = c
  const summary = winner ? summarise(finished, human, difficulty, stats ? campaignIndex : null) : null
  if (!summary) return { summary: null, lines: [], progress }
  const { progress: played, earned } = recordGame(progress, summary, encodeRecord(finished))
  const stars = starsEarned(summary)
  const scored = stats && daily
    ? recordDaily(played, { date: today.date, won: summary.won, turns: summary.turns, lost: summary.lost })
    : null
  let next = scored?.progress ?? played
  const lines: string[] = []
  if (scenario !== undefined && summary.won) {
    const x = SCENARIOS[scenario]
    const bits = STAR_WIN | (summary.lost === 0 ? STAR_FLAWLESS : 0) | (x.bonus.met(summary) ? STAR_SWIFT : 0)
    const result = recordScenario(next, x.id, bits)
    next = result.progress
    lines.push(`Stars: Win${bits & STAR_FLAWLESS ? ', no pieces lost' : ''}${bits & STAR_SWIFT ? `, ${x.bonus.text.toLowerCase()}` : ''}.`, ...result.earned.map((a) => `Achievement: ${a.name}`))
  }
  return {
    summary,
    progress: next,
    lines: [
      ...(scored?.scored ? [`Daily match scored: ${summary.won ? 'won' : 'lost'} in ${summary.turns} rounds.`] : daily && stats ? ['Daily match: replays are not scored.'] : []),
      ...(scored?.earned ?? []).map((a) => `Achievement: ${a.name}`),
      ...(stats && campaignIndex !== null && summary.won ? [`Stars: ${STAR_TEXT.filter((t) => stars & t.bit).map((t) => t.text).join(', ')}.`] : []),
      ...earned.map((a) => `Achievement: ${a.name}`),
      ...lines,
    ],
  }
}
