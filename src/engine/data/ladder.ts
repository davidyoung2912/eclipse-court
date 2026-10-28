import { PERSONALITIES, type PersonalityId } from './personality'
import type { AiLevel, Difficulty } from './difficulty'
import { newGame } from '../reducer'
import type { GameState, MatchConfig } from '../rules/types'
import { skirmishConfig } from './setups'
import { BOSSES, type Boss } from './bosses'

/** Ladder games are always played from the Solari court. */
export const LADDER_COURT = 'solari'

export const START_RATING = 800
export const MIN_RATING = 400

/** A rated opponent: one persona at one rung of strength. */
export interface LadderFoe {
  id: string
  personality: PersonalityId
  /** How well the AI plays. */
  level: AiLevel
  /** The difficulty this counts as for records and rewards. */
  difficulty: Difficulty
  name: string
  rating: number
  /** The signature rule, for a boss. */
  boss?: Boss
}

/** The six rungs, one per rank: its id prefix, title, the AI strength it plays at and the middle of its rank's rating band. */
const RUNGS: readonly { id: string; title: string; level: AiLevel; difficulty: Difficulty; base: number }[] = [
  { id: 'easy', title: 'Apprentice', level: 'easy', difficulty: 'easy', base: 800 },
  { id: 'journeyman', title: 'Journeyman', level: 'journeyman', difficulty: 'normal', base: 975 },
  { id: 'normal', title: 'Veteran', level: 'normal', difficulty: 'normal', base: 1125 },
  { id: 'expert', title: 'Expert', level: 'expert', difficulty: 'hard', base: 1275 },
  { id: 'hard', title: 'Master', level: 'hard', difficulty: 'hard', base: 1425 },
  { id: 'grandmaster', title: 'Grandmaster', level: 'grandmaster', difficulty: 'hard', base: 1575 },
]
/** Taste shifts the rating a little: the aggressive and guarded styles are harder to play against than the greedy ones. */
const STYLE: Record<PersonalityId, number> = { balanced: 0, rusher: 30, turtle: 20, grabber: -30, caster: -10, baiter: 25, guardian: 15 }

const PERSONALITY_IDS = Object.keys(PERSONALITIES) as PersonalityId[]

/** Every opponent, weakest first: seven in each rank. */
export const LADDER_FOES: readonly LadderFoe[] = RUNGS
  .flatMap((rung) => PERSONALITY_IDS.map((personality) => ({
    id: `${rung.id}-${personality}`,
    personality,
    level: rung.level,
    difficulty: rung.difficulty,
    name: `${rung.title} ${PERSONALITIES[personality].name}`,
    rating: rung.base + STYLE[personality],
  })))
  .sort((a, b) => a.rating - b.rating)

/** The bosses, beyond the Grandmasters, as ladder foes. */
export const LADDER_BOSSES: readonly LadderFoe[] = BOSSES.map((boss) => ({
  id: boss.id, personality: boss.personality, level: boss.level, difficulty: boss.difficulty, name: boss.name, rating: boss.rating, boss,
}))

export const foeById = (id: string) => LADDER_FOES.find((f) => f.id === id) ?? LADDER_BOSSES.find((f) => f.id === id)

/** Rank titles, from the rating each begins at. */
export const RANKS: readonly { from: number; title: string }[] = [
  { from: 0, title: 'Squire' },
  { from: 900, title: 'Knight' },
  { from: 1050, title: 'Captain' },
  { from: 1200, title: 'Marshal' },
  { from: 1350, title: 'Warden' },
  { from: 1500, title: 'Eclipse Champion' },
]

export const rankOf = (rating: number) => [...RANKS].reverse().find((r) => rating >= r.from)!.title

/** The chance (0..1) that the player scores against a foe, by the Elo curve. */
export const expectedScore = (rating: number, foe: number) => 1 / (1 + 10 ** ((foe - rating) / 400))

/** Rating moves faster while it is still settling. */
export const kFactor = (games: number) => (games < 10 ? 40 : 24)

/** The new rating after a game: `score` is 1 for a win, 0.5 for a draw, 0 for a loss. */
export function nextRating(rating: number, foe: number, score: 0 | 0.5 | 1, games: number): number {
  const next = Math.round(rating + kFactor(games) * (score - expectedScore(rating, foe)))
  return Math.max(MIN_RATING, next)
}

/** The foe whose rating is closest to the player's, the weaker one on a tie; staying a little below keeps matches winnable. */
export function suggestFoe(rating: number): LadderFoe {
  return LADDER_FOES.reduce((best, f) => {
    const d = Math.abs(f.rating - rating)
    const bd = Math.abs(best.rating - rating)
    return d < bd ? f : best
  })
}

/** The match for a ladder game: a seeded random army on the classic board, with a boss's signature rule added. */
export function ladderConfig(seed: number, foe?: LadderFoe): MatchConfig {
  return { ...skirmishConfig({ mode: 'random', board: 'classic' }, LADDER_COURT, seed), setup: 'ladder', ...foe?.boss?.rules }
}

export const ladderGame = (seed: number, foe?: LadderFoe): GameState => newGame(ladderConfig(seed, foe))
