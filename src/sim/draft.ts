/// <reference types="node" />
import { aiDraft } from '../engine/data/aiDraft'
import { DIFFICULTY_LIST } from '../ai/profile'
import { BOARDS } from '../engine/data/boards'
import { arrange, DRAFT_ROLES, countRole, randomDraft } from '../engine/data/draft'
import type { Role } from '../engine/rules/types'
import { playGame } from './game'

export interface DraftGame {
  solari: Role[]
  umbral: Role[]
  winner: 'solari' | 'umbral' | 'draw' | null
}

/** Plays AI-vs-AI games between independently drafted armies on random boards. */
export function draftGames(games: number, seed = 1): DraftGame[] {
  const out: DraftGame[] = []
  for (let g = 0; g < games; g++) {
    const s = seed * 7919 + g
    // Half the armies are random, half are the AI's own picks, so both sources are covered.
    const pick = (salt: number) => (g % 2 ? randomDraft(s * 31 + salt) : aiDraft(s * 31 + salt, DIFFICULTY_LIST[(g + salt) % 3]))
    const solari = pick(1)
    const umbral = pick(2)
    const board = BOARDS[g % BOARDS.length]
    const r = playGame(s, 'normal', 'normal', 400, {
      layout: arrange(solari), umbralLayout: arrange(umbral), beacons: board.beacons, blocked: board.blocked,
    })
    out.push({ solari, umbral, winner: r.state.winner })
  }
  return out
}

export interface DraftReport {
  played: number
  solariWins: number
  umbralWins: number
  unfinished: number
  /** For each role: how often the side fielding more of it won, among decided games where the counts differed. */
  moreOf: Record<string, { games: number; winRate: number }>
  /** Compositions seen at least `minGames` times, with the share of games they won. */
  compositions: { key: string; games: number; winRate: number }[]
}

const key = (roles: readonly Role[]) => DRAFT_ROLES.map((r) => `${r.slice(0, 2)}${countRole(roles, r)}`).join(' ')

export function reportOn(results: readonly DraftGame[], minGames = 4): DraftReport {
  const decided = results.filter((r) => r.winner === 'solari' || r.winner === 'umbral')
  const moreOf: DraftReport['moreOf'] = {}
  for (const role of DRAFT_ROLES) {
    let games = 0
    let wins = 0
    for (const r of decided) {
      const diff = countRole(r.solari, role) - countRole(r.umbral, role)
      if (!diff) continue
      games++
      if ((diff > 0) === (r.winner === 'solari')) wins++
    }
    moreOf[role] = { games, winRate: games ? wins / games : 0.5 }
  }
  const byKey = new Map<string, { games: number; wins: number }>()
  for (const r of decided)
    for (const court of ['solari', 'umbral'] as const) {
      const k = key(r[court])
      const e = byKey.get(k) ?? { games: 0, wins: 0 }
      e.games++
      if (r.winner === court) e.wins++
      byKey.set(k, e)
    }
  const compositions = [...byKey]
    .filter(([, e]) => e.games >= minGames)
    .map(([k, e]) => ({ key: k, games: e.games, winRate: e.wins / e.games }))
    .sort((a, b) => b.winRate - a.winRate)
  return {
    played: results.length,
    solariWins: results.filter((r) => r.winner === 'solari').length,
    umbralWins: results.filter((r) => r.winner === 'umbral').length,
    unfinished: results.length - decided.length - results.filter((r) => r.winner === 'draw').length,
    moreOf,
    compositions,
  }
}

if (process.argv[1]?.endsWith('main.mjs')) {
  const args = process.argv.slice(2)
  const flag = (name: string, fallback: number) => {
    const i = args.indexOf(`--${name}`)
    return i >= 0 ? Number(args[i + 1]) : fallback
  }
  const games = flag('games', 60)
  const t0 = Date.now()
  const report = reportOn(draftGames(games, flag('seed', 1)), flag('min', 4))
  const pct = (x: number) => `${Math.round(x * 100)}%`
  console.log(`${report.played} drafted games in ${((Date.now() - t0) / 1000).toFixed(0)}s: Solari ${report.solariWins}, Umbral ${report.umbralWins}, unfinished ${report.unfinished}`)
  console.log('\nWin rate of the side fielding more of a role (50% is neutral):')
  for (const [role, m] of Object.entries(report.moreOf)) console.log(`  ${role.padEnd(12)} ${pct(m.winRate).padStart(4)}  (${m.games} games)`)
  console.log('\nCompositions by win rate (fo fl ma br ch au):')
  for (const c of report.compositions.slice(0, 8)) console.log(`  ${c.key}  ${pct(c.winRate).padStart(4)}  (${c.games})`)
}
