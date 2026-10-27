import { dailySeed } from '../setups'
import { BEGINNER } from './beginner'
import { BEGINNER_MORE } from './beginner2'
import { EXPERT } from './expert'
import type { Puzzle, PuzzleTier } from './helpers'
import { NORMAL } from './normal'
import { NORMAL_MORE } from './normal2'

export type { Puzzle, PuzzleTier } from './helpers'
export { PUZZLE_TIERS, type TierInfo } from './tiers'

/** Every puzzle, easiest tier first; ids are what progress is saved against, so they never change. */
export const PUZZLES: readonly Puzzle[] = [...BEGINNER, ...BEGINNER_MORE, ...NORMAL, ...NORMAL_MORE, ...EXPERT]

export const puzzlesIn = (tier: PuzzleTier) => PUZZLES.filter((p) => p.tier === tier)

export const puzzleById = (id: string) => PUZZLES.find((p) => p.id === id)

/** Today's puzzle: the same for everyone on the same date, rotating through the pack. */
export const dailyPuzzleIndex = (date = new Date()) => dailySeed(date) % PUZZLES.length
