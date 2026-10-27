import { canAdd, countRole, DRAFT_BUDGET, DRAFT_ROLES, draftCost, draftProblem, ROLE_COST } from '../../engine/data/draft'
import { ROLE_NAMES } from '../../engine/data/roster'
import { nextRoleStars, roleLimit } from '../../engine/data/unlocks'
import type { Court, Role } from '../../engine/rules/types'

interface Props {
  court: Court
  roles: readonly Role[]
  onChange: (roles: Role[]) => void
  /** Campaign stars earned, which open bigger armies. */
  stars: number
}

/** Spend the budget on pieces; the Leader comes free. */
export function DraftPicker({ court, roles, onChange, stars }: Props) {
  const spent = draftCost(roles)
  const problem = draftProblem(roles)
  return (
    <div className="draft">
      <div className="draft-head">
        <span>{roles.length + 1} pieces with your Leader</span>
        <span className={spent > DRAFT_BUDGET ? 'over' : ''}>{spent} / {DRAFT_BUDGET} points</span>
      </div>
      {DRAFT_ROLES.map((role) => {
        const n = countRole(roles, role)
        const limit = roleLimit(role, stars)
        const next = nextRoleStars(role, stars)
        return (
          <div key={role} className="draft-row">
            <span className="name">{ROLE_NAMES[court][role]}</span>
            <span className="cost">{ROLE_COST[role]} pts · max {limit}{next !== null && ` (${next} ★ for more)`}</span>
            <button aria-label={`Fewer ${role}`} disabled={n === 0} onClick={() => onChange(removeOne(roles, role))}>−</button>
            <span className="count">{n}</span>
            <button aria-label={`More ${role}`} disabled={!canAdd(roles, role) || n >= limit} onClick={() => onChange([...roles, role])}>+</button>
          </div>
        )
      })}
      {problem && <div className="draft-head over">{problem}</div>}
    </div>
  )
}

function removeOne(roles: readonly Role[], role: Role): Role[] {
  const i = roles.indexOf(role)
  return roles.filter((_, j) => j !== i)
}
