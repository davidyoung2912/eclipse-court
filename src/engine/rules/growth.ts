import { ROLE_STATS } from '../data/roster'
import { pieceAt } from './moves'
import type { Action, GameState, MatchConfig, Perk, Piece, PromotionRole, Role } from './types'

/** Duel wins that make a Veteran (+1 max HP) and then an Elite (a chosen perk). */
export const VETERAN_WINS = 2
export const ELITE_WINS = 4

export const PERK_INFO: Record<Perk, { name: string; text: string }> = {
  might: { name: 'Might', text: 'Deals 15% more damage in duels.' },
  ward: { name: 'Ward', text: 'Takes 15% less damage in duels.' },
  vigour: { name: 'Vigour', text: 'Heals 1 extra HP at the end of every round.' },
}

export const PROMOTIONS: readonly PromotionRole[] = ['charger', 'marksman']

const PERK_DAMAGE = 1.15
const PERK_GUARD = 0.85

/** The two perks a piece may pick from when it becomes Elite: the first is also what an unadvised pick falls back to. */
export function perkChoices(role: Role): [Perk, Perk] {
  switch (role) {
    case 'flier':
    case 'marksman':
      return ['might', 'vigour']
    case 'aura':
    case 'leader':
      return ['ward', 'vigour']
    default:
      return ['might', 'ward']
  }
}

/** Duel damage multipliers from a piece's perk. */
export function perkMods(piece: Pick<Piece, 'perk'>): { dealt: number; taken: number } {
  return { dealt: piece.perk === 'might' ? PERK_DAMAGE : 1, taken: piece.perk === 'ward' ? PERK_GUARD : 1 }
}

/** Veterans have a different HP ceiling and Elites a perk, so neither matches the stock matchup table. */
export const isStock = (p: Piece) => (p.wins ?? 0) < VETERAN_WINS && !p.perk

export const rankOf = (p: Piece): 'recruit' | 'veteran' | 'elite' =>
  (p.wins ?? 0) >= ELITE_WINS ? 'elite' : (p.wins ?? 0) >= VETERAN_WINS ? 'veteran' : 'recruit'

/** The column a Footsoldier of this court must reach to be promoted. */
export const promotionColumn = (court: Piece['court']) => (court === 'solari' ? 6 : 0)

/** A duel win: Veterans gain a point of max HP (and heal it), Elites take the offered perk or, failing that, the first. */
export function recordWin(config: MatchConfig, piece: Piece, pick?: Perk): Piece {
  if (!config.growth) return piece
  const wins = (piece.wins ?? 0) + 1
  const next = { ...piece, wins }
  if (wins === VETERAN_WINS) return { ...next, maxHp: piece.maxHp + 1, hp: piece.hp + 1 }
  if (wins === ELITE_WINS) {
    const offered = perkChoices(piece.role)
    return { ...next, perk: pick && offered.includes(pick) ? pick : offered[0] }
  }
  return next
}

/** A Footsoldier that has crossed the board becomes a Charger or Marksman, keeping its wounds, record and perk. */
export function promote(config: MatchConfig, piece: Piece, to: PromotionRole = 'charger'): Piece {
  if (!config.promotion || piece.role !== 'footsoldier' || piece.pos.x !== promotionColumn(piece.court)) return piece
  const bonus = piece.maxHp - ROLE_STATS.footsoldier.hp
  const maxHp = ROLE_STATS[to].hp + bonus
  return { ...piece, role: to, maxHp, hp: maxHp - (piece.maxHp - piece.hp) }
}

export interface GrowthChoice {
  /** Set when this move's winner reaches Elite and may pick between these perks. */
  perks?: [Perk, Perk]
  /** Set when this move promotes a Footsoldier. */
  promote?: boolean
}

/** What the mover gets to decide in a move, so the interface can ask before the action is played. */
export function growthChoice(state: GameState, action: Extract<Action, { type: 'move' }>): GrowthChoice {
  const piece = state.pieces.find((p) => p.id === action.pieceId)
  if (!piece) return {}
  const { config } = state
  const target = pieceAt(state, action.to)
  const out = action.duel
  const wins = !!target && !!out && out.defenderHp <= 0 && out.attackerHp > 0
  const survives = !target || (!!out && out.attackerHp > 0)
  const choice: GrowthChoice = {}
  if (config.growth && wins && (piece.wins ?? 0) + 1 === ELITE_WINS) choice.perks = perkChoices(piece.role)
  // A piece that takes the target square stands there; one that merely wins the duel stays put.
  const lands = !target || (wins && !!out)
  if (config.promotion && piece.role === 'footsoldier' && survives && lands && action.to.x === promotionColumn(piece.court)) choice.promote = true
  return choice
}
