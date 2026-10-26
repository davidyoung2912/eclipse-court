/// <reference types="node" />
import { DIFFICULTY_LIST } from '../ai/profile'
import { playGame } from './game'

const args = process.argv.slice(2)
const flag = (name: string, fallback: number) => {
  const i = args.indexOf(`--${name}`)
  return i >= 0 ? Number(args[i + 1]) : fallback
}
const games = flag('games', 30)

const tally: Record<string, number> = {}
let bad = 0
let maxRound = 0
const t0 = Date.now()
for (let g = 0; g < games; g++) {
  const solari = DIFFICULTY_LIST[g % 3]
  const umbral = DIFFICULTY_LIST[Math.floor(g / 3) % 3]
  const r = playGame(g + 1, solari, umbral)
  const key = r.state.winner ?? 'unfinished'
  tally[key] = (tally[key] ?? 0) + 1
  maxRound = Math.max(maxRound, r.state.round)
  if (r.problems.length || !r.state.winner) {
    bad++
    console.log(`game ${g + 1} (${solari} vs ${umbral}): ${r.problems[0] ?? 'did not finish'} at round ${r.state.round}`)
  }
}
console.log(`${games} games in ${((Date.now() - t0) / 1000).toFixed(0)}s:`, tally, `longest ended at round ${maxRound}`)
if (bad) process.exit(1)
