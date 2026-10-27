import { allSquares, chebyshev, inBounds, isBeacon, samePos } from './board'
import { pieceAt } from './moves'
import type { Court, GameState, Piece, Pos, Spell } from './types'

export const SPELLS: readonly Spell[] = ['blink', 'mend', 'turn', 'swap', 'conjure', 'revive', 'bind']

export const SPELL_INFO: Record<Spell, { name: string; text: string }> = {
  blink: { name: 'Blink', text: 'Leader jumps to any empty square.' },
  mend: { name: 'Mend', text: 'An ally regains 3 HP.' },
  turn: { name: 'Turn the Hour', text: 'Reverses the luminance cycle.' },
  swap: { name: 'Swap', text: 'Leader trades places with another piece.' },
  conjure: { name: 'Conjure', text: 'A Footsoldier appears beside the Leader.' },
  revive: { name: 'Revive', text: 'The last fallen ally returns beside the Leader at 2 HP.' },
  bind: { name: 'Bind', text: 'An enemy cannot move on its next turn.' },
}

export const MEND_AMOUNT = 3
export const REVIVE_HP = 2

export const leaderOf = (state: Pick<GameState, 'pieces'>, court: Court) =>
  state.pieces.find((p) => p.court === court && p.role === 'leader')

/** What a spell may be aimed at: pieces, squares, or neither (empty lists mean no valid target). */
export interface SpellTargets {
  pieces: string[]
  squares: Pos[]
  /** True when the spell needs no target at all. */
  none: boolean
}

const adjacentEmpty = (state: GameState, from: Pos) =>
  allSquares().filter(
    (p) => chebyshev(p, from) === 1 && !pieceAt(state, p),
  )

/** Beacon pieces cannot be targeted by spells. */
const targetable = (p: Piece) => !isBeacon(p.pos)

export function spellTargets(state: GameState, court: Court, spell: Spell): SpellTargets {
  const none: SpellTargets = { pieces: [], squares: [], none: false }
  const leader = leaderOf(state, court)
  if (!leader || leader.hp < 2 || state.eclipse || !state.spells[court].includes(spell)) return none
  switch (spell) {
    case 'blink':
      return { ...none, squares: allSquares().filter((p) => !pieceAt(state, p)) }
    case 'mend':
      return {
        ...none,
        pieces: state.pieces
          .filter((p) => p.court === court && p.hp < p.maxHp && targetable(p))
          .map((p) => p.id),
      }
    case 'turn':
      return { ...none, none: true }
    case 'swap':
      return {
        ...none,
        pieces: state.pieces.filter((p) => p.id !== leader.id && targetable(p)).map((p) => p.id),
      }
    case 'conjure':
      return { ...none, squares: adjacentEmpty(state, leader.pos) }
    case 'revive':
      return state.captured.some((p) => p.court === court && p.role !== 'leader')
        ? { ...none, squares: adjacentEmpty(state, leader.pos) }
        : none
    case 'bind':
      return {
        ...none,
        pieces: state.pieces
          .filter((p) => p.court !== court && targetable(p) && p.role !== 'leader')
          .map((p) => p.id),
      }
  }
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
  const mapPiece = (id: string, f: (p: Piece) => Piece) => state.pieces.map((p) => (p.id === id ? f(p) : p))
  const validPiece = pieceId !== undefined && t.pieces.includes(pieceId)
  const validSquare = to !== undefined && inBounds(to) && t.squares.some((s) => samePos(s, to))
  switch (spell) {
    case 'turn':
      return { ...state, dir: state.dir === 1 ? -1 : 1 }
    case 'blink':
      return validSquare ? { ...state, pieces: mapPiece(leader.id, (p) => ({ ...p, pos: to })) } : null
    case 'mend':
      return validPiece
        ? { ...state, pieces: mapPiece(pieceId, (p) => ({ ...p, hp: Math.min(p.maxHp, p.hp + MEND_AMOUNT) })) }
        : null
    case 'bind':
      return validPiece ? { ...state, pieces: mapPiece(pieceId, (p) => ({ ...p, bound: true })) } : null
    case 'swap': {
      if (!validPiece) return null
      const target = state.pieces.find((p) => p.id === pieceId)!
      const pieces = state.pieces.map((p) =>
        p.id === leader.id ? { ...p, pos: target.pos } : p.id === target.id ? { ...p, pos: leader.pos } : p,
      )
      return { ...state, pieces }
    }
    case 'conjure': {
      if (!validSquare) return null
      const n = state.pieces.length + state.captured.length + 1
      const soldier: Piece = {
        id: `${court}-conjured-${n}`, court, role: 'footsoldier', hp: 4, maxHp: 4,
        pos: to, rest: 0, moved: true, bound: false,
      }
      return { ...state, pieces: [...state.pieces, soldier] }
    }
    case 'revive': {
      if (!validSquare) return null
      const fallen = [...state.captured].reverse().find((p) => p.court === court && p.role !== 'leader')!
      const revived: Piece = { ...fallen, hp: Math.min(REVIVE_HP, fallen.maxHp), pos: to, rest: 0, moved: true, bound: false }
      return { ...state, pieces: [...state.pieces, revived], captured: state.captured.filter((p) => p.id !== fallen.id) }
    }
  }
}
