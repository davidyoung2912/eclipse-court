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
export type Spell = 'blink' | 'mend' | 'turn' | 'swap' | 'conjure' | 'revive' | 'bind'

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

export interface GameState {
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
  winner: Court | 'draw' | null
  rng: number
  lastDuel: DuelRecord | null
}

export type Action =
  | { type: 'move'; pieceId: string; to: Pos; duel?: DuelOutcome }
  | { type: 'cast'; spell: Spell; pieceId?: string; to?: Pos }
  | { type: 'pass' }
