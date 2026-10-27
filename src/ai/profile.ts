import type { Difficulty } from '../engine/data/difficulty'

export { DIFFICULTY_LIST, type Difficulty } from '../engine/data/difficulty'

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
  /** 0..1: how readily it presses the attack. Low values close in slowly, pause between attacks and charge lightly. */
  aggression: number
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t

/** Skill 0 is helpless, 1 is near-perfect. */
export function profileForSkill(skill: number, aggression = 1): AiProfile {
  const s = Math.min(1, Math.max(0, skill))
  return {
    reaction: lerp(0.6, 0.08, s),
    aimError: lerp(1.0, 0.03, s),
    dodge: lerp(0, 0.95, s),
    lead: s,
    aggression: Math.min(1, Math.max(0, aggression)),
  }
}

/** Duel skill and strategy search settings for each difficulty. */
export const DIFFICULTY: Record<Difficulty, { skill: number; aggression: number; depth: number; beam: number; noise: number }> = {
  easy: { skill: 0.25, aggression: 0.3, depth: 1, beam: 12, noise: 2.5 },
  normal: { skill: 0.55, aggression: 0.5, depth: 2, beam: 10, noise: 0.6 },
  hard: { skill: 0.85, aggression: 0.7, depth: 3, beam: 12, noise: 0 },
}

/** The skill the auto-duel plays the player's side at. */
export const AUTO_DUEL_SKILL = 0.8
