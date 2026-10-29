import type { Controllers } from './controllers'
import type { Session } from './net/session'
import type { GameRecord } from './engine/log'
import type { GameState, Pos } from './engine/rules/types'
import type { PuzzleHelp } from './hooks/useHint'

/** What the game screen is given: who plays, the game, where it comes from and what to do when it ends. */
export interface GameProps {
  /** Who plays each court: a person at the screen, or the AI. Two people make a hot-seat game. */
  controllers: Controllers
  /** What a named opponent says before the first move, when the menu has a better line than the default briefing. */
  opening?: string
  /** The game to play: a fresh one has no actions, a resumed one carries what has been played. */
  record: GameRecord
  /** The connection to the other player, for an online game. */
  session?: Session
  /** A puzzle: you win by winning within this many of your own turns. */
  puzzleLimit?: number
  /** Where the game comes from, for the line above the board and the guidance cards that suit it. */
  context?: { label: string; kind: 'skirmish' | 'campaign' | 'scenario' | 'story' | 'daily' | 'gauntlet' | 'series'; /** A rated game: no take-backs. */ scored?: boolean; /** Two people share the Solari court and alternate by round. */ coop?: boolean; /** Which scored mode this is, for its guidance card. */ flavour?: 'weekly' | 'ladder' }
  /** The player's first campaign battle: a line of coaching sits above the board's cards. */
  coach?: boolean
  /** The player has never won a game: a win now is their first, and gets confetti. */
  firstWin?: boolean
  /** A puzzle's name and description, shown over the board when it starts and boiled down to its first sentence above it. */
  puzzle?: { name: string; text: string; /** A Puzzle Rush run: a failed puzzle ends it, so there is no retry. */ rush?: boolean }
  /** A puzzle's own hints and solution; the Hint button walks through them in place of the AI's advice. */
  puzzleHelp?: PuzzleHelp
  /** Called after every action with the game so far, or null once it has ended. */
  /** Play by link: the other court is not here, so no AI answers; called with the game once the person has moved and the turn has passed on. */
  mail?: (record: GameRecord) => void
  onSave: (record: GameRecord | null) => void
  /** The setup can be played again: the result offers Play Again (and Swap Sides against the AI), which exit with `again` set. */
  canPlayAgain?: boolean
  /** After a loss to the named opponent the result offers a Grudge Match: the same fight again, which pays Shards if won. */
  canGrudge?: boolean
  /** Play Again may swap courts too; false where the player's court is fixed. */
  canSwap?: boolean
  onExit: (winner: GameState['winner'], record: GameRecord, review?: boolean, again?: 'same' | 'swap' | 'grudge') => void
  /** Once, when the game is decided and the result opens: settles the payouts and returns the lines to show; absent when nothing is paid here. */
  onEnded?: (winner: GameState['winner'], record: GameRecord) => string[]
  /** Online, when the connection drops mid-game: go and make a new one, handing over the game so far. */
  onReconnect?: (record: GameRecord) => void
  /** Online, once both players asked for a rematch and the next match has begun: swap to it. */
  onRematch?: (view: ReturnType<Session['view']>) => void
}

/** A capture waiting to be settled; `byAi` means the human is the defender. */
export interface Pending {
  pieceId: string
  to: Pos
  confirmed: boolean
  byAi: boolean
}

export type DuelMode = 'live' | 'auto'
