import type { Difficulty } from '../../ai/profile'
import type { IconName } from './icons'

/** The icon for each AI level (Beginner, Normal, Expert), used wherever a level is picked. */
export const LEVEL_ICON: Record<Difficulty, IconName> = { easy: 'leaf', normal: 'shield', hard: 'flame' }
