import { BONDS } from './bonds'
import { CHAPTERS } from './chapters'
import type { Act } from './types'

export { BONDS, CHAPTERS }
export { CHARACTERS } from './characters'
export { afterVictory, battleCourt, boundCharacters, scenarioOf, storyBattleGame } from './battle'
export type { Act, Bond, Beat, Chapter, Character, CharacterId, CharacterState, Condition, EndingChoice, EndingId, EndingOption, StoryBattle } from './types'

const BY_ID = new Map(CHAPTERS.map((c) => [c.id, c]))

export const chapterById = (id: string) => BY_ID.get(id)

export const actLabel = (act: Act) => (act === 'prologue' ? 'Prologue' : `Act ${act}`)

export const bondById = (id: string) => BONDS.find((b) => b.id === id)
