import { NEUTRAL_CELL, type DuelCells } from './engine/rules/cells'
import type { FightLevel } from './settings'

/** What each fight difficulty changes in a fight between the human and the AI. */
export interface FightTuning {
  /** Multipliers on the damage the human's fighter deals and takes. */
  playerDealt: number
  playerTaken: number
  /** Added to the AI's duel skill and aggression (the result is kept within 0..1). */
  foeSkill: number
  foeAggression: number
  /** Scales how fast the AI speeds up as a live fight wears on. */
  foeRamp: number
}

export const FIGHT_TUNING: Record<FightLevel, FightTuning> = {
  easy: { playerDealt: 1.25, playerTaken: 0.8, foeSkill: -0.15, foeAggression: -0.15, foeRamp: 0.5 },
  normal: { playerDealt: 1, playerTaken: 1, foeSkill: 0, foeAggression: 0, foeRamp: 1 },
  hard: { playerDealt: 0.9, playerTaken: 1.15, foeSkill: 0.1, foeAggression: 0.1, foeRamp: 1.4 },
}

/** The cells with the tuning's damage multipliers applied to the human's side (0 attacks, 1 defends). */
export function tuneCells(cells: DuelCells | undefined, playerSide: 0 | 1, tuning: FightTuning): DuelCells | undefined {
  if (tuning.playerDealt === 1 && tuning.playerTaken === 1) return cells
  const base = cells ?? { attacker: NEUTRAL_CELL, defender: NEUTRAL_CELL }
  const key = playerSide === 0 ? 'attacker' : 'defender'
  const mine = base[key]
  return { ...base, [key]: { dealt: mine.dealt * tuning.playerDealt, taken: mine.taken * tuning.playerTaken } }
}
