/// <reference types="node" />
import { aiLoadout } from '../engine/data/aiDraft'
import { DIFFICULTY_LIST } from '../ai/profile'
import { MODE_INFO } from '../engine/rules/events'
import type { GameState, MatchConfig, MatchMode } from '../engine/rules/types'
import { playGame } from './game'

export const MODES = Object.keys(MODE_INFO) as MatchMode[]

export interface ModeGame {
  winner: GameState['winner']
  rounds: number
  /** The game was decided by the round-limit count rather than by its own win condition. */
  atLimit: boolean
  problems: string[]
}

/** AI-vs-AI games under `config`; unfinished games come back with a null winner. */
export function modeGames(games: number, config: Partial<MatchConfig>, seed = 1): ModeGame[] {
  const out: ModeGame[] = []
  for (let g = 0; g < games; g++) {
    const s = seed * 7919 + g
    const level = DIFFICULTY_LIST[g % 3]
    const loadouts = { solari: aiLoadout(s, 'solari'), umbral: aiLoadout(s + 1, 'umbral') }
    const r = playGame(s, level, level, 600, { loadouts, ...config })
    out.push({ winner: r.state.winner, rounds: r.state.round, atLimit: r.state.round > r.state.config.roundLimit, problems: r.problems })
  }
  return out
}

export interface ModeReport {
  played: number
  unfinished: number
  atLimit: number
  wins: Record<'solari' | 'umbral' | 'draw', number>
  medianRounds: number
  longest: number
}

export function reportOn(results: readonly ModeGame[]): ModeReport {
  const report: ModeReport = { played: results.length, unfinished: 0, atLimit: 0, wins: { solari: 0, umbral: 0, draw: 0 }, medianRounds: 0, longest: 0 }
  for (const r of results) {
    if (r.winner) report.wins[r.winner]++
    else report.unfinished++
    if (r.atLimit) report.atLimit++
    report.longest = Math.max(report.longest, r.rounds)
  }
  const rounds = results.map((r) => r.rounds).sort((a, b) => a - b)
  report.medianRounds = rounds[Math.floor(rounds.length / 2)] ?? 0
  return report
}

if (process.argv[1]?.endsWith('main.mjs')) {
  const args = process.argv.slice(2)
  const flag = (name: string, fallback: number) => {
    const i = args.indexOf(`--${name}`)
    return i >= 0 ? Number(args[i + 1]) : fallback
  }
  const games = flag('games', 30)
  const seed = flag('seed', 1)
  for (const showdown of args.includes('--showdown') ? [true] : [false, true])
    for (const mode of args.includes('--only') ? [args[args.indexOf('--only') + 1] as MatchMode] : MODES) {
      const t0 = Date.now()
      const r = reportOn(modeGames(games, { mode, showdown, events: true }, seed))
      console.log(
        `${MODE_INFO[mode].name.padEnd(15)} ${showdown ? 'showdown ' : 'no showdown'}: ${r.played} games in ${((Date.now() - t0) / 1000).toFixed(0)}s, ` +
        `median round ${r.medianRounds}, longest ${r.longest}, ${r.atLimit} at the round limit, ${r.unfinished} unfinished, ` +
        `wins ${r.wins.solari}/${r.wins.umbral}/${r.wins.draw} (Solari/Umbral/draw)`,
      )
    }
}
