import { allSquares, isBeacon, isBlocked, mirrorOf, samePos, sizeOf } from './board'
import type { CellEffect, GameState, Mayhem, Piece } from './types'

export const MAYHEM_INFO: Record<Mayhem, { name: string; text: string; every: number }> = {
  spawns: { name: 'Cell spawns', text: 'Every 3 rounds a pair of mirrored cells appears on empty squares.', every: 3 },
  thefts: { name: 'Spell thefts', text: 'Every 5 rounds a spell the other Leader lacks leaps across to the thief.', every: 5 },
  swaps: { name: 'Piece swaps', text: 'Every 4 rounds two pieces of the same role, one from each court, trade places.', every: 4 },
}

export const MAYHEMS = Object.keys(MAYHEM_INFO) as Mayhem[]

/** Cells that can spawn; Silence and Invincibility would too easily decide a game. */
const SPAWNED: readonly CellEffect[] = ['might', 'ward', 'recovery', 'hazard']

const mix = (a: number, b: number) => {
  let h = Math.imul(a ^ 0x7f4a7c15, 0x85ebca6b) ^ Math.imul(b + 1, 0xc2b2ae35)
  h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d)
  return (h ^ (h >>> 12)) >>> 0
}

/** A seeded pick from `list`, varied by `salt`; a pure function of the seed and round so replays agree. */
const pick = <T>(state: GameState, salt: number, list: readonly T[]): T => list[mix(mix(state.config.seed >>> 0, state.round), salt) % list.length]

const spawn = (state: GameState): GameState | null => {
  const size = sizeOf(state.config)
  const { cells = [] } = state.config
  const free = (p: { x: number; y: number }) =>
    !isBlocked(state.config, p) && !isBeacon(p, state.config.beacons) && !cells.some((c) => samePos(c.pos, p)) && !state.pieces.some((q) => samePos(q.pos, p))
  const spots = allSquares(size).filter((p) => p.x < (size - 1) / 2 && free(p) && free(mirrorOf(p, size)))
  if (!spots.length) return null
  const at = pick(state, 1, spots)
  const effect = pick(state, 2, SPAWNED)
  return { ...state, config: { ...state.config, cells: [...cells, { pos: at, effect }, { pos: mirrorOf(at, size), effect }] } }
}

const steal = (state: GameState): GameState | null => {
  const victims = (['solari', 'umbral'] as const).filter((c) => {
    const thief = c === 'solari' ? 'umbral' : 'solari'
    return state.spells[c].some((s) => !state.spells[thief].includes(s))
  })
  if (!victims.length) return null
  const from = pick(state, 3, victims)
  const to = from === 'solari' ? 'umbral' : 'solari'
  const spell = pick(state, 4, state.spells[from].filter((s) => !state.spells[to].includes(s)))
  return { ...state, spells: { ...state.spells, [from]: state.spells[from].filter((s) => s !== spell), [to]: [...state.spells[to], spell] } }
}

const swap = (state: GameState): GameState | null => {
  const movable = (p: Piece) => p.role !== 'leader' && !isBeacon(p.pos, state.config.beacons)
  const pairs: [Piece, Piece][] = []
  for (const a of state.pieces) {
    if (a.court !== 'solari' || !movable(a)) continue
    for (const b of state.pieces) if (b.court === 'umbral' && b.role === a.role && movable(b)) pairs.push([a, b])
  }
  if (!pairs.length) return null
  const [a, b] = pick(state, 5, pairs)
  return { ...state, pieces: state.pieces.map((p) => (p.id === a.id ? { ...p, pos: b.pos } : p.id === b.id ? { ...p, pos: a.pos } : p)) }
}

const MUTATORS: Record<Mayhem, (state: GameState) => GameState | null> = { spawns: spawn, thefts: steal, swaps: swap }

/** The chaos due at the start of `state.round`, applied after a round ends; `mayhemNote` says what happened. */
export function applyMayhem(state: GameState): GameState {
  const active = state.config.mayhem
  if (!active?.length || state.round < 2) return state
  let next: GameState = { ...state, mayhemNote: undefined }
  const notes: string[] = []
  for (const kind of MAYHEMS) {
    if (!active.includes(kind) || (state.round - 1) % MAYHEM_INFO[kind].every !== 0) continue
    const done = MUTATORS[kind](next)
    if (done) {
      next = done
      notes.push(MAYHEM_INFO[kind].name)
    }
  }
  return notes.length ? { ...next, mayhemNote: `Mayhem: ${notes.join(', ')}` } : next
}
