/// <reference types="node" />
import { PUZZLES } from '../engine/data/puzzles'
import { actionCode, solve, type Rival } from '../engine/data/puzzles/solver'

// npm run puzzles -- [--id <id>] [--rival pass|ai] [--turns N]
const args = process.argv.slice(2)
const flag = (name: string) => { const i = args.indexOf(`--${name}`); return i >= 0 ? args[i + 1] : undefined }
const only = flag('id')
const rival = (flag('rival') ?? 'ai') as Rival

for (const p of PUZZLES) {
  if (only && p.id !== only) continue
  const turns = Number(flag('turns') ?? p.limit)
  const t0 = Date.now()
  const r = solve(p.build(), p, turns, rival)
  console.log(`${p.id}: limit ${p.limit}, ${rival} rival -> ${r.turns === null ? 'no win' : `win in ${r.turns}`}, ${r.firsts} first move(s), ${r.nodes} nodes, ${Date.now() - t0}ms`)
  if (only) for (const l of r.lines) console.log(`  [${l.map(actionCode).join(', ')}]`)
}
