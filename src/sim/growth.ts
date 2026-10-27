/// <reference types="node" />
import { aiLoadout } from '../engine/data/aiDraft'
import { DIFFICULTY_LIST } from '../ai/profile'
import { rankOf } from '../engine/rules/growth'
import type { MatchConfig } from '../engine/rules/types'
import { playGame } from './game'

export interface GrowthReport {
  played: number
  unfinished: number
  wins: Record<'solari' | 'umbral' | 'draw', number>
  medianRounds: number
  /** Pieces per game that ended as Veterans, Elites, or promoted from Footsoldiers. */
  veterans: number
  elites: number
  promoted: number
  problems: string[]
}

/** AI-vs-AI games under `config` (showdown on), summarising how much growth the games saw. */
export function growthGames(games: number, config: Partial<MatchConfig>, seed = 1): GrowthReport {
  const report: GrowthReport = { played: games, unfinished: 0, wins: { solari: 0, umbral: 0, draw: 0 }, medianRounds: 0, veterans: 0, elites: 0, promoted: 0, problems: [] }
  const rounds: number[] = []
  for (let g = 0; g < games; g++) {
    const s = seed * 7919 + g
    const level = DIFFICULTY_LIST[g % 3]
    const loadouts = { solari: aiLoadout(s, 'solari'), umbral: aiLoadout(s + 1, 'umbral') }
    const r = playGame(s, level, level, 600, { loadouts, showdown: true, events: true, ...config })
    if (r.state.winner) report.wins[r.state.winner]++
    else report.unfinished++
    rounds.push(r.state.round)
    report.problems.push(...r.problems)
    for (const p of [...r.state.pieces, ...r.state.captured]) {
      const rank = rankOf(p)
      if (rank !== 'recruit') report.veterans++
      if (rank === 'elite') report.elites++
      if (!p.id.includes(`-${p.role}-`) && !p.id.includes('conjured')) report.promoted++
    }
  }
  rounds.sort((a, b) => a - b)
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
  const variants: [string, Partial<MatchConfig>][] = [
    ['no growth', {}],
    ['veterancy', { growth: true }],
    ['promotion', { promotion: true }],
    ['both', { growth: true, promotion: true }],
  ]
  for (const [name, config] of variants) {
    const t0 = Date.now()
    const r = growthGames(games, config, seed)
    console.log(
      `${name.padEnd(10)}: ${r.played} games in ${((Date.now() - t0) / 1000).toFixed(0)}s, median round ${r.medianRounds}, ${r.unfinished} unfinished, ` +
      `wins ${r.wins.solari}/${r.wins.umbral}/${r.wins.draw} (Solari/Umbral/draw), per game: ` +
      `${(r.veterans / games).toFixed(1)} veterans, ${(r.elites / games).toFixed(1)} elites, ${(r.promoted / games).toFixed(1)} promotions` +
      (r.problems.length ? `, PROBLEMS: ${r.problems.slice(0, 3).join('; ')}` : ''),
    )
  }
}
