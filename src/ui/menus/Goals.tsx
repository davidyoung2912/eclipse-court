import { useSyncExternalStore } from 'react'
import { claimedOn } from '../../bounties'
import { dailySeed } from '../../engine/data/setups'
import { openGoals, type GoalTarget } from '../../goals'
import { t } from '../../i18n'
import { masterySnapshot, subscribeMastery } from '../../mastery'
import type { Progress } from '../../progress'
import { roleGoalsSnapshot, subscribeRoleGoals } from '../../roleGoals'
import { Bar } from './Bar'
import { BackButton } from './BackButton'
import { Icon } from './icons'
import { PageArt } from './MenuArt'
import { Quests } from './Quests'

interface Props {
  progress: Progress
  onGo: (target: GoalTarget) => void
  onSeason?: () => void
  onBack: () => void
}

export function Goals({ progress, onGo, onSeason, onBack }: Props) {
  const mastery = useSyncExternalStore(subscribeMastery, masterySnapshot)
  const roles = useSyncExternalStore(subscribeRoleGoals, roleGoalsSnapshot)
  const day = dailySeed()
  const goals = openGoals({ progress, mastery, roles, bounties: claimedOn(day), day })
  return (
    <main className="app menu blue-menu">
      <PageArt icon="star" />
      <h2>{t('goals.title')}</h2>
      <p className="lede">{t('goals.intro')}</p>
      <Quests />
      {goals.length === 0 && <p className="status">{t('goals.empty')}</p>}
      <ul className="mastery-tracks">
        {goals.map((g) => (
          <li key={g.id}>
            <strong>{g.title}</strong> <small>{g.detail}</small>
            <Bar fraction={g.fraction} thin />
            <button className={g.claimable ? 'primary' : undefined} onClick={() => onGo(g.target)}>
              <Icon name={g.claimable ? 'star' : 'onward'} />{g.claimable ? t('goals.claim') : t(`goals.go.${g.target}`)}
            </button>
          </li>
        ))}
      </ul>
      <div className="menu-buttons stacked">
        {onSeason && <button onClick={onSeason}><Icon name="star" />{t('menu.season')}</button>}
        <BackButton onClick={onBack} />
      </div>
    </main>
  )
}
