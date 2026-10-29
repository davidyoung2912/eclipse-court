import { ARC_FIGHTS, ARC_UNLOCK_WINS, arcOf, SHARDS_ARC_DONE, SHARDS_ARC_FIGHT, SHARDS_GRUDGE } from './engine/data/personaArcs'
import { COSMETICS } from './engine/data/cosmetics'
import { PERSONAS, personaById, type PersonaId } from './engine/data/personas'
import { award } from './shop'
import type { Head } from './personaRecord'

/** How far the player is through each persona's arc, and which personas they owe a grudge match. Local only. */
const KEY = 'eclipse-court:persona-arcs'

type Listener = () => void
const listeners = new Set<Listener>()

export interface ArcState {
  /** Arc fights won in order, 0 to `ARC_FIGHTS`; absent is 0. */
  steps: Readonly<Partial<Record<PersonaId, number>>>
  /** Personas the player last lost to and has not beaten since. */
  grudges: readonly PersonaId[]
}

const EMPTY: ArcState = { steps: {}, grudges: [] }

export function parseArcs(raw: unknown): ArcState {
  const o = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const steps: Partial<Record<PersonaId, number>> = {}
  if (o.steps && typeof o.steps === 'object')
    for (const p of PERSONAS) {
      const n = (o.steps as Record<string, unknown>)[p.id]
      if (typeof n === 'number' && Number.isInteger(n) && n > 0) steps[p.id] = Math.min(n, ARC_FIGHTS)
    }
  const grudges = Array.isArray(o.grudges) ? PERSONAS.map((p) => p.id).filter((id) => (o.grudges as unknown[]).includes(id)) : []
  return { steps, grudges }
}

function load(): ArcState {
  try {
    return parseArcs(JSON.parse(localStorage.getItem(KEY) ?? 'null'))
  } catch {
    return EMPTY
  }
}

/** Held in memory too, so a device without storage still remembers for the visit. */
let state = load()

function commit(next: ArcState) {
  state = next
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    // Without storage the arcs simply start over next visit.
  }
  listeners.forEach((l) => l())
}

export const arcSnapshot = () => state
export function subscribeArcs(l: Listener) {
  listeners.add(l)
  return () => { listeners.delete(l) }
}

/** An arc opens once its persona has been beaten. */
export const arcOpen = (head: Head | undefined) => !!head && head.w >= ARC_UNLOCK_WINS

export const stepsOf = (id: PersonaId, s: ArcState = state) => s.steps[id] ?? 0
export const arcDone = (id: PersonaId, s: ArcState = state) => stepsOf(id, s) >= ARC_FIGHTS

/** The player lost to a persona: they owe a grudge match until they win. */
export function markGrudge(id: PersonaId) {
  if (!state.grudges.includes(id)) commit({ ...state, grudges: [...state.grudges, id] })
}

export interface ArcOutcome {
  shards: number
  lines: string[]
}

const NONE: ArcOutcome = { shards: 0, lines: [] }

/** A win over a persona clears a grudge and pays for it; the caller adds the Shards. */
export function settleGrudge(id: PersonaId): ArcOutcome {
  if (!state.grudges.includes(id)) return NONE
  commit({ ...state, grudges: state.grudges.filter((g) => g !== id) })
  return { shards: SHARDS_GRUDGE, lines: [`Grudge settled with ${personaById(id)?.name ?? 'them'}: +${SHARDS_GRUDGE} Shards.`] }
}

/**
 * Notes a win in an arc fight (0-based `step`). Only the next unwon fight counts, so a replay pays nothing;
 * the last one adds the arc's prize. The caller adds the Shards.
 */
export function recordArcWin(id: PersonaId, step: number): ArcOutcome {
  if (step !== stepsOf(id)) return NONE
  const arc = arcOf(id)
  commit({ ...state, steps: { ...state.steps, [id]: step + 1 } })
  const lines = [`${arc.title}: fight ${step + 1} of ${ARC_FIGHTS} won. +${SHARDS_ARC_FIGHT} Shards.`]
  let shards = SHARDS_ARC_FIGHT
  if (step + 1 === ARC_FIGHTS) {
    shards += SHARDS_ARC_DONE
    lines.push(`${arc.title} is complete: +${SHARDS_ARC_DONE} Shards.`)
    const prize = COSMETICS.find((c) => c.kind === 'capture' && c.id === arc.prize)
    if (prize && award(prize)) lines.push(`Earned the ${prize.name} capture effect.`)
  }
  return { shards, lines }
}
