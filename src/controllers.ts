import type { PersonalityId } from './ai/personality'
import type { Difficulty } from './ai/profile'
import { otherCourt } from './engine/rules/board'
import type { Court } from './engine/rules/types'

/** Who plays a court: a person at the screen, or the AI at a difficulty. */
export type Controller = 'human' | { ai: Difficulty; personality?: PersonalityId }

export type Controllers = Record<Court, Controller>

/** One person against the AI. */
export function versusAi(human: Court, difficulty: Difficulty, personality?: PersonalityId): Controllers {
  const foe: Controller = personality ? { ai: difficulty, personality } : { ai: difficulty }
  return { [human]: 'human', [otherCourt(human)]: foe } as Controllers
}

/** Two people sharing the device. */
export const HOT_SEAT: Controllers = { solari: 'human', umbral: 'human' }

export const isHuman = (controllers: Controllers, court: Court) => controllers[court] === 'human'

export const isHotSeat = (controllers: Controllers) => isHuman(controllers, 'solari') && isHuman(controllers, 'umbral')

/** The court a lone human plays; Solari in a hot-seat game, where both are. */
export const humanCourt = (controllers: Controllers): Court => (isHuman(controllers, 'solari') ? 'solari' : 'umbral')
