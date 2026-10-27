/// <reference types="node" />
import { writeFileSync } from 'node:fs'
import { reduce } from '../engine/reducer'
import { pieceAt } from '../engine/rules/moves'
import { actionCode, rivalReply, solve } from '../engine/data/puzzles/solver'
import { puzzle, type PuzzleDef } from '../engine/data/puzzles/helpers'
import type { Action, Role, Spell } from '../engine/rules/types'

// npm run mine -- --tier normal|expert --seed S --seconds T --out file [--min a --max b --firsts n]
const args = process.argv.slice(2)
const flag = (name: string, fallback: string) => { const i = args.indexOf(`--${name}`); return i >= 0 ? args[i + 1] : fallback }
const tier = flag('tier', 'normal') as 'normal' | 'expert'
let seed = Number(flag('seed', '1')) >>> 0
const seconds = Number(flag('seconds', '60'))
const out = flag('out', 'mined.txt')
const lo = Number(flag('min', tier === 'normal' ? '2' : '3'))
const hi = Number(flag('max', tier === 'normal' ? '3' : '4'))
const maxFirsts = Number(flag('firsts', '3'))
const nodeCap = Number(flag('nodes', '60000'))
const need = flag('need', '') as Spell | ''
const needTrap = flag('trap', tier === 'expert' ? '1' : '0') === '1'

const rnd = () => { seed = (seed + 0x6d2b79f5) >>> 0; let t = seed; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296 }
const pick = <T,>(xs: readonly T[]): T => xs[Math.floor(rnd() * xs.length)]
const WORD: Record<Role, string> = { footsoldier: 'foot', flier: 'flier', marksman: 'mark', bruiser: 'brute', charger: 'stag', aura: 'aura', leader: 'lead' }
const HP: Record<Role, number> = { footsoldier: 4, flier: 5, marksman: 5, bruiser: 10, charger: 6, aura: 6, leader: 7 }
const ROLES: Role[] = ['footsoldier', 'flier', 'marksman', 'bruiser', 'charger', 'aura']

const POOL = [[0, 3], [1, 1], [1, 5], [2, 0], [2, 6], [3, 3], [3, 0], [3, 6], [2, 2], [2, 4], [1, 3], [4, 2], [4, 4]]
const SPELLS: Spell[] = ['blink', 'mend', 'turn', 'swap', 'conjure', 'bind', 'hasten', 'hold', 'exchange', 'mirror', 'revive']
const COPYABLE: Spell[] = ['blink', 'mend', 'turn', 'swap', 'conjure', 'bind', 'hasten']
const UMBRAL_SPELLS: Spell[] = ['bind', 'blink', 'conjure', 'shroud', 'mend']

interface P { role: Role; x: number; y: number; hp?: number }
const spec = (ps: P[]) => ps.map((p) => `${WORD[p.role]} ${p.x},${p.y}${p.hp !== undefined && p.hp !== HP[p.role] ? ` hp${p.hp}` : ''}`).join('; ')

const template = flag('template', 'random')
const adjacent = flag('adjacent', '0') === '1'

/** A fight on a square where the light matters: a rival on the last beacon, one of ours a step or two from it. */
function generateDuel(): PuzzleDef {
  const T = pick(adjacent ? [[2, 1], [2, 5], [1, 2], [1, 4], [3, 0], [3, 6], [4, 1], [4, 5], [5, 2], [5, 4]] : [[2, 4], [2, 2], [3, 2], [3, 4], [2, 3], [4, 2], [4, 4], [3, 1], [3, 5], [1, 3], [4, 3]])
  const dr = pick(ROLES)
  const ar = pick(ROLES)
  const taken = new Set([`0,3`, `1,1`, `${T[0]},${T[1]}`])
  let ax = 0, ay = 0
  for (let tries = 0; tries < 50; tries++) {
    ax = T[0] + Math.floor(rnd() * 7) - 3
    ay = T[1] + Math.floor(rnd() * 7) - 3
    if (ax >= 0 && ax <= 4 && ay >= 0 && ay < 7 && !taken.has(`${ax},${ay}`) && Math.max(Math.abs(ax - T[0]), Math.abs(ay - T[1])) >= (adjacent ? 1 : 2)) break
  }
  const mine: P[] = [{ role: 'leader', x: 0, y: 3 }, { role: 'footsoldier', x: 1, y: 1 }, { role: ar, x: ax, y: ay, hp: 1 + Math.floor(rnd() * HP[ar]) }]
  const theirs: P[] = [{ role: 'leader', x: 6, y: pick([0, 6]) }, { role: dr, x: T[0], y: T[1], hp: 1 + Math.floor(rnd() * HP[dr]) }]
  return {
    id: 'cand', name: 'cand', text: 'TODO', tier, limit: hi, seed: Math.floor(rnd() * 1e6), hints: ['TODO', 'TODO'], solution: [],
    beacons: [{ x: 0, y: 3 }, { x: 1, y: 1 }, { x: T[0], y: T[1] }], solari: spec(mine), umbral: spec(theirs), spells: need ? [need] : [],
  }
}

/** A hurt guard on a beacon, a rival that is about to reach it, and a piece of ours that needs a couple of turns to take the last beacon. */
function generateBind(): PuzzleDef {
  const T = pick([[3, 3], [3, 0], [3, 6], [2, 2], [2, 4], [3, 2], [3, 4], [2, 6], [2, 0]])
  const G = pick([[1, 1], [1, 5], [2, 0], [2, 6], [0, 2], [0, 4]])
  const taken = new Set([`0,3`, `${G[0]},${G[1]}`, `${T[0]},${T[1]}`])
  const place = (anchor: number[], lo: number, hi2: number, xmin: number, xmax: number) => {
    for (let tries = 0; tries < 80; tries++) {
      const x = anchor[0] + Math.floor(rnd() * 11) - 5
      const y = anchor[1] + Math.floor(rnd() * 11) - 5
      const d = Math.max(Math.abs(x - anchor[0]), Math.abs(y - anchor[1]))
      if (x >= xmin && x <= xmax && y >= 0 && y < 7 && !taken.has(`${x},${y}`) && d >= lo && d <= hi2) { taken.add(`${x},${y}`); return [x, y] }
    }
    return null
  }
  const gr = pick(['footsoldier', 'marksman', 'flier'] as Role[])
  const yr = pick(['bruiser', 'charger', 'marksman', 'aura', 'flier'] as Role[])
  const xr = pick(['footsoldier', 'bruiser', 'marksman', 'charger'] as Role[])
  const y = place(G, 3, 4, 3, 6)
  const x = place(T, 2, 4, 0, 3)
  if (!y || !x) return generateBind()
  const mine: P[] = [{ role: 'leader', x: 0, y: 3 }, { role: gr, x: G[0], y: G[1], hp: 1 + Math.floor(rnd() * 2) }, { role: xr, x: x[0], y: x[1] }]
  const theirs: P[] = [{ role: 'leader', x: 6, y: pick([0, 6]) }, { role: yr, x: y[0], y: y[1] }]
  return {
    id: 'cand', name: 'cand', text: 'TODO', tier, limit: hi, seed: Math.floor(rnd() * 1e6), hints: ['TODO', 'TODO'], solution: [],
    beacons: [{ x: 0, y: 3 }, { x: G[0], y: G[1] }, { x: T[0], y: T[1] }], solari: spec(mine), umbral: spec(theirs), spells: ['bind'],
  }
}

function generate(): PuzzleDef {
  if (template === 'duel') return generateDuel()
  if (template === 'bind') return generateBind()
  const taken = new Set<string>()
  const key = (x: number, y: number) => `${x},${y}`
  const free = (x: number, y: number) => x >= 0 && x < 7 && y >= 0 && y < 7 && !taken.has(key(x, y))
  const take = (x: number, y: number) => { taken.add(key(x, y)); return { x, y } }
  const nb = tier === 'normal' ? pick([2, 3, 3]) : pick([3, 3, 4])
  const beacons: { x: number; y: number }[] = []
  while (beacons.length < nb) { const [x, y] = pick(POOL); if (!beacons.some((b) => b.x === x && b.y === y)) beacons.push({ x, y }) }
  const leaderMode = rnd() < 0.15
  const mine: P[] = []
  const theirs: P[] = []
  // The Solarch sits on a beacon about half the time.
  const lb = rnd() < 0.5 ? pick(beacons) : null
  const lp = lb ?? { x: Math.floor(rnd() * 3), y: Math.floor(rnd() * 7) }
  take(lp.x, lp.y); mine.push({ role: 'leader', ...lp })
  const targets: { x: number; y: number }[] = []
  for (const b of beacons) {
    if (taken.has(key(b.x, b.y))) continue
    if (rnd() < 0.4) { take(b.x, b.y); mine.push({ role: pick(ROLES), ...b }) } else targets.push(b)
  }
  const extra = 1 + Math.floor(rnd() * 3)
  for (let i = 0; i < extra; i++) {
    for (let tries = 0; tries < 20; tries++) {
      const t = targets.length && rnd() < 0.7 ? pick(targets) : { x: 1, y: 3 }
      const x = t.x + Math.floor(rnd() * 7) - 3
      const y = t.y + Math.floor(rnd() * 7) - 3
      if (x > 3 || !free(x, y)) continue
      mine.push({ role: pick(ROLES), ...take(x, y) })
      break
    }
  }
  // Their Leader at home; weak blockers on target beacons now and then.
  // Some of ours are hurt, which gives Mend something to do.
  for (const m of mine) if (m.role !== 'leader' && rnd() < 0.3) m.hp = 1 + Math.floor(rnd() * (HP[m.role] - 1))
  // A fast rival that can reach a target beacon.
  if (targets.length && rnd() < 0.45) {
    const t = pick(targets)
    for (let tries = 0; tries < 20; tries++) {
      const k = 1 + Math.floor(rnd() * 3)
      const [dx, dy] = pick([[1, 0], [0, 1], [0, -1], [1, 1], [1, -1]])
      const x = t.x + dx * k
      const y = t.y + dy * k
      if (!free(x, y)) continue
      theirs.push({ role: pick(['flier', 'aura', 'marksman'] as Role[]), ...take(x, y) })
      break
    }
  }
  const ul = { x: 6, y: pick([0, 1, 2, 3, 4, 5, 6]) }
  take(ul.x, ul.y)
  theirs.push({ role: 'leader', ...ul, hp: leaderMode ? 1 + Math.floor(rnd() * 3) : undefined })
  for (const t of targets) if (rnd() < 0.5 && free(t.x, t.y)) { const role = pick(ROLES); theirs.push({ role, ...take(t.x, t.y), hp: 1 + Math.floor(rnd() * HP[role]) }) }
  const guards = 1 + Math.floor(rnd() * 3)
  for (let i = 0; i < guards; i++) {
    for (let tries = 0; tries < 20; tries++) {
      const x = 3 + Math.floor(rnd() * 4)
      const y = Math.floor(rnd() * 7)
      if (!free(x, y)) continue
      theirs.push({ role: pick(ROLES), ...take(x, y) })
      break
    }
  }
  if (leaderMode) {
    // A guard in reach of the Duskmother, and a hunter for her.
    const g = theirs[0]
    for (const [dx, dy] of [[-1, 0], [0, 1], [0, -1], [-1, 1], [-1, -1]]) if (free(g.x + dx, g.y + dy)) { theirs.push({ role: pick(ROLES), ...take(g.x + dx, g.y + dy) }); break }
  }
  const spells = new Set<Spell>()
  const nSpells = Math.floor(rnd() * 3) + (tier === 'expert' ? 1 : 0)
  if (need) spells.add(need)
  while (spells.size < nSpells + (need ? 1 : 0)) spells.add(pick(SPELLS))
  let fallen: string | undefined
  if (spells.has('revive')) fallen = spec([{ role: pick(ROLES), x: 0, y: 0 }])
  const lastUmbral = spells.has('mirror') ? pick(COPYABLE) : undefined
  const umbralSpells: Spell[] = []
  if (tier === 'expert' && rnd() < 0.5) { umbralSpells.push(pick(UMBRAL_SPELLS)); if (rnd() < 0.3) umbralSpells.push(pick(UMBRAL_SPELLS.filter((s) => s !== umbralSpells[0]))) }
  return {
    id: 'cand', name: 'cand', text: 'TODO', tier, limit: hi, seed: Math.floor(rnd() * 1e6), hints: ['TODO', 'TODO'], solution: [],
    beacons: leaderMode ? [{ x: 0, y: 3 }, { x: 3, y: 3 }, { x: 6, y: 3 }] : beacons,
    solari: spec(mine), umbral: spec(theirs), spells: [...spells],
    rules: leaderMode ? { mode: 'leader' } : undefined, fallen, lastUmbral, umbralSpells: umbralSpells.length ? umbralSpells : undefined,
  }
}

const actors = (line: Action[]) => new Set(line.map((a) => (a.type === 'move' ? a.pieceId : a.type === 'cast' ? a.spell : 'pass')))

interface Found { def: PuzzleDef; line: Action[]; turns: number; firsts: number; trap: boolean; passTurns: number | null }

/** Solves a candidate and applies every filter; null if it does not qualify. */
function evaluate(def: PuzzleDef): Found | null {
  let p
  try { p = puzzle(def) } catch { return null }
  const start = p.build()
  if (start.winner) return null
  const r = solve(start, p, hi, 'ai', 8, nodeCap)
  if (r.turns === null || r.turns < lo || r.firsts > maxFirsts) return null
  const rp = solve(start, p, r.turns, 'pass', 1, nodeCap * 4)
  const trap = rp.turns === null || rp.turns < r.turns
  if (needTrap && !trap) return null
  // Prefer a line that uses several pieces or spells and never passes.
  const line = [...r.lines].sort((a, b) => (actors(b).size - actors(a).size) || (b.filter((x) => x.type !== 'pass').length - a.filter((x) => x.type !== 'pass').length))[0]
  if (line.some((a) => a.type === 'pass') || actors(line).size < 2) return null
  const used = new Set(line.filter((a) => a.type === 'cast').map((a) => (a as { spell: Spell }).spell))
  if (need && !used.has(need)) return null
  // Every spell the line casts must be needed: without it there is no win in as many turns.
  for (const sp of used) {
    const without = puzzle({ ...def, spells: (def.spells ?? []).filter((x) => x !== sp) })
    const r2 = solve(without.build(), without, r.turns, 'ai', 1, nodeCap)
    if (r2.turns !== null) return null
  }
  let s = start
  for (const a of line) {
    // A plain step onto a square a rival piece held at the start only works because the AI chose to leave it.
    if (a.type === 'move' && !a.duel && pieceAt(start, a.to)?.court === 'umbral' && !pieceAt(s, a.to)) return null
    s = reduce(s, a)
    if (s.winner) break
    const r = rivalReply(s, p, 'ai')
    if (!r) return null
    s = reduce(s, r)
  }
  if (s.winner !== 'solari') return null
  return { def, line, turns: r.turns, firsts: r.firsts, trap, passTurns: rp.turns }
}

/** Drops every piece (and unused spell) the puzzle does not need, keeping it as hard as it was. */
function prune(found: Found): Found {
  let best = found
  for (const side of ['solari', 'umbral'] as const) {
    for (let i = 0; ; i++) {
      const parts = best.def[side].split(';').map((x) => x.trim())
      if (i >= parts.length) break
      if (parts[i].startsWith('lead')) continue
      const def = { ...best.def, [side]: parts.filter((_, j) => j !== i).join('; ') }
      const f = evaluate(def)
      if (f && f.turns === best.turns && f.trap === best.trap && f.firsts <= best.firsts) { best = f; i-- }
    }
  }
  const used = new Set(best.line.filter((a) => a.type === 'cast').map((a) => (a as { spell: Spell }).spell))
  const keep = tier === 'normal' ? [...used] : [...(best.def.spells ?? [])]
  return { ...best, def: { ...best.def, spells: keep, fallen: used.has('revive') ? best.def.fallen : undefined, lastUmbral: used.has('mirror') ? best.def.lastUmbral : undefined } }
}

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
