export type HeroTarget = 'sun' | 'moon'

export interface HeroReaction {
  /** The Leader who answers: the Solarch to the sun, the Duskmother to the moon. */
  leader: 'solari' | 'umbral'
  /** Every fifth tap in a run is a bigger flare. */
  big: boolean
}

/** Taps further apart than this start a new run. */
export const TAP_RUN_MS = 1600

export function heroReaction(target: HeroTarget, run: number): HeroReaction {
  return { leader: target === 'sun' ? 'solari' : 'umbral', big: run > 0 && run % 5 === 0 }
}

/** The length of the run of taps this one belongs to: 1 when it comes after a pause. */
export function nextRun(run: number, sinceLastMs: number): number {
  return sinceLastMs > TAP_RUN_MS ? 1 : run + 1
}
