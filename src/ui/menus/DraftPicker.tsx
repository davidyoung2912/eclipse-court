import { canAdd, countRole, DRAFT_BUDGET, DRAFT_ROLES, draftCost, draftProblem, ROLE_COST } from '../../engine/data/draft'
import { ROLE_NAMES } from '../../engine/data/roster'
import { nextRoleStars, roleLimit } from '../../engine/data/unlocks'
import type { Court, Role } from '../../engine/rules/types'
import { t } from '../../i18n'

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
        <span>{t('setup.piecesWithLeader', { n: roles.length + 1 })}</span>
        <span className={spent > DRAFT_BUDGET ? 'over' : ''}>{t('setup.points', { spent, budget: DRAFT_BUDGET })}</span>
      </div>
      {DRAFT_ROLES.map((role) => {
        const n = countRole(roles, role)
        const limit = roleLimit(role, stars)
        const next = nextRoleStars(role, stars)
        return (
          <div key={role} className="draft-row">
            <span className="name">{ROLE_NAMES[court][role]}</span>
            <span className="cost">{t('setup.roleCost', { cost: ROLE_COST[role], limit })}{next !== null && t('setup.moreStars', { n: next })}</span>
            <button aria-label={t('setup.fewer', { role })} disabled={n === 0} onClick={() => onChange(removeOne(roles, role))}>−</button>
            <span className="count" role="status" aria-label={t('setup.roleCount', { name: ROLE_NAMES[court][role] })}>{n}</span>
            <button aria-label={t('setup.more', { role })} disabled={!canAdd(roles, role) || n >= limit} onClick={() => onChange([...roles, role])}>+</button>
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
