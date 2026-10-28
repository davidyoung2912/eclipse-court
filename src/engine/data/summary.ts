import type { MatchMode } from '../rules/types'
import type { Difficulty } from './difficulty'

/** What happened in one finished game, from the human's side. */
export interface Summary {
  won: boolean
  draw: boolean
  /** Own pieces lost and enemy pieces taken. */
  lost: number
  taken: number
  /** Rounds played. */
  turns: number
  swift: boolean
  spellsCast: number
  difficulty: Difficulty
  campaignIndex: number | null
  daily: boolean
  /** The game used Classic rules (no court passives, three spells); achievements that lean on the full rules skip it. */
  classic?: boolean
  /** The game was the day's puzzle, solved. */
  dailyPuzzle?: boolean
  /** How the match was set up, for achievements tied to a board or a rule. */
  size?: number
  mode?: MatchMode
  cells?: boolean
  events?: boolean
  showdown?: boolean
  clock?: boolean
  growth?: boolean
  promotion?: boolean
  /** A finished post-game review of the player's side. */
  review?: { moves: number; accuracy: number; mistakes: number; won: boolean }
}
