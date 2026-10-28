/// <reference types="node" />
import { aiLoadout } from '../engine/data/aiDraft'
import { PERSONALITIES, type PersonalityId } from '../engine/data/personality'
import { MODE_INFO } from '../engine/rules/events'
import type { MatchMode } from '../engine/rules/types'
import { playGame } from './game'

const args = process.argv.slice(2)
const games = Number(args[args.indexOf('--games') + 1]) || 4
const MODES = Object.keys(MODE_INFO) as MatchMode[]
const STYLES = Object.keys(PERSONALITIES) as PersonalityId[]

// Every style meets every other in each mode, once from each court; the score is wins plus half the draws.
const score: Record<string, { points: number; played: number; stuck: number }> = {}
for (const s of STYLES) score[s] = { points: 0, played: 0, stuck: 0 }
const t0 = Date.now()
for (const mode of MODES) {
  for (const a of STYLES) {
    for (const b of STYLES) {
      if (a === b) continue
      for (let g = 0; g < games; g++) {
        const seed = 31 * g + 7
        const loadouts = { solari: aiLoadout(seed, 'solari'), umbral: aiLoadout(seed + 1, 'umbral') }
        const r = playGame(seed, 'normal', 'normal', 600, { loadouts, mode }, { solari: a, umbral: b })
        score[a].played++
        score[b].played++
        if (!r.state.winner) { score[a].stuck++; score[b].stuck++ }
        else if (r.state.winner === 'draw') { score[a].points += 0.5; score[b].points += 0.5 }
        else score[r.state.winner === 'solari' ? a : b].points++
      }
    }
  }
  process.stderr.write(`${mode}\n`)
}
console.log(`\nStyle report: ${MODES.length} modes, ${games} games per pairing and court, ${((Date.now() - t0) / 1000).toFixed(0)}s`)
for (const s of STYLES) {
  const { points, played, stuck } = score[s]
  console.log(`  ${s.padEnd(10)} ${`${Math.round((points / played) * 100)}%`.padStart(4)} of ${played} games${stuck ? `, ${stuck} unfinished` : ''}`)
}
