/** A named opponent's expression in the match HUD: a mood chosen from the same events that trigger banter. */
import type { LineCategory } from './engine/data/personaLines'

export type Mood = 'calm' | 'pleased' | 'stung' | 'alarmed' | 'awed'

/** Milliseconds a mood holds before the face settles back to calm. */
export const MOOD_MS = 3200

const MOODS: Partial<Record<LineCategory, Mood>> = {
  capture: 'pleased',
  'duel-win': 'pleased',
  threat: 'pleased',
  'beacon-gain': 'pleased',
  win: 'pleased',
  'lose-piece': 'stung',
  'duel-loss': 'stung',
  'beacon-lose': 'stung',
  lose: 'stung',
  danger: 'alarmed',
  eclipse: 'awed',
}

/** The mood a banter event puts the persona in, or null when the face should stay as it is. */
export const moodFor = (category: LineCategory | null): Mood | null => (category ? MOODS[category] ?? null : null)
