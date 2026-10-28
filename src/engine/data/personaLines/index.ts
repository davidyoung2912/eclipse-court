import type { PersonaId } from '../personas'
import { beaLines } from './bea'
import { cassiaLines } from './cassia'
import { digbyLines } from './digby'
import { lowenLines } from './lowen'
import { mudgeLines } from './mudge'
import { pymLines } from './pym'
import { quillLines } from './quill'
import { regentLines } from './regent'
import type { LineCategory, PersonaLines } from './types'

export * from './types'

/** The finished line banks, one per persona. */
export const LINE_BANKS: Record<PersonaId, PersonaLines> = {
  cassia: cassiaLines,
  pym: pymLines,
  bea: beaLines,
  mudge: mudgeLines,
  lowen: lowenLines,
  digby: digbyLines,
  quill: quillLines,
  regent: regentLines,
}

/** Every line a persona can say in a category. */
export const personaLines = (id: PersonaId, category: LineCategory): readonly string[] => LINE_BANKS[id][category]
