export type Court = 'solari' | 'umbral'
export type Role =
  | 'footsoldier'
  | 'flier'
  | 'marksman'
  | 'bruiser'
  | 'charger'
  | 'aura'
  | 'leader'

/** x is the column in the design doc's coordinates (0 = Solari home edge, 6 = Umbral), y the row. */
export type Spell =
  | 'blink' | 'mend' | 'turn' | 'swap' | 'conjure' | 'revive' | 'bind'
  | 'hold' | 'hasten' | 'shroud' | 'exchange' | 'mirror' | 'sacrifice'

export interface Pos {
  x: number
  y: number
}

export interface Piece {
  id: string
  court: Court
  role: Role
  hp: number
  maxHp: number
  pos: Pos
  /** Consecutive full rounds spent without moving; drives healing. */
  rest: number
  /** Moved (or attacked) during the current round. */
  moved: boolean
  /** Bound by an enemy spell: cannot move until its court's turn has passed. */
  bound: boolean
  /** Shrouded by its own court's spell: cannot be attacked or targeted until that court's next turn. */
  shrouded?: boolean
}

/** Remaining HP of each fighter after a duel; 0 means dead. */
export interface DuelOutcome {
  attackerHp: number
  defenderHp: number
}

export interface DuelRecord extends DuelOutcome {
  attackerId: string
  defenderId: string
  at: Pos
  luminance: number
}

/** One piece of the Solari opening layout; Umbral mirrors it across the board. */
export interface Placement {
  role: Role
  x: number
  y: number
}

/** Everything that describes how a match is set up and paced; plain data, so it can be saved and shared. */
export interface MatchConfig {
  seed: number
  /** The round at which the Eclipse falls. */
  eclipseRound: number
  /** Once this many rounds have passed the game is settled on beacons held, then total HP. */
  roundLimit: number
  /** Luminance of the centre ring through one day, one entry per round. */
  day: readonly number[]
  beacons: readonly Pos[]
  layout: readonly Placement[]
  /** The Umbral opening layout where it differs from the mirror of `layout` (a drafted army). */
  umbralLayout?: readonly Placement[]
  /** Squares nothing can stand on, move onto or be summoned to; fliers still pass over them. */
  blocked?: readonly Pos[]
  /** Which setup and board variant made this match, for display only. */
  setup?: string
  board?: string
  /** The spells each Leader may cast; the classic seven when absent. */
  loadouts?: Record<Court, readonly Spell[]>
  /** A cast spell returns to its Leader this many rounds later; spells are one-use when absent. */
  recharge?: number
  /** Court passives tied to the light (Solari fliers reach further in full light, Umbral regenerate in the dark); off when absent. */
  passives?: boolean
}

/** A spell cast earlier, waiting to return to its Leader. */
export interface Recharge {
  spell: Spell
  /** The round at which it is back. */
  ready: number
}

export interface GameState {
  config: MatchConfig
  pieces: Piece[]
  captured: Piece[]
  turn: Court
  /** 1-based; one round is a move by each court. */
  round: number
  /** Position in the 8-step luminance day. */
  phase: number
  dir: 1 | -1
  eclipse: boolean
  /** One-use spells each Leader still holds. */
  spells: Record<Court, Spell[]>
  /** Spells that will return to each Leader (only when the match recharges). */
  recharging: Record<Court, Recharge[]>
  /** The last spell each court cast, for Mirror. */
  lastCast: Record<Court, Spell | null>
  /** Rounds for which the light is held where it is. */
  hold: number
  winner: Court | 'draw' | null
  rng: number
  lastDuel: DuelRecord | null
}

export type Action =
  | { type: 'move'; pieceId: string; to: Pos; duel?: DuelOutcome }
  | { type: 'cast'; spell: Spell; pieceId?: string; to?: Pos }
  | { type: 'pass' }
