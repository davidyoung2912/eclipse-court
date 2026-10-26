import { styleOf } from '../engine/duel/sim'
import type { DuelInput, DuelState } from '../engine/duel/types'

const RANGED_STANDOFF = 4

/**
 * Basic duel opponent: melee roles close in and swing, marksmen keep their distance and fire.
 * Stateless so it stays deterministic; the full reaction/aim/dodge state machines arrive in phase 4.
 */
export function simpleDuelAi(state: DuelState, i: 0 | 1): DuelInput {
  const me = state.fighters[i]
  const foe = state.fighters[1 - i]
  const dx = foe.pos.x - me.pos.x
  const dy = foe.pos.y - me.pos.y
  const d = Math.hypot(dx, dy) || 1
  const st = styleOf(me.role)
  const ranged = st.kind === 'shot'
  const want = ranged ? RANGED_STANDOFF : 0
  const dir = d > want ? 1 : -1
  const near = ranged && Math.abs(d - want) < 0.5
  // Strafe sideways so ranged shots can be dodged and charges are not walked into.
  const strafe = Math.sin(state.t * 1.5 + i * 2)
  const mx = near ? (-dy / d) * strafe : (dx / d) * dir
  const my = near ? (dx / d) * strafe : (dy / d) * dir
  const reach = ranged ? st.reach : st.reach + me.radius + foe.radius
  const attack = d < reach && Math.floor(state.t * 3) % 2 === 0
  return { mx, my, attack }
}
