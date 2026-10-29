import type { Challenge as ChallengeCode } from './engine/challenge'
import type { Ghost as GhostResult } from './engine/ghost'
import type { Pack } from './engine/data/pack'
import type { Session } from './net/session'
import type { Difficulty } from './ai/profile'
import type { SetupChoice } from './engine/data/setups'
import type { Puzzle } from './engine/data/puzzles'
import type { GameRecord } from './engine/log'
import type { Court } from './engine/rules/types'
import type { PersonaId } from './engine/data/personas'
import type { PersonaChoice } from './personaMenu'
import type { EndingId } from './engine/data/story'
import { parseShared, type Shared } from './share'

/** Every screen the app can show, with what each one carries. */
export type Screen =
  | { name: 'menu' }
  | { name: 'battle' }
  | { name: 'skirmish'; /** Opened to host an online game. */ online?: boolean; /** Opened to start a game played by link. */ mail?: boolean }
  | { name: 'campaign' }
  | { name: 'story' }
  | { name: 'chapter'; id: string }
  /** The scene after a chapter's battle. */
  | { name: 'aftermath'; id: string; won: boolean }
  /** A bond scene between two characters. */
  | { name: 'bond'; id: string }
  /** The choice that ends the story, and the epilogue read once it is made. */
  | { name: 'ending'; id: string }
  | { name: 'epilogue'; id: string; ending: EndingId }
  | { name: 'afterword'; id: string; ending: EndingId }
  | { name: 'daily' }
  | { name: 'weekly' }
  /** A friend's daily or weekly result, with its match to play. */
  | { name: 'ghost'; ghost: GhostResult }
  | { name: 'ladder' }
  | { name: 'arcs' }
  | { name: 'tournament' }
  | { name: 'gauntlet' }
  | { name: 'tutorial' }
  | { name: 'stats' }
  | { name: 'goals' }
  | { name: 'season' }
  | { name: 'highlights' }
  | { name: 'puzzles' }
  | { name: 'endless' }
  | { name: 'practice' }
  | { name: 'settings' }
  | { name: 'collection' }
  | { name: 'replay'; record: GameRecord; /** Where Back goes; the stats page unless the replay came from a link. */ from?: 'menu' | 'mail' | 'highlights'; /** Opened from a watch link: a spectator's view, which cannot take over the game. */ watch?: boolean; /** The record is the last game the player finished, so its review can earn achievements. */ own?: boolean }
  | { name: 'challenge'; challenge: ChallengeCode }
  | { name: 'paste' }
  /** Games played by link: the list, with a move that arrived by link waiting to be accepted. */
  | { name: 'mail'; incoming?: GameRecord }
  /** The link to send for a game played by link. */
  | { name: 'mailsend'; id: string }
  | { name: 'editor' }
  | { name: 'pack'; pack: Pack }
  /** Online play: the menu, the skirmish setup that hosts, and the lobby (a host brings its match, a guest may bring an offer code). */
  | { name: 'online' }
  | { name: 'lobby'; challenge?: ChallengeCode; offer?: string; /** A dropped game to pick up again, with the game so far. */ resume?: { session: Session; record: GameRecord } }
  | {
    name: 'game'; human: Court; difficulty: Difficulty; record: GameRecord; campaignIndex: number | null
    /** Two people share the device; `human` and `difficulty` are then unused. */
    hotSeat?: boolean
    /** The other player is across an online connection; `human` is your court. */
    online?: Session
    /** Set when the game is a puzzle: its index, whether it is the day's, and the turns allowed. */
    puzzle?: { index: number; daily: boolean; /** An Endless puzzle: the puzzle itself, and the rating it was served against. */ endless?: { puzzle: Puzzle; number: number; rating: number }; /** A Puzzle Rush run: its order and the puzzles solved so far. */ rush?: { order: number[]; score: number } }
    /** Set in a best-of-three: the opponent and the games won and lost so far. */
    series?: { wins: number; losses: number }
    /** A fight of the gauntlet run; the run itself is kept apart from the saved game. */
    gauntlet?: boolean
    /** A scenario of the campaign's second tab: its index. */
    scenario?: number
    /** A co-op scenario of the campaign's third tab: its index. Two people share Solari. */
    coop?: number
    /** A chapter of the story whose battle this is; story games are not resumable and touch no campaign progress. */
    story?: string
    /** A ranked ladder game: the id of the opponent; not resumable. */
    ladder?: string
    /** A named opponent whose voice speaks in the fight. */
    persona?: PersonaId
    /** A fight of a persona's arc (`step` from 0); not resumable. */
    arc?: { persona: PersonaId; step: number }
    /** A match of the tournament in progress (hot-seat or the Persona Cup); the bracket is kept apart from the saved game. */
    tourney?: boolean
    /** A puzzle of a kept pack, by pack id and index; played as an editor board, with no record kept but the pack's own progress. */
    pack?: { id: string; index: number }
    /** A try-out from the board editor: nothing is recorded and Back returns to the editor. */
    editor?: boolean
    /** A try-out from a position in a reviewed game: nothing is recorded and Back returns to the menu. */
    tryout?: boolean
    /** A game played by link: its id in the saved list. The other court is not here, and each move ends the visit. */
    mail?: string
    /** The match of a friend's ghost result, played unscored; the ghost it is measured against. */
    ghost?: GhostResult
    /** A skirmish started from the setup screen: what it takes to deal the same match again with a new seed. */
    again?: { setup: SetupChoice; voice: PersonaChoice }
  }

/** The screen a shared link or code opens. */
export const sharedScreen = (shared: Shared): Screen =>
  shared.kind === 'challenge' ? { name: 'challenge', challenge: shared.challenge }
    : shared.kind === 'ghost' ? { name: 'ghost', ghost: shared.ghost }
    : shared.kind === 'pack' ? { name: 'pack', pack: shared.pack }
    : shared.kind === 'turn' ? { name: 'mail', incoming: shared.record }
    : shared.kind === 'watch' ? { name: 'replay', record: shared.record, from: 'menu', watch: true }
    : { name: 'replay', record: shared.record, from: 'menu' }

/** Reads a `#c=`, `#r=` or `#g=` link out of the address, then removes it so a reload does not reopen it. */
export function takeLinkScreen(): Screen | null {
  const { hash, pathname, search } = window.location
  if (!/^#[crgjp]=/.test(hash)) return null
  history.replaceState(null, '', pathname + search)
  if (hash.startsWith('#j=')) return { name: 'lobby', offer: hash.slice(3) }
  const shared = parseShared(hash)
  return shared && sharedScreen(shared)
}
