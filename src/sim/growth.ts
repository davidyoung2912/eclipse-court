/// <reference types="node" />
import type { MatchConfig } from '../engine/rules/types'
import { growthGames } from './growthGames'

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
