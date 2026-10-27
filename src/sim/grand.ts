/// <reference types="node" />
import { growthGames } from './growthGames'
import { GRAND_BOARDS } from '../engine/data/boards'
import { grandConfig } from '../engine/data/matchConfig'
import type { MatchConfig } from '../engine/rules/types'

/** 7x7 against the 9x9 boards, all with growth and promotion on, to check the Grand rules keep the game's pace and balance. */
if (process.argv[1]?.endsWith('main.mjs')) {
  const args = process.argv.slice(2)
  const flag = (name: string, fallback: number) => {
    const i = args.indexOf(`--${name}`)
    return i >= 0 ? Number(args[i + 1]) : fallback
  }
  const games = flag('games', 30)
  const seed = flag('seed', 1)
  const rules: Partial<MatchConfig> = { growth: true, promotion: true }
  const variants: [string, Partial<MatchConfig>][] = [
    ['7x7', rules],
    ...GRAND_BOARDS.map((b): [string, Partial<MatchConfig>] => [b.id, grandConfig(rules, b.id)]),
  ]
  for (const [name, config] of variants) {
    const t0 = Date.now()
    const r = growthGames(games, config, seed)
    console.log(
      `${name.padEnd(14)}: ${r.played} games in ${((Date.now() - t0) / 1000).toFixed(0)}s, median round ${r.medianRounds}, ${r.unfinished} unfinished, ` +
      `wins ${r.wins.solari}/${r.wins.umbral}/${r.wins.draw} (Solari/Umbral/draw), ${(r.promoted / games).toFixed(2)} promotions/game` +
      (r.problems.length ? `, PROBLEMS: ${r.problems.slice(0, 3).join('; ')}` : ''),
    )
  }
}
