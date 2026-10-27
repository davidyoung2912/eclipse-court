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

/** A gift an Elite piece picks after four duel wins. */
export type Perk = 'might' | 'ward' | 'vigour'

/** What a Footsoldier may become on reaching the enemy home column. */
export type PromotionRole = 'charger' | 'marksman'

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
  /** Duels won this game; two make a Veteran, four an Elite (only when the match has growth). */
  wins?: number
  perk?: Perk
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

/** How a match is won: all beacons, the enemy Leader, a beacon score race, or holding the centre. */
export type MatchMode = 'beacons' | 'leader' | 'score' | 'hill'

/**
 * A scenario's goal, always for Solari. Losing the Leader loses the game, and so does running out of rounds
 * (except for Survive, where running out of rounds is the win).
 */
export type Objective =
  | { kind: 'survive'; rounds: number }
  | { kind: 'escort'; goal: Pos; limit: number }
  | { kind: 'hold'; at: Pos; turns: number; limit: number }

/** What a special cell does to the piece standing on it. */
export type CellEffect = 'might' | 'ward' | 'recovery' | 'hazard' | 'silence' | 'invincible'

export interface CellSquare {
  pos: Pos
  effect: CellEffect
}

/** A clock on each turn. Running out passes the turn; the bank is extra time per court, spent only after `seconds` is used. */
export interface TurnClock {
  seconds: number
  bank?: number
}

/** A day event: one of these bends the rules for a couple of rounds. */
export type DayEvent = 'flare' | 'gloaming' | 'fog' | 'blight'

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
  /** Special cells that affect the piece standing on them; boards place them mirror-symmetrically. */
  cells?: readonly CellSquare[]
  /** Which setup and board variant made this match, for display only. */
  setup?: string
  board?: string
  /** The spells each Leader may cast; the classic seven when absent. */
  loadouts?: Record<Court, readonly Spell[]>
  /** A cast spell returns to its Leader this many rounds later; spells are one-use when absent. */
  recharge?: number
  /** Court passives tied to the light (Solari fliers reach further in full light, Umbral regenerate in the dark); off when absent. */
  passives?: boolean
  /** How the match is won; Beacons when absent. */
  mode?: MatchMode
  /** A scenario goal for Solari; it replaces `mode` as the way to win. */
  objective?: Objective
  /** A day event strikes at the start of each day after the first (decided by the seed). */
  events?: boolean
  /** From the Eclipse on, the outer squares turn deadly, closing in on the centre. */
  showdown?: boolean
  /** The light starts out running the other way round. */
  reverse?: boolean
  /** Each human turn is timed (Blitz). The clock runs in the interface; a timeout is recorded as an ordinary pass. */
  turnClock?: TurnClock
  /** Duel wins make Veterans (+1 max HP) and then Elites (a chosen perk). */
  growth?: boolean
  /** Footsoldiers reaching the enemy home column become Chargers or Marksmen. */
  promotion?: boolean
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
  /** Score Race points: beacons held at the end of each round, added up. */
  score: Record<Court, number>
  /** King of the Hill: consecutive turns each court has ended holding the centre. */
  streak: Record<Court, number>
  winner: Court | 'draw' | null
  rng: number
  lastDuel: DuelRecord | null
}

export type Action =
  | { type: 'move'; pieceId: string; to: Pos; duel?: DuelOutcome; perk?: Perk; promote?: PromotionRole }
  | { type: 'cast'; spell: Spell; pieceId?: string; to?: Pos }
  | { type: 'pass' }
