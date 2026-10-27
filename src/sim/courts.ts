/// <reference types="node" />
import { aiLoadout } from '../ai/draft'
import { DIFFICULTY_LIST } from '../ai/profile'
import { COURTS } from '../engine/rules/board'
import type { Court, GameState, MatchConfig } from '../engine/rules/types'
import { playGame } from './game'

export type WinShape = 'beacons' | 'elimination' | 'adjudication' | 'unfinished'

/** How a finished game was won: all beacons, the foe wiped out, or the round-limit count. */
export function winShape(state: GameState): WinShape {
  if (!state.winner) return 'unfinished'
  const solari = state.pieces.some((p) => p.court === 'solari')
  const umbral = state.pieces.some((p) => p.court === 'umbral')
  if (!solari || !umbral) return 'elimination'
  return state.round > state.config.roundLimit ? 'adjudication' : 'beacons'
}

export interface CourtGame {
  winner: GameState['winner']
  shape: WinShape
  rounds: number
}

/** AI-vs-AI games on the classic board with AI-picked loadouts; `config` adjusts the rules (passives off, recharge, ...). */
export function courtGames(games: number, config: Partial<MatchConfig> = {}, seed = 1): CourtGame[] {
  const out: CourtGame[] = []
  for (let g = 0; g < games; g++) {
    const s = seed * 104729 + g
    const loadouts = { solari: aiLoadout(s, 'solari'), umbral: aiLoadout(s + 1, 'umbral') }
    const level = DIFFICULTY_LIST[g % 3]
    const r = playGame(s, level, level, 400, { loadouts, ...config })
    out.push({ winner: r.state.winner, shape: winShape(r.state), rounds: r.state.round })
  }
  return out
}

export interface CourtReport {
  played: number
  wins: Record<Court, number>
  /** For each court, its wins split by how they were won. */
  shapes: Record<Court, Record<WinShape, number>>
  medianRounds: number
}

export function reportOn(results: readonly CourtGame[]): CourtReport {
  const empty = (): Record<WinShape, number> => ({ beacons: 0, elimination: 0, adjudication: 0, unfinished: 0 })
  const report: CourtReport = {
    played: results.length,
    wins: { solari: 0, umbral: 0 },
    shapes: { solari: empty(), umbral: empty() },
    medianRounds: 0,
  }
  for (const r of results)
    if (r.winner === 'solari' || r.winner === 'umbral') {
      report.wins[r.winner]++
      report.shapes[r.winner][r.shape]++
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
  const games = flag('games', 60)
  const seed = flag('seed', 1)
  const variants: [string, Partial<MatchConfig>][] = [
    ['with passives', {}],
    ['without passives', { passives: false }],
    ['spells recharge (8)', { recharge: 8 }],
  ]
  for (const [name, config] of variants) {
    const t0 = Date.now()
    const report = reportOn(courtGames(games, config, seed))
    console.log(`\n${name}: ${report.played} games in ${((Date.now() - t0) / 1000).toFixed(0)}s, median round ${report.medianRounds}`)
    for (const court of COURTS) {
      const s = report.shapes[court]
      console.log(`  ${court.padEnd(7)} ${String(report.wins[court]).padStart(3)} wins: ${s.beacons} by beacons, ${s.elimination} by elimination, ${s.adjudication} by round limit`)
    }
  }
}
