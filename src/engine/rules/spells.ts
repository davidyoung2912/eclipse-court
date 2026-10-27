import { allSquares, chebyshev, inBounds, isBeacon, isBlocked, samePos } from './board'
import { pieceAt } from './moves'
import type { Court, GameState, MatchConfig, Piece, Pos, Spell } from './types'

export const MEND_AMOUNT = 3
export const REVIVE_HP = 2
/** How many spells a custom loadout holds. */
export const LOADOUT_SIZE = 4

/** What a spell may be aimed at: pieces, squares, or neither (empty lists mean no valid target). */
export interface SpellTargets {
  pieces: string[]
  squares: Pos[]
  /** True when the spell needs no target at all. */
  none: boolean
}

/** Everything a spell needs to know about the cast. */
interface Cast {
  state: GameState
  court: Court
  leader: Piece
}

interface SpellDef {
  name: string
  text: string
  /** Courts that may carry it; a spell for both is part of the shared pool. */
  courts: readonly Court[]
  /** HP the Leader pays; a cast also takes the whole turn. */
  cost: number
  /** The pieces, squares or lack of target the spell accepts. */
  targets: (c: Cast) => SpellTargets
  /** The state after the effect, or null if the chosen target is invalid (already checked against `targets`). */
  apply: (c: Cast, pieceId: string | undefined, to: Pos | undefined) => GameState | null
}

const BOTH: readonly Court[] = ['solari', 'umbral']
const NO_TARGETS: SpellTargets = { pieces: [], squares: [], none: false }
const NONE: SpellTargets = { ...NO_TARGETS, none: true }

export const leaderOf = (state: Pick<GameState, 'pieces'>, court: Court) =>
  state.pieces.find((p) => p.court === court && p.role === 'leader')

const isFree = (state: GameState, p: Pos) => !pieceAt(state, p) && !isBlocked(state.config, p)

const adjacentEmpty = (state: GameState, from: Pos) =>
  allSquares().filter((p) => chebyshev(p, from) === 1 && isFree(state, p))

/** Beacon pieces cannot be targeted by spells, nor can shrouded ones. */
const targetable = (state: GameState, p: Piece) => !isBeacon(p.pos, state.config.beacons) && !p.shrouded

const mapPiece = (state: GameState, id: string, f: (p: Piece) => Piece) =>
  state.pieces.map((p) => (p.id === id ? f(p) : p))

const inPieces = (ids: string[], id: string | undefined): id is string => id !== undefined && ids.includes(id)
const inSquares = (squares: Pos[], to: Pos | undefined): to is Pos =>
  to !== undefined && inBounds(to) && squares.some((s) => samePos(s, to))

const ids = (ps: Piece[]) => ps.map((p) => p.id)
const allies = ({ state, court }: Cast) => state.pieces.filter((p) => p.court === court && targetable(state, p))

/** Spells Mirror can copy: those a single tap or square can aim, not Mirror itself nor the two-step Exchange. */
const copyable = (spell: Spell | null): spell is Spell => !!spell && spell !== 'mirror' && spell !== 'exchange'

const DEFS: Record<Spell, SpellDef> = {
  blink: {
    name: 'Blink', text: 'Leader jumps to any empty square.', courts: BOTH, cost: 1,
    targets: ({ state }) => ({ ...NO_TARGETS, squares: allSquares().filter((p) => isFree(state, p)) }),
    apply: ({ state, leader }, _id, to) =>
      to ? { ...state, pieces: mapPiece(state, leader.id, (p) => ({ ...p, pos: to })) } : null,
  },
  mend: {
    name: 'Mend', text: 'An ally regains 3 HP.', courts: BOTH, cost: 1,
    targets: (c) => ({ ...NO_TARGETS, pieces: ids(allies(c).filter((p) => p.hp < p.maxHp)) }),
    apply: ({ state }, id) =>
      id ? { ...state, pieces: mapPiece(state, id, (p) => ({ ...p, hp: Math.min(p.maxHp, p.hp + MEND_AMOUNT) })) } : null,
  },
  turn: {
    name: 'Turn the Hour', text: 'Reverses the luminance cycle.', courts: BOTH, cost: 1,
    targets: () => NONE,
    apply: ({ state }) => ({ ...state, dir: state.dir === 1 ? -1 : 1 }),
  },
  swap: {
    name: 'Swap', text: 'Leader trades places with another piece.', courts: BOTH, cost: 1,
    targets: ({ state, leader }) => ({ ...NO_TARGETS, pieces: ids(state.pieces.filter((p) => p.id !== leader.id && targetable(state, p))) }),
    apply: ({ state, leader }, id) => {
      const target = state.pieces.find((p) => p.id === id)
      if (!target) return null
      const pieces = state.pieces.map((p) =>
        p.id === leader.id ? { ...p, pos: target.pos } : p.id === target.id ? { ...p, pos: leader.pos } : p,
      )
      return { ...state, pieces }
    },
  },
  conjure: {
    name: 'Conjure', text: 'A Footsoldier appears beside the Leader.', courts: BOTH, cost: 1,
    targets: ({ state, leader }) => ({ ...NO_TARGETS, squares: adjacentEmpty(state, leader.pos) }),
    apply: ({ state, court }, _id, to) => {
      if (!to) return null
      const n = state.pieces.length + state.captured.length + 1
      const soldier: Piece = {
        id: `${court}-conjured-${n}`, court, role: 'footsoldier', hp: 4, maxHp: 4,
        pos: to, rest: 0, moved: true, bound: false,
      }
      return { ...state, pieces: [...state.pieces, soldier] }
    },
  },
  revive: {
    name: 'Revive', text: 'The last fallen ally returns beside the Leader at 2 HP.', courts: BOTH, cost: 1,
    targets: ({ state, court, leader }) =>
      state.captured.some((p) => p.court === court && p.role !== 'leader')
        ? { ...NO_TARGETS, squares: adjacentEmpty(state, leader.pos) }
        : NO_TARGETS,
    apply: ({ state, court }, _id, to) => {
      if (!to) return null
      const fallen = [...state.captured].reverse().find((p) => p.court === court && p.role !== 'leader')!
      const revived: Piece = { ...fallen, hp: Math.min(REVIVE_HP, fallen.maxHp), pos: to, rest: 0, moved: true, bound: false }
      return { ...state, pieces: [...state.pieces, revived], captured: state.captured.filter((p) => p.id !== fallen.id) }
    },
  },
  bind: {
    name: 'Bind', text: 'An enemy cannot move on its next turn.', courts: BOTH, cost: 1,
    targets: ({ state, court }) => ({
      ...NO_TARGETS,
      pieces: ids(state.pieces.filter((p) => p.court !== court && targetable(state, p) && p.role !== 'leader')),
    }),
    apply: ({ state }, id) => (id ? { ...state, pieces: mapPiece(state, id, (p) => ({ ...p, bound: true })) } : null),
  },
  hasten: {
    name: 'Hasten', text: 'The light jumps two steps along its cycle.', courts: BOTH, cost: 1,
    targets: () => NONE,
    apply: ({ state }) => {
      const n = state.config.day.length
      return { ...state, phase: (((state.phase + 2 * state.dir) % n) + n) % n }
    },
  },
  exchange: {
    name: 'Exchange', text: 'Two of your pieces trade places.', courts: BOTH, cost: 1,
    targets: (c) => ({ ...NO_TARGETS, pieces: allies(c).length >= 2 ? ids(allies(c)) : [] }),
    // The first ally is the piece, the second is named by the square it stands on.
    apply: (c, id, to) => {
      const first = allies(c).find((p) => p.id === id)
      const second = to && allies(c).find((p) => samePos(p.pos, to))
      if (!first || !second || first.id === second.id) return null
      const pieces = c.state.pieces.map((p) =>
        p.id === first.id ? { ...p, pos: second.pos } : p.id === second.id ? { ...p, pos: first.pos } : p,
      )
      return { ...c.state, pieces }
    },
  },
  hold: {
    name: 'Hold the Light', text: 'The light stays where it is for one round.', courts: ['solari'], cost: 1,
    targets: ({ state }) => (state.hold > 0 ? NO_TARGETS : NONE),
    apply: ({ state }) => ({ ...state, hold: 1 }),
  },
  mirror: {
    name: 'Mirror', text: "Casts the spell your foe cast last, aimed afresh, without spending it.", courts: ['solari'], cost: 1,
    targets: (c) => {
      const copied = c.state.lastCast[c.court === 'solari' ? 'umbral' : 'solari']
      return copyable(copied) ? DEFS[copied].targets(c) : NO_TARGETS
    },
    apply: (c, id, to) => {
      const copied = c.state.lastCast[c.court === 'solari' ? 'umbral' : 'solari']
      return copyable(copied) ? DEFS[copied].apply(c, id, to) : null
    },
  },
  shroud: {
    name: 'Shroud', text: 'An ally cannot be attacked or targeted until your next turn.', courts: ['umbral'], cost: 1,
    targets: (c) => ({ ...NO_TARGETS, pieces: ids(allies(c)) }),
    apply: ({ state }, id) => (id ? { ...state, pieces: mapPiece(state, id, (p) => ({ ...p, shrouded: true })) } : null),
  },
  sacrifice: {
    name: 'Sacrifice', text: "An ally falls; the Leader takes its HP.", courts: ['umbral'], cost: 1,
    targets: (c) =>
      c.leader.hp < c.leader.maxHp
        ? { ...NO_TARGETS, pieces: ids(allies(c).filter((p) => p.role !== 'leader')) }
        : NO_TARGETS,
    apply: ({ state, leader }, id) => {
      const victim = state.pieces.find((p) => p.id === id)
      if (!victim) return null
      const pieces = state.pieces
        .filter((p) => p.id !== victim.id)
        .map((p) => (p.id === leader.id ? { ...p, hp: Math.min(p.maxHp, p.hp + victim.hp) } : p))
      return { ...state, pieces, captured: [...state.captured, { ...victim, hp: 0 }] }
    },
  },
}

/** The seven spells every Leader held before loadouts. */
export const CLASSIC_SPELLS: readonly Spell[] = ['blink', 'mend', 'turn', 'swap', 'conjure', 'revive', 'bind']

export const ALL_SPELLS = Object.keys(DEFS) as Spell[]

export const SPELL_INFO: Record<Spell, { name: string; text: string; courts: readonly Court[]; cost: number }> = DEFS

/** Spells a court may carry: the shared pool plus its own signatures. */
export const spellPool = (court: Court): Spell[] => ALL_SPELLS.filter((s) => DEFS[s].courts.includes(court))

/** A court's signature spells, which only it may carry. */
export const signatureSpells = (court: Court): Spell[] => ALL_SPELLS.filter((s) => DEFS[s].courts.length === 1 && DEFS[s].courts[0] === court)

/** The spells a court's Leader starts a match with. */
export const loadoutOf = (config: Pick<MatchConfig, 'loadouts'>, court: Court): readonly Spell[] =>
  config.loadouts?.[court] ?? CLASSIC_SPELLS

/** Why a custom loadout is not allowed, or null if it is. */
export function loadoutProblem(court: Court, spells: readonly Spell[]): string | null {
  if (spells.length !== LOADOUT_SIZE) return `Choose exactly ${LOADOUT_SIZE} spells.`
  if (new Set(spells).size !== spells.length) return 'Each spell can be chosen once.'
  if (spells.some((s) => !spellPool(court).includes(s))) return 'A spell is not available to this court.'
  return null
}

export function spellTargets(state: GameState, court: Court, spell: Spell, first?: string): SpellTargets {
  const leader = leaderOf(state, court)
  const def = DEFS[spell]
  if (!leader || leader.hp <= def.cost || state.eclipse || !state.spells[court].includes(spell)) return NO_TARGETS
  const t = def.targets({ state, court, leader })
  // Exchange is aimed in two taps: once the first ally is chosen, only the others remain.
  return spell === 'exchange' && first ? { ...t, pieces: t.pieces.filter((id) => id !== first) } : t
}

export function canCast(state: GameState, court: Court, spell: Spell): boolean {
  const t = spellTargets(state, court, spell)
  return t.none || t.pieces.length > 0 || t.squares.length > 0
}

/** Applies a spell's effect (the caller pays HP and ends the turn); returns null if the target is invalid. */
export function applySpell(
  state: GameState,
  court: Court,
  spell: Spell,
  pieceId?: string,
  to?: Pos,
): GameState | null {
  const t = spellTargets(state, court, spell)
  const leader = leaderOf(state, court)
  if (!leader) return null
  if (spell === 'exchange') {
    // Both allies must be legal: the piece by id, the other by its square.
    const second = to && state.pieces.find((p) => samePos(p.pos, to))
    if (!inPieces(t.pieces, pieceId) || !second || !t.pieces.includes(second.id)) return null
  } else if (t.none) {
    if (pieceId !== undefined || to !== undefined) return null
  } else {
    const wantsPiece = t.pieces.length > 0
    if (wantsPiece ? !inPieces(t.pieces, pieceId) : !inSquares(t.squares, to)) return null
    // A spell takes a piece or a square, never both.
    if (wantsPiece ? to !== undefined : pieceId !== undefined) return null
  }
  return DEFS[spell].apply({ state, court, leader }, pieceId, to)
}
