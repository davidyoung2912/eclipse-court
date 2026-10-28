/// <reference types="node" />
import { writeFileSync } from 'node:fs'
import { actionCode } from './puzzleSolver'
import { actors, createMiner, seededRandom } from './generate'
import type { Spell } from '../engine/rules/types'

const args = process.argv.slice(2)
const flag = (name: string, fallback: string) => { const i = args.indexOf(`--${name}`); return i >= 0 ? args[i + 1] : fallback }
const tier = flag('tier', 'normal') as 'normal' | 'expert'
const seed = Number(flag('seed', '1')) >>> 0
const seconds = Number(flag('seconds', '60'))
const out = flag('out', 'mined.txt')
const lo = Number(flag('min', tier === 'normal' ? '2' : '3'))
const hi = Number(flag('max', tier === 'normal' ? '3' : '4'))
const maxFirsts = Number(flag('firsts', '3'))
const nodeCap = Number(flag('nodes', '60000'))
const need = flag('need', '') as Spell | ''
const needTrap = flag('trap', tier === 'expert' ? '1' : '0') === '1'

const template = flag('template', 'random')
const adjacent = flag('adjacent', '0') === '1'

const { generate, evaluate, prune } = createMiner({ tier, lo, hi, maxFirsts, nodeCap, need, needTrap, template, adjacent, rnd: seededRandom(seed) })


const sigs = new Map<string, number>()
const found: string[] = []
const t0 = Date.now()
let tried = 0
while (Date.now() - t0 < seconds * 1000) {
  tried++
  const first = evaluate(generate())
  if (!first) continue
  const f = prune(first)
  const { def, line } = f
  const sig = [...actors(line)].map((x) => x.replace(/-\d+$/, '').replace(/^solari-/, '')).sort().join('+')
  if ((sigs.get(sig) ?? 0) >= 2) continue
  sigs.set(sig, (sigs.get(sig) ?? 0) + 1)
  const lit = (xs: readonly { x: number; y: number }[]) => `[${xs.map((b) => `at(${b.x}, ${b.y})`).join(', ')}]`
  const extras = [
    def.spells?.length ? `spells: ${JSON.stringify(def.spells).replace(/"/g, "'")}` : '',
    def.rules ? `rules: ${JSON.stringify(def.rules).replace(/"/g, "'")}` : '',
    def.fallen ? `fallen: '${def.fallen}'` : '',
    def.lastUmbral ? `lastUmbral: '${def.lastUmbral}'` : '',
    def.umbralSpells ? `umbralSpells: ${JSON.stringify(def.umbralSpells).replace(/"/g, "'")}` : '',
    f.trap ? 'rivalMatters: true' : '',
  ].filter(Boolean).join(', ')
  found.push(`  // ${sig} | turns ${f.turns} | firsts ${f.firsts} | pass-rival ${f.passTurns}
  puzzle({
    ...base, id: 'cand-${found.length + 1}', name: 'TODO', limit: ${f.turns}, seed: ${def.seed},
    text: 'TODO',
    beacons: ${lit(def.beacons)},
    solari: '${def.solari}', umbral: '${def.umbral}',${extras ? `\n    ${extras},` : ''}
    solution: [${line.map(actionCode).join(', ')}],
    hints: ['TODO', 'TODO'],
  }),`)
  console.error(`#${found.length} ${sig} turns ${f.turns} trap ${f.trap} (${tried} tried)`)
}
writeFileSync(out, found.join('\n') + '\n')
console.error(`${found.length} found in ${tried} tries`)
