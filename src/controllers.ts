import type { PersonalityId } from './engine/data/personality'
import type { PersonaId } from './engine/data/personas'
import type { AiLevel } from './ai/profile'
import { otherCourt } from './engine/rules/board'
import type { Court } from './engine/rules/types'

/** Who plays a court: a person at the screen, a person across an online connection, or the AI at a difficulty. */
export type Controller = 'human' | 'online' | { ai: AiLevel; personality?: PersonalityId; /** A named opponent whose voice speaks in the fight. */ persona?: PersonaId }

export type Controllers = Record<Court, Controller>

/** One person against the AI. */
export function versusAi(human: Court, difficulty: AiLevel, personality?: PersonalityId, persona?: PersonaId): Controllers {
  const foe: Controller = { ai: difficulty, ...(personality && { personality }), ...(persona && { persona }) }
  return { [human]: 'human', [otherCourt(human)]: foe } as Controllers
}

/** One person here against a person online, who plays `foe`'s court. */
export function versusOnline(human: Court): Controllers {
  return { [human]: 'human', [otherCourt(human)]: 'online' } as Controllers
}

/** Two people sharing the device. */
export const HOT_SEAT: Controllers = { solari: 'human', umbral: 'human' }

export const isHuman = (controllers: Controllers, court: Court) => controllers[court] === 'human'

export const isOnline = (controllers: Controllers) => controllers.solari === 'online' || controllers.umbral === 'online'

export const isHotSeat = (controllers: Controllers) => isHuman(controllers, 'solari') && isHuman(controllers, 'umbral')

/** The court a lone human plays; Solari in a hot-seat game, where both are. */
export const humanCourt = (controllers: Controllers): Court => (isHuman(controllers, 'solari') ? 'solari' : 'umbral')
