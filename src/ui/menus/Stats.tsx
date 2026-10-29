import { useState, useSyncExternalStore } from 'react'
import { ACHIEVEMENTS, ACHIEVEMENT_CATEGORIES, type Progress } from '../../progress'
import { dailySeed } from '../../engine/data/setups'
import { overall, percent, sections, totals } from '../../statsModel'
import { storySnapshot, subscribeStory } from '../../story'
import { claimMastery, levelReward, masterySnapshot, SHOWCASE_SLOTS, standings, subscribeMastery, togglePin } from '../../mastery'
import { claimRoleGoals, rewardsFor, roleGoalsSnapshot, subscribeRoleGoals, unclaimedGoals, type GoalClaim } from '../../roleGoals'
import { goalDone, GOAL_ROLES, GOAL_ROLE_NAMES, progressOf, ROLE_GOALS } from '../../engine/data/roleGoals'
import { ladderSnapshot, subscribeLadder } from '../../ladder'
import { recordsSnapshot, subscribeRecords } from '../../records'
import { subscribeTournaments, tournamentSnapshot } from '../../tournaments'
import { rushBest } from '../../rush'
import { rankOf } from '../../engine/data/ladder'
import { Bar } from './Bar'
import { RankCrest } from './RankCrest'
import { courtRank } from '../../progression'
import { shareLink } from '../../share'
import { ShareButton } from '../ShareButton'
import { ResetButton } from './ResetButton'
import { formatTime } from '../formatTime'
import { Icon } from './icons'
import { t } from '../../i18n'
import { PageArt } from './MenuArt'
import { TipCard } from '../tips/TipCard'
import { BackButton } from './BackButton'

interface Props {
  progress: Progress
  onReplay?: () => void
  onReset: () => void
  onGoals?: () => void
  onHighlights?: () => void
  onBack: () => void
}

export function Stats({ progress, onReplay, onReset, onGoals, onHighlights, onBack }: Props) {
  const story = useSyncExternalStore(subscribeStory, storySnapshot)
  const mastery = useSyncExternalStore(subscribeMastery, masterySnapshot)
  const ladder = useSyncExternalStore(subscribeLadder, ladderSnapshot)
  const records = useSyncExternalStore(subscribeRecords, recordsSnapshot)
  const { cups } = useSyncExternalStore(subscribeTournaments, tournamentSnapshot)
  const goals = useSyncExternalStore(subscribeRoleGoals, roleGoalsSnapshot)
  const [claimed, setClaimed] = useState<number | null>(null)
  const [goalClaim, setGoalClaim] = useState<GoalClaim | null>(null)
  const goalsDone = ROLE_GOALS.filter((g) => goalDone(g, goals.tally)).length
  const goalsOwed = unclaimedGoals(goals).reduce((n, g) => n + g.shards, 0)
  const tracks = standings(progress, mastery)
  const rank = courtRank(tracks.reduce((n, x) => n + x.level, 0))
  const owed = tracks.reduce((n, x) => n + x.owed, 0)
  const showcase = mastery.showcase.flatMap((id) => ACHIEVEMENTS.filter((a) => a.id === id && progress.achievements.includes(id)))
  const list = sections(progress, story, dailySeed(), cups)
  const done = overall(list)
  const tiles = [...totals(progress), { label: t('stats.timePlayed'), value: formatTime(progress.stats.playSeconds) },
    ...(ladder.games > 0 ? [{ label: t('stats.ladderRating', { rank: rankOf(ladder.rating) }), value: String(ladder.rating) }] : [])]
  const bests = [
    ...(ladder.games > 0 ? [{ label: t('stats.ladderPeak'), value: String(ladder.peak) }] : []),
    ...(progress.daily.best > 0 ? [{ label: t('stats.dailyStreak'), value: t('common.day', { count: progress.daily.best }) }] : []),
    ...(records.bestStreak > 0 ? [{ label: t('stats.winStreak'), value: String(records.bestStreak) }] : []),
    ...(records.fastestWin > 0 ? [{ label: t('stats.fastestWin'), value: t('stats.rounds', { count: records.fastestWin }) }] : []),
    ...(records.flawless > 0 ? [{ label: t('stats.flawless'), value: String(records.flawless) }] : []),
    ...(records.mostTaken > 0 ? [{ label: t('stats.mostTaken'), value: String(records.mostTaken) }] : []),
    ...(progress.gauntlet.best > 0 ? [{ label: t('stats.gauntletStage'), value: String(progress.gauntlet.best) }] : []),
    ...(rushBest() > 0 ? [{ label: t('stats.rushBest'), value: String(rushBest()) }] : []),
  ]
  return (
    <main className="app menu blue-menu">
      <PageArt icon="trophy" />
      <h2>{t('stats.title')}</h2>
      <RankCrest rank={rank} />
      <div className="stat-overall" role="group" aria-label={t('stats.overallLabel')}>
        <strong>{percent(done)}</strong>
        <span>{t('stats.overall')}</span>
        <Bar fraction={done} />
      </div>
      <section className="showcase" aria-label={t('stats.showcase')}>
        <h3>{t('stats.showcase')}</h3>
        {showcase.length === 0
          ? <p className="tagline">{t('stats.showcaseEmpty', { slots: SHOWCASE_SLOTS })}</p>
          : <ul className="achievements">{showcase.map((a) => <li key={a.id} className="got"><strong><Icon name="trophy" />{a.name}</strong><span>{a.text}</span></li>)}</ul>}
      </section>
      <dl className="stat-tiles">
        {tiles.map(({ label, value }) => <div key={label}><dd>{value}</dd><dt>{label}</dt></div>)}
      </dl>
      {bests.length > 0 && (
        <details className="stat-section" open>
          <summary><h3><Icon name="trophy" />{t('stats.bests')}</h3></summary>
          <dl className="stat-rows">{bests.map((b) => <div key={b.label}><dt>{b.label}</dt><dd>{b.value}</dd></div>)}</dl>
        </details>
      )}
      {list.map((section) => (
        <details key={section.id} className="stat-section" open>
          <summary>
            <h3><Icon name={section.icon} />{section.title}</h3>
            {section.fraction !== null && <em>{percent(section.fraction)}</em>}
          </summary>
          {section.fraction !== null && <Bar fraction={section.fraction} />}
          <dl className="stat-rows">
            {section.rows.map((r) => (
              <div key={r.label}>
                <dt>{r.label}</dt>
                <dd>{r.value}</dd>
                {r.fraction !== undefined && <Bar fraction={r.fraction} thin />}
              </div>
            ))}
          </dl>
        </details>
      ))}
      <details className="stat-section" open>
        <summary><h3><Icon name="star" />{t('stats.mastery')}</h3></summary>
        <ul className="mastery-tracks">
          {tracks.map((x) => (
            <li key={x.track.id}>
              <strong>{x.track.title}</strong> {t('stats.level', { level: x.level })}
              <Bar fraction={x.next === null ? 1 : x.points / x.next} thin />
              <small>{x.points}{x.next === null ? '' : t('stats.of', { total: x.next })} {x.track.unit}{x.next === null ? t('stats.topLevel') : t('stats.nextLevel', { level: x.level + 1, shards: levelReward(x.level + 1) })}</small>
            </li>
          ))}
        </ul>
        <button className="primary" disabled={owed === 0} onClick={() => setClaimed(claimMastery(progress))}>
          <Icon name="star" />{owed > 0 ? t('stats.claim', { shards: owed }) : t('stats.noShards')}
        </button>
        {claimed !== null && claimed > 0 && <p className="status" role="status">{t('stats.claimed', { shards: claimed })}</p>}
      </details>
      <details className="stat-section">
        <summary><h3><Icon name="trophy" />{t('stats.pieceGoals', { done: goalsDone, total: ROLE_GOALS.length })}</h3></summary>
        <p className="tagline">{t('stats.pieceGoalsText')}</p>
        {GOAL_ROLES.map((role) => (
          <div key={role} className="role-goals">
            <strong>{GOAL_ROLE_NAMES[role]}</strong> <small>{t('stats.duelsWon', { count: goals.tally[role].wins })}</small>
            <ul className="mastery-tracks">
              {ROLE_GOALS.filter((g) => g.role === role).map((g) => (
                <li key={g.id}>
                  {g.text}
                  <Bar fraction={progressOf(g, goals.tally) / g.target} thin />
                  <small>{t('stats.goalProgress', { done: progressOf(g, goals.tally), target: g.target })}{goals.claimed.includes(g.id) ? t('stats.goalClaimed') : t('stats.goalShards', { shards: g.shards })}</small>
                </li>
              ))}
            </ul>
          </div>
        ))}
        <ul className="mastery-tracks">
          {rewardsFor(ROLE_GOALS.length).map((c) => (
            <li key={`${c.kind}:${c.id}`}><strong>{c.name}</strong> <small>{t('stats.rewardGoals', { count: c.goals ?? 0 })} · {goalsDone >= (c.goals ?? 0) ? t('stats.rewardEarned') : t('stats.rewardToGo', { count: (c.goals ?? 0) - goalsDone })}</small></li>
          ))}
        </ul>
        <button className="primary" disabled={goalsOwed === 0 && rewardsFor(goalsDone).length === 0} onClick={() => setGoalClaim(claimRoleGoals())}>
          <Icon name="star" />{goalsOwed > 0 ? t('stats.claim', { shards: goalsOwed }) : t('stats.nothingToClaim')}
        </button>
        {goalClaim && <p className="status" role="status">{goalClaim.shards > 0 ? `${t('stats.claimed', { shards: goalClaim.shards })} ` : ''}{goalClaim.cosmetics.map((n) => t('stats.earnedItem', { name: n })).join(' ')}</p>}
      </details>
      <h3>{t('stats.achievements', { earned: progress.achievements.length, total: ACHIEVEMENTS.length })}</h3>
      {ACHIEVEMENT_CATEGORIES.map((category) => {
        const list = ACHIEVEMENTS.filter((a) => a.category === category)
        const earned = list.filter((a) => progress.achievements.includes(a.id)).length
        return (
          <details key={category} className="tier-fold">
            <summary><h3>{category} ({earned}/{list.length})</h3></summary>
            <ul className="achievements">
              {list.map((a) => {
                const got = progress.achievements.includes(a.id)
                return (
                  <li key={a.id} className={got ? 'got' : undefined}>
                    <strong><Icon name={got ? 'trophy' : 'lock'} />{a.name}</strong>
                    <span>{a.text}</span>
                    {got && <button className="link" aria-pressed={mastery.showcase.includes(a.id)} onClick={() => togglePin(a.id)}>
                      {mastery.showcase.includes(a.id) ? t('stats.unpin') : mastery.showcase.length >= SHOWCASE_SLOTS ? t('stats.showcaseFull') : t('stats.pin')}
                    </button>}
                  </li>
                )
              })}
            </ul>
          </details>
        )
      })}
      <div className="menu-buttons stacked">
        {onGoals && <button onClick={onGoals}><Icon name="star" />{t('goals.title')}</button>}
        {onHighlights && <button onClick={onHighlights}><Icon name="trophy" />{t('highlights.open')}</button>}
        {onReplay && <button onClick={onReplay}><Icon name="replay" />{t('stats.replayLast')}</button>}
        {progress.last && <ShareButton title={t('stats.replayTitle')} label={t('stats.copyReplay')} link={() => shareLink('r', progress.last!)} />}
        <ResetButton label={t('stats.reset')} warning={t('stats.resetWarning')} onReset={onReset} />
        <BackButton onClick={onBack} />
      </div>
      <TipCard page="stats" />
    </main>
  )
}
