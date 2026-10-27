import { samePos } from './board'
import type { CellEffect, CellSquare, Court, GameState, MatchConfig, Piece, Pos } from './types'

export const CELL_EFFECTS: readonly CellEffect[] = ['might', 'ward', 'recovery', 'hazard', 'silence', 'invincible']

export const CELL_INFO: Record<CellEffect, { name: string; text: string }> = {
  might: { name: 'Might', text: 'A piece standing here deals 25% more damage in duels.' },
  ward: { name: 'Ward', text: 'A piece standing here takes 20% less damage in duels.' },
  recovery: { name: 'Recovery', text: 'A piece here heals 20% of its max HP at the end of the round.' },
  hazard: { name: 'Hazard', text: 'A piece here loses 20% of its max HP at the end of the round.' },
  silence: { name: 'Silence', text: 'A Leader standing here cannot cast spells.' },
  invincible: { name: 'Invincibility', text: 'A piece here takes no duel damage on odd rounds.' },
}

export const MIGHT_DEALT = 1.25
export const WARD_TAKEN = 0.8
/** Share of max HP that Recovery heals and Hazard takes, at least one point. */
export const CELL_HP_SHARE = 0.2

/** What a cell does to the damage a piece standing on it deals and takes. */
export interface CellMods {
  dealt: number
  taken: number
}

/** The cells under the two fighters of a duel. */
export interface DuelCells {
  attacker: CellMods
  defender: CellMods
}

export const NEUTRAL_CELL: CellMods = { dealt: 1, taken: 1 }

export const cellAt = (config: Pick<MatchConfig, 'cells'>, p: Pos): CellEffect | null =>
  config.cells?.find((c) => samePos(c.pos, p))?.effect ?? null

/** Invincibility pulses: it protects on odd rounds only, so nobody can sit out the whole game behind it. */
export const invincibleOn = (round: number) => round % 2 === 1

/** Duel multipliers for a piece standing on `effect` in `round`; invincible means taking nothing. */
export function cellMods(effect: CellEffect | null, round: number): CellMods {
  if (effect === 'might') return { dealt: MIGHT_DEALT, taken: 1 }
  if (effect === 'ward') return { dealt: 1, taken: WARD_TAKEN }
  if (effect === 'invincible' && invincibleOn(round)) return { dealt: 1, taken: 0 }
  return NEUTRAL_CELL
}

/**
 * The cells under an attack's two fighters (each stands on its own square when the duel begins),
 * or undefined when neither has an effect, so callers can keep the plain fast path.
 */
export function duelCells(state: Pick<GameState, 'config' | 'round'>, attacker: Piece, defender: Piece): DuelCells | undefined {
  const a = cellAt(state.config, attacker.pos)
  const d = cellAt(state.config, defender.pos)
  if (!a && !d) return undefined
  return { attacker: cellMods(a, state.round), defender: cellMods(d, state.round) }
}

/** HP gained (positive) or lost (negative) by a piece of `maxHp` standing on `effect` at the end of the round. */
export function cellHpChange(effect: CellEffect | null, maxHp: number): number {
  const amount = Math.max(1, Math.ceil(maxHp * CELL_HP_SHARE))
  return effect === 'recovery' ? amount : effect === 'hazard' ? -amount : 0
}

/** Whether `court`'s Leader stands on a Silence cell. */
export const isSilenced = (state: Pick<GameState, 'config' | 'pieces'>, court: Court): boolean => {
  const leader = state.pieces.find((p) => p.court === court && p.role === 'leader')
  return !!leader && cellAt(state.config, leader.pos) === 'silence'
}

const mirrorOf = ({ x, y }: Pos): Pos => ({ x: 6 - x, y })

/** Whether the cells are a mirror image across the board, as board variants must be so neither court is favoured. */
export function cellsSymmetric(cells: readonly CellSquare[] = []): boolean {
  return cells.every((c) => {
    const twin = cells.find((o) => samePos(o.pos, mirrorOf(c.pos)))
    return !!twin && twin.effect === c.effect
  })
}
