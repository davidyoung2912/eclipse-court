import { rngNext } from '../engine/rng'
import { canAdd, DRAFT_ROLES, ROLE_COST } from '../engine/data/draft'
import type { Role } from '../engine/rules/types'
import { DIFFICULTY, type Difficulty } from './profile'

/** How much a balanced army wants of each role; every extra copy of a role is worth less. */
const WANT: Record<Role, number> = {
  footsoldier: 3, flier: 2.2, marksman: 2.6, bruiser: 2.4, charger: 2.4, aura: 1.6, leader: 0,
}

/**
 * The AI's army: it keeps buying whichever role is most wanted per cost, with diminishing returns
 * for repeats. Weaker difficulties add noise to the scores, so their armies are lopsided.
 */
export function aiDraft(seed: number, difficulty: Difficulty): Role[] {
  const roles: Role[] = []
  let rng = seed >>> 0
  const noise = 0.1 + 0.3 * DIFFICULTY[difficulty].noise
  for (;;) {
    const open = DRAFT_ROLES.filter((r) => canAdd(roles, r))
    if (!open.length) return roles
    let best = open[0]
    let bestScore = -Infinity
    for (const r of open) {
      const [roll, next] = rngNext(rng)
      rng = next
      const have = roles.filter((x) => x === r).length
      const score = WANT[r] / (1 + have) / Math.sqrt(ROLE_COST[r]) + (roll - 0.5) * 2 * noise
      if (score > bestScore) {
        best = r
        bestScore = score
      }
    }
    roles.push(best)
  }
}
