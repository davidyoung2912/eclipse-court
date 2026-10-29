/** The games behind the player's daily and weekly results, kept so a ghost code can carry the game as well as the score. */
const KEY = 'eclipse-court:ghosts'

export interface GhostResult {
  won: boolean
  draw: boolean
  turns: number
  lost: number
}

export interface GhostGame {
  /** The day or week as a `dailySeed`. */
  id: number
  score: number
  result: GhostResult
  /** The game as a record code. */
  code: string
}

export interface GhostsState {
  daily: GhostGame | null
  weekly: GhostGame | null
}

const EMPTY: GhostsState = { daily: null, weekly: null }

const int = (x: unknown): x is number => typeof x === 'number' && Number.isInteger(x) && x >= 0

const entry = (raw: unknown): GhostGame | null => {
  const o = raw as Partial<GhostGame> | null
  const r = o?.result as Partial<GhostResult> | undefined
  return o && typeof o === 'object' && int(o.id) && o.id > 0 && int(o.score) && r && typeof r.won === 'boolean' && typeof r.draw === 'boolean' && int(r.turns) && int(r.lost)
    && typeof o.code === 'string' && o.code.length > 0 && o.code.length <= 20000 && /^[A-Za-z0-9_-]+$/.test(o.code)
    ? { id: o.id, score: o.score, result: { won: r.won, draw: r.draw, turns: r.turns, lost: r.lost }, code: o.code } : null
}

export function parseGhosts(raw: unknown): GhostsState {
  const o = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  return { daily: entry(o.daily), weekly: entry(o.weekly) }
}

function load(): GhostsState {
  try {
    return parseGhosts(JSON.parse(localStorage.getItem(KEY) ?? 'null'))
  } catch {
    return EMPTY
  }
}

let state = load()

export const ghostsSnapshot = () => state

/**
 * Keeps the game behind a result. The daily keeps the day's first scored game (its one attempt);
 * the weekly keeps the best score of the week.
 */
export function recordGhostGame(kind: 'daily' | 'weekly', id: number, score: number, result: GhostResult, code: string) {
  const was = state[kind]
  if (was && was.id === id && (kind === 'daily' || was.score >= score)) return
  state = { ...state, [kind]: { id, score, result, code } }
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    // Without storage a shared ghost carries its score alone.
  }
}

/** The kept game for `id`, or undefined if the one kept is from another day or week. */
export const ghostGameFor = (kind: 'daily' | 'weekly', id: number): GhostGame | undefined => {
  const g = state[kind]
  return g && g.id === id ? g : undefined
}
