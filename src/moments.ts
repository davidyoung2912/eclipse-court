/** Named moments: the rare, short banners for first blood, a Leader check, a streak of three and the Eclipse. */
import { isLeaderThreatened } from './banter'
import type { Step } from './engine/log'
import { otherCourt } from './engine/rules/board'
import type { Court } from './engine/rules/types'
import { piecesLost, streakAfter } from './juice'

export type MomentId = 'first-blood' | 'check' | 'streak' | 'eclipse'

export interface Moment {
  id: MomentId
  /** The court that earned it, or null for the Eclipse, which belongs to neither. */
  court: Court | null
}

/** The streak that earns its banner. */
export const STREAK_MOMENT = 3

/** Milliseconds a banner stays up unless tapped away. */
export const MOMENT_MS = 1400

/**
 * The named moment the latest step made, or null. Each moment is named once a game (`seen` holds those already shown),
 * and when one step makes several only the rarest is named: the Eclipse, then a streak, first blood, then a check.
 */
export function momentOf(steps: readonly Step[], seen: ReadonlySet<MomentId>): Moment | null {
  if (steps.length < 2) return null
  const before = steps[steps.length - 2].state
  const after = steps[steps.length - 1].state
  const actor = before.turn
  const fresh = (id: MomentId) => !seen.has(id)
  if (fresh('eclipse') && after.eclipse && !before.eclipse && !after.winner) return { id: 'eclipse', court: null }
  if (after.winner) return null
  const took = piecesLost(before, after) > 0
  if (fresh('streak') && took && streakAfter(steps)?.count === STREAK_MOMENT) return { id: 'streak', court: actor }
  if (fresh('first-blood') && took && !steps.slice(0, -1).some((s, i) => i > 0 && piecesLost(steps[i - 1].state, s.state) > 0)) {
    return { id: 'first-blood', court: actor }
  }
  if (fresh('check')) {
    for (const court of ['solari', 'umbral'] as const) {
      if (isLeaderThreatened(after, court) && !isLeaderThreatened(before, court)) return { id: 'check', court: otherCourt(court) }
    }
  }
  return null
}
