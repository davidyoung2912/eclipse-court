import type { PersonaId } from '../personas'
import { beaLines } from './bea'
import { cassiaLines } from './cassia'
import { mudgeLines } from './mudge'
import { pymLines } from './pym'
import type { LineCategory, PersonaLines } from './types'

export * from './types'

/** The finished line banks. Personas still waiting on theirs are left out. */
export const LINE_BANKS: Partial<Record<PersonaId, PersonaLines>> = {
  cassia: cassiaLines,
  pym: pymLines,
  bea: beaLines,
  mudge: mudgeLines,
}

/** Every line a persona can say in a category; empty while its bank is unwritten. */
export const personaLines = (id: PersonaId, category: LineCategory): readonly string[] => LINE_BANKS[id]?.[category] ?? []
