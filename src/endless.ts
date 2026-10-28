import { puzzle, type Puzzle, type PuzzleDef } from './engine/data/puzzles/helpers'
import { createMiner, seededRandom, type MinerOptions } from './sim/generate'
import type { Action } from './engine/rules/types'

/**
 * Endless puzzles: positions found on the spot by the same generator and solver that mined the authored packs, each with a
 * rating, and a rating of your own that rises with a solve and falls with a miss.
 */
const KEY = 'eclipse-court:endless'

export const ENDLESS_START = 1000
/** Shards for each puzzle solved. */
export const SHARDS_ENDLESS = 2

export interface EndlessRecord {
  rating: number
  best: number
  solved: number
  missed: number
  streak: number
  bestStreak: number
  /** How many puzzles have been served; the next one's seed follows from it. */
  n: number
}

const fresh = (): EndlessRecord => ({ rating: ENDLESS_START, best: ENDLESS_START, solved: 0, missed: 0, streak: 0, bestStreak: 0, n: 0 })

export function loadEndless(): EndlessRecord {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const r = JSON.parse(raw) as Partial<EndlessRecord>
      const ok = (['rating', 'best', 'solved', 'missed', 'streak', 'bestStreak', 'n'] as const).every((k) => Number.isFinite(r[k]))
      if (ok) return r as EndlessRecord
    }
  } catch {
    // An unreadable record starts over.
  }
  return fresh()
}

export function saveEndless(r: EndlessRecord) {
  try {
    localStorage.setItem(KEY, JSON.stringify(r))
  } catch {
    // The rating is simply not kept without storage.
  }
}

export function resetEndless() {
  try {
    localStorage.removeItem(KEY)
  } catch {
    // Nothing was kept either.
  }
}

/** What to look for at a given rating. */
interface Band extends Omit<MinerOptions, 'rnd'> {
  name: string
  /** Rating of a puzzle needing `lo`, before the turns and distinct first moves adjust it. */
  base: number
}

export const BANDS: readonly Band[] = [
  { name: 'Gentle', tier: 'normal', lo: 2, hi: 2, maxFirsts: 8, nodeCap: 20000, needTrap: false, base: 850 },
  { name: 'Steady', tier: 'normal', lo: 2, hi: 3, maxFirsts: 6, nodeCap: 30000, needTrap: false, base: 1150 },
  { name: 'Sharp', tier: 'expert', lo: 3, hi: 3, maxFirsts: 4, nodeCap: 40000, needTrap: false, base: 1500 },
]

/** The band a rating is served from. */
export function bandFor(rating: number): number {
  return rating < 1150 ? 0 : rating < 1450 ? 1 : 2
}

/** A generated puzzle, as plain data that can cross a worker boundary. */
export interface Generated {
  seed: number
  band: number
  def: PuzzleDef
  line: Action[]
  turns: number
  firsts: number
}

/** The seed of the nth puzzle served. */
export const seedFor = (n: number, salt: number) => (Math.imul(n + 1, 2654435761) ^ salt) >>> 0

/** Searches from `seed` until a candidate passes every filter. Deterministic: the same seed and band give the same puzzle. */
export function generateEndless(seed: number, band: number): Generated {
  const b = BANDS[band]
  const { generate, evaluate } = createMiner({ ...b, rnd: seededRandom(seed) })
  for (;;) {
    const found = evaluate(generate())
    if (found) return { seed, band, def: found.def, line: found.line, turns: found.turns, firsts: found.firsts }
  }
}

/** A puzzle's own rating: harder with more turns, and with fewer first moves that work. */
export function puzzleRating(g: Pick<Generated, 'band' | 'turns' | 'firsts'>): number {
  const b = BANDS[g.band]
  return b.base + (g.turns - b.lo) * 150 + Math.max(0, 4 - g.firsts) * 30
}

const roleName = (id: string) => {
  const role = id.split('-')[1] ?? 'piece'
  return role === 'footsoldier' ? 'Footsoldier' : role[0].toUpperCase() + role.slice(1)
}
const spellName = (s: string) => s[0].toUpperCase() + s.slice(1)

/** What an action is, as a phrase for a hint. */
function describe(a: Action): string {
  if (a.type === 'move') return `a ${roleName(a.pieceId)}`
  if (a.type === 'cast') return `the ${spellName(a.spell)} spell`
  return 'a pass'
}

/** The puzzle to play, with hints drawn from its own solution. */
export function endlessPuzzle(g: Generated, number: number): Puzzle {
  const first = g.line[0]
  const casts = [...new Set(g.line.filter((a) => a.type === 'cast').map((a) => (a as { spell: string }).spell))]
  const hints: [string, string] = [
    casts.length ? `Your spells matter here: ${casts.map(spellName).join(', ')}.` : 'Count the turns, and which beacon you can still reach in time.',
    `Your first move involves ${describe(first)}.`,
  ]
  return puzzle({
    ...g.def,
    id: `endless-${g.seed}`, name: `Endless ${number}`,
    text: `Win within ${g.turns} ${g.turns === 1 ? 'turn' : 'turns'}. Rated ${puzzleRating(g)}.`,
    limit: g.turns, solution: g.line, hints,
  })
}

/** The record after a puzzle of rating `against` is solved or missed. */
export function applyResult(r: EndlessRecord, against: number, solved: boolean): EndlessRecord {
  const expected = 1 / (1 + 10 ** ((against - r.rating) / 400))
  const rating = Math.max(400, Math.round(r.rating + 32 * ((solved ? 1 : 0) - expected)))
  const streak = solved ? r.streak + 1 : 0
  return {
    ...r, rating, best: Math.max(r.best, rating), streak, bestStreak: Math.max(r.bestStreak, streak),
    solved: r.solved + (solved ? 1 : 0), missed: r.missed + (solved ? 0 : 1),
  }
}

/** A rating as a title. */
export function endlessTitle(rating: number): string {
  return rating < 900 ? 'Novice' : rating < 1150 ? 'Apprentice' : rating < 1450 ? 'Adept' : rating < 1750 ? 'Savant' : 'Eclipse Sage'
}

const SALT = 0x9e3779b9
const pending = new Map<string, Promise<Generated>>()

/** Finds the nth puzzle for a band, in a worker when there is one. A repeat request for the same one shares the search. */
export function requestEndless(n: number, band: number): Promise<Generated> {
  const key = `${n}:${band}`
  const held = pending.get(key)
  if (held) return held
  const seed = seedFor(n, SALT)
  const run = (): Promise<Generated> => {
    if (typeof Worker === 'undefined') return new Promise((resolve) => setTimeout(() => resolve(generateEndless(seed, band)), 0))
    return new Promise((resolve) => {
      const w = new Worker(new URL('./endlessWorker.ts', import.meta.url), { type: 'module' })
      const fallback = () => { w.terminate(); resolve(generateEndless(seed, band)) }
      w.onmessage = (e: MessageEvent<Generated>) => { w.terminate(); resolve(e.data) }
      w.onerror = fallback
      w.postMessage({ seed, band })
    })
  }
  const p = run()
  pending.set(key, p)
  // Only the next puzzle is ever held.
  for (const k of pending.keys()) if (k !== key) pending.delete(k)
  return p
}
