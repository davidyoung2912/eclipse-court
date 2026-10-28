import type { Court, MatchConfig } from '../rules/types'
import type { AiLevel, Difficulty } from './difficulty'
import type { PersonalityId } from './personality'
import { boardById } from './boards'

/** A named foe with a signature rule that no ordinary opponent plays by; the rule is carried out by the match settings alone. */
export interface Boss {
  id: string
  name: string
  personality: PersonalityId
  level: AiLevel
  difficulty: Difficulty
  /** The ladder rating it counts as. */
  rating: number
  /** The signature rule in a sentence, shown before the fight. */
  rule: string
  /** Settings the boss adds to the match; the court it plays is Umbral. */
  rules: Partial<MatchConfig>
}

/** The court every boss plays. */
export const BOSS_COURT: Court = 'umbral'

/** The rating a player must have reached at some point to challenge the bosses. */
export const BOSS_UNLOCK = 1500

const crossroads = boardById('crossroads')

/** Three bosses beyond the Grandmasters, each with a rule of its own. */
export const BOSSES: readonly Boss[] = [
  {
    id: 'boss-veil-sister',
    name: 'The Veil Sister',
    personality: 'caster',
    level: 'grandmaster',
    difficulty: 'hard',
    rating: 1650,
    rule: 'Her first spell each turn is free: she casts, then still moves.',
    rules: { freeCast: BOSS_COURT },
  },
  {
    id: 'boss-ash-tyrant',
    name: 'The Ash Tyrant',
    personality: 'rusher',
    level: 'grandmaster',
    difficulty: 'hard',
    rating: 1725,
    rule: 'The Crossroads board starts with hazard cells around the centre, and day events strike.',
    rules: { board: crossroads.id, beacons: crossroads.beacons, blocked: crossroads.blocked, cells: crossroads.cells, events: true },
  },
  {
    id: 'boss-hollow-king',
    name: 'The Hollow King',
    personality: 'turtle',
    level: 'grandmaster',
    difficulty: 'hard',
    rating: 1800,
    rule: 'Every piece has 2 extra HP, the Eclipse falls at round 20 and the outer squares turn deadly.',
    rules: { edge: { court: BOSS_COURT, hp: 2 }, eclipseRound: 20, showdown: true },
  },
]
