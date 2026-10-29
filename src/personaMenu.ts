import { dayIndex } from './engine/data/setups'
import { personaLines, type LineCategory } from './engine/data/personaLines'
import { PERSONAS, personaById, type Persona, type PersonaId } from './engine/data/personas'
import type { PersonalityId } from './engine/data/personality'
import type { Tally } from './ladder'
import { personaRecordSnapshot, variantFor } from './personaRecord'

/** What the skirmish picker can hold: no named opponent, a random one, or a particular one. */
export type PersonaChoice = 'none' | 'random' | PersonaId

export const PERSONA_CHOICES: readonly PersonaChoice[] = ['none', 'random', ...PERSONAS.map((p) => p.id)]

/** A small stable hash, so a line can be picked from a key without any stored state. */
function hash(key: string): number {
  let h = 2166136261
  for (let i = 0; i < key.length; i++) h = Math.imul(h ^ key.charCodeAt(i), 16777619)
  return h >>> 0
}

/** A persona's line for a category, picked by `key`: the same key always gives the same line. */
export function menuLine(id: PersonaId, category: LineCategory, key: string): string {
  const bank = personaLines(id, category)
  return bank[hash(`${id}:${category}:${key}`) % bank.length]
}

/** The persona a choice stands for; `seed` settles a random one. */
export function resolvePersona(choice: PersonaChoice, seed: number): PersonaId | undefined {
  if (choice === 'none') return undefined
  if (choice === 'random') return PERSONAS[hash(String(seed)) % PERSONAS.length].id
  return choice
}

/** The persona who greets the player on the main menu today; a different one each day. */
export const personaOfTheDay = (seed: number): Persona => PERSONAS[((dayIndex(seed) % PERSONAS.length) + PERSONAS.length) % PERSONAS.length]

/** The persona who lends a voice to a ladder foe of this play style, if any persona plays it. */
export const ladderVoice = (personality: PersonalityId): PersonaId | undefined => PERSONAS.find((p) => p.personality === personality)?.id

/** A ladder foe's line: a rematch line once the two have met, a briefing line before that. */
export function rivalLine(id: PersonaId, foeId: string, tally: Tally | undefined): string {
  const games = tally ? tally.w + tally.d + tally.l : 0
  return menuLine(id, games > 0 ? 'rematch' : 'briefing', `${foeId}:${games}`)
}

/** A greeting or briefing that follows the head-to-head record: first meeting, a grudge, who leads. */
export const recordLine = (id: PersonaId, base: 'greet' | 'briefing', key: string): string =>
  menuLine(id, variantFor(personaRecordSnapshot()[id], base), key)

/** The line a persona says at the end of a fight, from the player's side of the result. */
export function farewellLine(id: PersonaId, winner: 'solari' | 'umbral' | 'draw' | null, human: 'solari' | 'umbral', key: string): string | null {
  if (!winner) return null
  return menuLine(id, winner === 'draw' ? 'draw' : winner === human ? 'lose' : 'win', key)
}

export const personaOf = (choice: string | undefined): Persona | undefined => (choice ? personaById(choice) : undefined)
