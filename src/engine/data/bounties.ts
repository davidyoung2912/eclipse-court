import { rngNext } from '../rng'
import type { Summary } from './summary'

/** A side goal for a skirmish: met by how a game went, and paid in Shards on top of the game's own. */
export interface Bounty {
  id: string
  text: string
  shards: number
  met: (s: Summary) => boolean
}

export const BOUNTIES: readonly Bounty[] = [
  { id: 'flawless', text: 'Win without losing a piece', shards: 8, met: (s) => s.won && s.lost === 0 },
  { id: 'frugal', text: 'Win losing no more than two pieces', shards: 5, met: (s) => s.won && s.lost <= 2 },
  { id: 'swift', text: 'Win before the Eclipse', shards: 6, met: (s) => s.won && s.swift },
  { id: 'caster', text: 'Win after casting at least three spells', shards: 5, met: (s) => s.won && s.spellsCast >= 3 },
  { id: 'unspelled', text: 'Win without casting a spell', shards: 7, met: (s) => s.won && s.spellsCast === 0 },
  { id: 'hunter', text: 'Take at least five enemy pieces', shards: 5, met: (s) => s.taken >= 5 },
  { id: 'steady', text: 'Draw or win a game', shards: 3, met: (s) => s.won || s.draw },
  { id: 'quick', text: 'Win in ten rounds or fewer', shards: 8, met: (s) => s.won && s.turns <= 10 },
]

export const BOUNTIES_PER_DAY = 3

/** The day's bounties: the same three for everyone, drawn from the day's seed without repeats. */
export function bountiesFor(day: number): Bounty[] {
  let state = (day * 17 + 3) >>> 0
  const pool = [...BOUNTIES]
  const out: Bounty[] = []
  while (out.length < BOUNTIES_PER_DAY) {
    const [v, next] = rngNext(state)
    state = next
    out.push(pool.splice(Math.floor(v * pool.length), 1)[0])
  }
  return out
}
