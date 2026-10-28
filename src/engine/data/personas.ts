import { PERSONALITIES, type Personality, type PersonalityId } from './personality'

export type PersonaId = 'cassia' | 'pym' | 'bea' | 'mudge' | 'lowen' | 'digby' | 'quill' | 'regent'

/** Where a persona's loyalties lie: a court, the third houses of the Marches, or the stalled Hour itself. Flavour only: any persona can play either court. */
export type House = 'solari' | 'umbral' | 'marches' | 'hour'

/** The most characters a persona's short name may have, so it fits a bubble, a button or a ladder row. */
export const NAME_MAX = 12
/** The most characters a persona's tag may have. */
export const TAG_MAX = 20

/** The weights a persona nudges its play style by; the rest stay as the style has them. */
export type StyleTweak = Partial<Pick<Personality, 'attack' | 'guard' | 'beacon' | 'spells' | 'bait' | 'screen'>>

/** A named opponent: a voice and a face on top of one of the AI's play styles. Skill still comes from the difficulty. */
export interface Persona {
  id: PersonaId
  /** The short name shown on screen. */
  name: string
  /** A few words under the name. */
  tag: string
  /** The long form, for a detail card only. */
  fullName: string
  title: string
  house: House
  /** The play style it is built on. */
  personality: PersonalityId
  tweak?: StyleTweak
}

export const PERSONAS: readonly Persona[] = [
  { id: 'cassia', name: 'Cassia', tag: 'The Dawnbreaker', fullName: 'Dame Cassia Lark', title: 'the Dawnbreaker', house: 'solari', personality: 'rusher' },
  { id: 'pym', name: 'Pym', tag: 'Archivist', fullName: 'Archivist Thessaly Pym', title: 'Keeper of the Meridian Records', house: 'solari', personality: 'caster' },
  { id: 'bea', name: 'Bea', tag: 'Door Keeper', fullName: 'Ser Beatrix Holloway', title: "Keeper of the Leader's Door", house: 'solari', personality: 'guardian' },
  { id: 'mudge', name: 'Mudge', tag: 'Mire Warden', fullName: 'Mudge', title: 'Warden of the Mire Debt', house: 'umbral', personality: 'turtle' },
  { id: 'lowen', name: 'Lowen', tag: 'Nine-Lives', fullName: 'Lowen Harrow', title: '"Nine-Lives", Night Raven', house: 'umbral', personality: 'baiter' },
  // A swarmer: the Ghouls are cheerfully expendable, so it guards less than a plain Rusher.
  { id: 'digby', name: 'Digby', tag: 'Volunteer!', fullName: 'Digby Gray', title: 'Gloom Ghoul (Volunteer!)', house: 'umbral', personality: 'rusher', tweak: { guard: 0.4 } },
  { id: 'quill', name: 'Quill', tag: 'Iron Factor', fullName: 'Quill Ferrant', title: 'Factor of the Iron Court', house: 'marches', personality: 'grabber' },
  { id: 'regent', name: 'The Regent', tag: 'Pale Echo', fullName: 'The Echo of the Pale Regent', title: 'a failed claimant to the Hour', house: 'hour', personality: 'balanced' },
]

export const personaById = (id: string): Persona | undefined => PERSONAS.find((p) => p.id === id)

/** The weights the AI plays a persona with: its style, nudged by the persona's own tweak. */
export function personaStyle(persona: Persona): Personality {
  return { ...PERSONALITIES[persona.personality], ...persona.tweak }
}
