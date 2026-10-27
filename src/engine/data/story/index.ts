import { CHAPTERS } from './chapters'
import type { Act } from './types'

export { CHAPTERS }
export { CHARACTERS } from './characters'
export type { Act, Beat, Chapter, Character, CharacterId } from './types'

const BY_ID = new Map(CHAPTERS.map((c) => [c.id, c]))

export const chapterById = (id: string) => BY_ID.get(id)

export const actLabel = (act: Act) => (act === 'prologue' ? 'Prologue' : `Act ${act}`)
