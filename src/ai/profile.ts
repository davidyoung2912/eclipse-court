export type Difficulty = 'easy' | 'normal' | 'hard'
export const DIFFICULTY_LIST: readonly Difficulty[] = ['easy', 'normal', 'hard']

/** Human-like limits on a duel AI. No stat cheating: skill only changes how well it plays. */
export interface AiProfile {
  /** Seconds between looks at the opponent; everything it knows about them is this stale. */
  reaction: number
  /** Spread of the aim error in radians. */
  aimError: number
  /** Chance (0..1) of sidestepping a threat it has noticed. */
  dodge: number
  /** How much (0..1) it leads moving targets. */
  lead: number
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t

/** Skill 0 is helpless, 1 is near-perfect. */
export function profileForSkill(skill: number): AiProfile {
  const s = Math.min(1, Math.max(0, skill))
  return {
    reaction: lerp(0.6, 0.08, s),
    aimError: lerp(1.0, 0.03, s),
    dodge: lerp(0, 0.95, s),
    lead: s,
  }
}

/** Duel skill and strategy search settings for each difficulty. */
export const DIFFICULTY: Record<Difficulty, { skill: number; depth: number; beam: number; noise: number }> = {
  easy: { skill: 0.25, depth: 1, beam: 12, noise: 2.5 },
  normal: { skill: 0.55, depth: 2, beam: 10, noise: 0.6 },
  hard: { skill: 0.85, depth: 3, beam: 12, noise: 0 },
}

/** The skill the auto-duel plays the player's side at. */
export const AUTO_DUEL_SKILL = 0.8
