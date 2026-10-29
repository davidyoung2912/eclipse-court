import { campaignGame, type Opponent } from './campaign'
import { NAME_MAX, PERSONAS, personaById, type PersonaId } from './personas'

/** Hot-seat tournaments take 4 to 8 local players. */
export const MIN_PLAYERS = 4
export const MAX_PLAYERS = 8
/** The Persona Cup: the player and seven of the eight personas. */
export const CUP_SIZE = 8
/** Shards for each Cup match won, and for the whole Cup on top of that. */
export const SHARDS_CUP_MATCH = 10
export const SHARDS_CUP_WON = 150

/** An entrant with no one yet in the slot (a bye in round 0, a match not yet decided later). */
export const NONE = -1

/**
 * A single-elimination bracket. Entrants are indices into `names`. `slots` is round 0 in match order
 * (two slots a match, `NONE` for a bye) and `results[r][m]` is who won match `m` of round `r`, or `NONE` while it is open.
 */
export interface Bracket {
  names: readonly string[]
  slots: readonly number[]
  results: readonly (readonly number[])[]
}

export interface MatchRef {
  round: number
  match: number
}

/** The next power of two at or above `n`. */
export const bracketSize = (n: number) => { let s = 2; while (s < n) s *= 2; return s }
export const roundCount = (n: number) => Math.log2(bracketSize(n))

/** A small seeded generator, so a bracket is the same for the same seed. */
function rng(seed: number) {
  let a = (seed >>> 0) || 1
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** The numbers 0 to n-1 in a seeded order. */
export function shuffled(n: number, seed: number): number[] {
  const next = rng(seed)
  const order = Array.from({ length: n }, (_, i) => i)
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1))
    ;[order[i], order[j]] = [order[j], order[i]]
  }
  return order
}

/** Names trimmed to length, blanks filled with "Player N" and repeats numbered, so every entrant is distinct. */
export function cleanNames(raw: readonly string[]): string[] {
  const seen = new Set<string>()
  return raw.map((r, i) => {
    const base = r.trim().slice(0, NAME_MAX).trim() || `Player ${i + 1}`
    let name = base
    for (let k = 2; seen.has(name.toLowerCase()); k++) name = `${base.slice(0, NAME_MAX - 2)} ${k}`
    seen.add(name.toLowerCase())
    return name
  })
}

/** A bracket of the named entrants, shuffled by `seed`; the first few in that order take the byes when the count is not a power of two. */
export function newBracket(names: readonly string[], seed: number): Bracket {
  const n = names.length
  const size = bracketSize(n)
  const order = shuffled(n, seed)
  const byes = size - n
  const slots: number[] = []
  let k = 0
  for (let m = 0; m < size / 2; m++) {
    slots.push(order[k++], m < byes ? NONE : order[k++])
  }
  const results = Array.from({ length: Math.log2(size) }, (_, r) => Array<number>(size / 2 ** (r + 1)).fill(NONE))
  for (let m = 0; m < size / 2; m++) if (slots[2 * m + 1] === NONE) results[0][m] = slots[2 * m]
  return { names, slots, results }
}

/** Who stands on each side of a match; `NONE` where the feeding match is not decided yet. */
export function sidesOf(b: Bracket, { round, match }: MatchRef): [number, number] {
  if (round === 0) return [b.slots[2 * match], b.slots[2 * match + 1]]
  return [b.results[round - 1][2 * match], b.results[round - 1][2 * match + 1]]
}

/** The first open match with both entrants known (and not skipped), or null when there is none. */
export function nextMatch(b: Bracket, skip: (ref: MatchRef) => boolean = () => false): MatchRef | null {
  for (let round = 0; round < b.results.length; round++)
    for (let match = 0; match < b.results[round].length; match++) {
      const ref = { round, match }
      if (b.results[round][match] !== NONE || skip(ref)) continue
      const [a, c] = sidesOf(b, ref)
      if (a !== NONE && c !== NONE) return ref
    }
  return null
}

/** Records a winner for an open match; the bracket is returned unchanged if the entrant is not in it. */
export function report(b: Bracket, ref: MatchRef, winner: number): Bracket {
  if (b.results[ref.round]?.[ref.match] !== NONE) return b
  if (winner === NONE || !sidesOf(b, ref).includes(winner)) return b
  return { ...b, results: b.results.map((row, r) => (r === ref.round ? row.map((w, m) => (m === ref.match ? winner : w)) : row)) }
}

/** The winner of the final, or null while it is open. */
export function champion(b: Bracket): number | null {
  const w = b.results[b.results.length - 1][0]
  return w === NONE ? null : w
}

/** "Final", "Semifinal", "Quarterfinal", then "Round N". */
export function roundName(round: number, rounds: number): string {
  const left = rounds - round
  return left === 1 ? 'Final' : left === 2 ? 'Semifinal' : left === 3 ? 'Quarterfinal' : `Round ${round + 1}`
}

/** A fair coin for a match between two entrants who are not the player, fixed by the seed. */
const coin = (seed: number, { round, match }: MatchRef) => rng(seed * 31 + round * 7 + match + 1)() < 0.5

/** Plays every open match that does not involve the player, in order, until the player's own match (or the end) is next. */
export function simulate(b: Bracket, seed: number, player: number): Bracket {
  let cur = b
  for (;;) {
    const ref = nextMatch(cur, (r) => sidesOf(cur, r).includes(player))
    if (!ref) return cur
    const [a, c] = sidesOf(cur, ref)
    cur = report(cur, ref, coin(seed, ref) ? a : c)
  }
}

/** The seven personas that share the Cup with the player, in a seeded order (one sits out). */
export function cupField(seed: number): PersonaId[] {
  return shuffled(PERSONAS.length, seed).slice(0, CUP_SIZE - 1).map((i) => PERSONAS[i].id)
}

/** The player's opponent in a Cup round: Normal in the first and Hard after, with the persona's style and a showdown in the final. */
export function cupOpponent(id: PersonaId, round: number, rounds = roundCount(CUP_SIZE)): Opponent {
  const persona = personaById(id)!
  return {
    id: `cup-${id}-${round}`,
    name: `${persona.name}, ${roundName(round, rounds)}`,
    blurb: `${persona.name} in the Persona Cup.`,
    difficulty: round === 0 ? 'normal' : 'hard',
    personality: persona.personality,
    rules: round === rounds - 1 ? { showdown: true } : undefined,
  }
}

/** The opening position of a Cup match: the player is Solari. */
export const cupGame = (opponent: Opponent, seed: number) => campaignGame(opponent, seed, 'cup')
