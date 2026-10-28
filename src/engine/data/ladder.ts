import { PERSONALITIES, type PersonalityId } from './personality'
import { DIFFICULTY_LIST, type Difficulty } from './difficulty'
import { newGame } from '../reducer'
import type { GameState, MatchConfig } from '../rules/types'
import { skirmishConfig } from './setups'

/** Ladder games are always played from the Solari court. */
export const LADDER_COURT = 'solari'

export const START_RATING = 1000
export const MIN_RATING = 400

/** A rated opponent: one persona at one difficulty. */
export interface LadderFoe {
  id: string
  personality: PersonalityId
  difficulty: Difficulty
  name: string
  rating: number
}

const BASE: Record<Difficulty, number> = { easy: 800, normal: 1100, hard: 1400 }
/** Taste shifts the rating a little: the aggressive and guarded styles are harder to play against than the greedy ones. */
const STYLE: Record<PersonalityId, number> = { balanced: 0, rusher: 30, turtle: 20, grabber: -30, caster: -10 }

const PERSONALITY_IDS = Object.keys(PERSONALITIES) as PersonalityId[]
const TITLE: Record<Difficulty, string> = { easy: 'Apprentice', normal: 'Veteran', hard: 'Master' }

/** Every opponent, weakest first. */
export const LADDER_FOES: readonly LadderFoe[] = DIFFICULTY_LIST
  .flatMap((difficulty) => PERSONALITY_IDS.map((personality) => ({
    id: `${difficulty}-${personality}`,
    personality,
    difficulty,
    name: `${TITLE[difficulty]} ${PERSONALITIES[personality].name}`,
    rating: BASE[difficulty] + STYLE[personality],
  })))
  .sort((a, b) => a.rating - b.rating)

export const foeById = (id: string) => LADDER_FOES.find((f) => f.id === id)

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

/** The match for a ladder game: a seeded random army on the classic board. */
export function ladderConfig(seed: number): MatchConfig {
  return { ...skirmishConfig({ mode: 'random', board: 'classic' }, LADDER_COURT, seed), setup: 'ladder' }
}

export const ladderGame = (seed: number): GameState => newGame(ladderConfig(seed))
