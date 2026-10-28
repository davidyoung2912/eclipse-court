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
import { PageArt } from './MenuArt'
import { TipCard } from '../tips/TipCard'
import { BackButton } from './BackButton'

interface Props {
  progress: Progress
  onReplay?: () => void
  onReset: () => void
  onBack: () => void
}

export function Stats({ progress, onReplay, onReset, onBack }: Props) {
  const story = useSyncExternalStore(subscribeStory, storySnapshot)
  const mastery = useSyncExternalStore(subscribeMastery, masterySnapshot)
  const ladder = useSyncExternalStore(subscribeLadder, ladderSnapshot)
  const records = useSyncExternalStore(subscribeRecords, recordsSnapshot)
  const goals = useSyncExternalStore(subscribeRoleGoals, roleGoalsSnapshot)
  const [claimed, setClaimed] = useState<number | null>(null)
  const [goalClaim, setGoalClaim] = useState<GoalClaim | null>(null)
  const goalsDone = ROLE_GOALS.filter((g) => goalDone(g, goals.tally)).length
  const goalsOwed = unclaimedGoals(goals).reduce((n, g) => n + g.shards, 0)
  const tracks = standings(progress, mastery)
  const rank = courtRank(tracks.reduce((n, x) => n + x.level, 0))
  const owed = tracks.reduce((n, t) => n + t.owed, 0)
  const showcase = mastery.showcase.flatMap((id) => ACHIEVEMENTS.filter((a) => a.id === id && progress.achievements.includes(id)))
  const list = sections(progress, story, dailySeed())
  const done = overall(list)
  const tiles = [...totals(progress), { label: 'Total time played', value: formatTime(progress.stats.playSeconds) },
    ...(ladder.games > 0 ? [{ label: `Ladder rating (${rankOf(ladder.rating)})`, value: String(ladder.rating) }] : [])]
  const bests = [
    ...(ladder.games > 0 ? [{ label: 'Ladder peak', value: String(ladder.peak) }] : []),
    ...(progress.daily.best > 0 ? [{ label: 'Longest daily streak', value: `${progress.daily.best} days` }] : []),
    ...(records.bestStreak > 0 ? [{ label: 'Longest win streak', value: String(records.bestStreak) }] : []),
    ...(records.fastestWin > 0 ? [{ label: 'Fastest win', value: `${records.fastestWin} rounds` }] : []),
    ...(records.flawless > 0 ? [{ label: 'Flawless wins', value: String(records.flawless) }] : []),
    ...(records.mostTaken > 0 ? [{ label: 'Most pieces taken in a game', value: String(records.mostTaken) }] : []),
    ...(progress.gauntlet.best > 0 ? [{ label: 'Furthest gauntlet stage', value: String(progress.gauntlet.best) }] : []),
    ...(rushBest() > 0 ? [{ label: 'Puzzle Rush best', value: String(rushBest()) }] : []),
  ]
  return (
    <main className="app menu blue-menu">
      <PageArt icon="trophy" />
      <h2>Stats</h2>
      <RankCrest rank={rank} />
      <div className="stat-overall" role="group" aria-label="Overall completion">
        <strong>{percent(done)}</strong>
        <span>complete across the campaign, scenarios, puzzles, gauntlet, story and achievements</span>
        <Bar fraction={done} />
      </div>
      <section className="showcase" aria-label="Showcase">
        <h3>Showcase</h3>
        {showcase.length === 0
          ? <p className="tagline">Pin up to {SHOWCASE_SLOTS} earned achievements below to show them here.</p>
          : <ul className="achievements">{showcase.map((a) => <li key={a.id} className="got"><strong><Icon name="trophy" />{a.name}</strong><span>{a.text}</span></li>)}</ul>}
      </section>
      <dl className="stat-tiles">
        {tiles.map(({ label, value }) => <div key={label}><dd>{value}</dd><dt>{label}</dt></div>)}
      </dl>
      {bests.length > 0 && (
        <details className="stat-section" open>
          <summary><h3><Icon name="trophy" />Personal bests</h3></summary>
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
        <summary><h3><Icon name="star" />Mastery</h3></summary>
        <ul className="mastery-tracks">
          {tracks.map((t) => (
            <li key={t.track.id}>
              <strong>{t.track.title}</strong> level {t.level}
              <Bar fraction={t.next === null ? 1 : t.points / t.next} thin />
              <small>{t.points}{t.next === null ? '' : ` of ${t.next}`} {t.track.unit}{t.next === null ? ' · top level' : ` · level ${t.level + 1} pays ${levelReward(t.level + 1)} Shards`}</small>
            </li>
          ))}
        </ul>
        <button className="primary" disabled={owed === 0} onClick={() => setClaimed(claimMastery(progress))}>
          <Icon name="star" />{owed > 0 ? `Claim ${owed} Shards` : 'No Shards to claim'}
        </button>
        {claimed !== null && claimed > 0 && <p className="status" role="status">Shards: +{claimed}.</p>}
      </details>
      <details className="stat-section">
        <summary><h3><Icon name="trophy" />Piece goals ({goalsDone}/{ROLE_GOALS.length})</h3></summary>
        <p className="tagline">Duels your pieces win, counted by role and by the light on the square. Completed goals pay Shards; finishing enough of them earns cosmetics.</p>
        {GOAL_ROLES.map((role) => (
          <div key={role} className="role-goals">
            <strong>{GOAL_ROLE_NAMES[role]}</strong> <small>{goals.tally[role].wins} duels won</small>
            <ul className="mastery-tracks">
              {ROLE_GOALS.filter((g) => g.role === role).map((g) => (
                <li key={g.id}>
                  {g.text}
                  <Bar fraction={progressOf(g, goals.tally) / g.target} thin />
                  <small>{progressOf(g, goals.tally)} of {g.target} · {goals.claimed.includes(g.id) ? 'claimed' : `${g.shards} Shards`}</small>
                </li>
              ))}
            </ul>
          </div>
        ))}
        <ul className="mastery-tracks">
          {rewardsFor(ROLE_GOALS.length).map((c) => (
            <li key={`${c.kind}:${c.id}`}><strong>{c.name}</strong> <small>{c.goals} goals · {goalsDone >= (c.goals ?? 0) ? 'earned' : `${(c.goals ?? 0) - goalsDone} to go`}</small></li>
          ))}
        </ul>
        <button className="primary" disabled={goalsOwed === 0 && rewardsFor(goalsDone).length === 0} onClick={() => setGoalClaim(claimRoleGoals())}>
          <Icon name="star" />{goalsOwed > 0 ? `Claim ${goalsOwed} Shards` : 'Nothing to claim'}
        </button>
        {goalClaim && <p className="status" role="status">{goalClaim.shards > 0 ? `Shards: +${goalClaim.shards}. ` : ''}{goalClaim.cosmetics.map((n) => `Earned ${n}.`).join(' ')}</p>}
      </details>
      <h3>Achievements ({progress.achievements.length} of {ACHIEVEMENTS.length})</h3>
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
                      {mastery.showcase.includes(a.id) ? 'Unpin' : mastery.showcase.length >= SHOWCASE_SLOTS ? 'Showcase full' : 'Pin'}
                    </button>}
                  </li>
                )
              })}
            </ul>
          </details>
        )
      })}
      <div className="menu-buttons stacked">
        {onReplay && <button onClick={onReplay}><Icon name="replay" />Replay Last Game</button>}
        {progress.last && <ShareButton title="Eclipse Court replay" label="Copy Replay Link" link={() => shareLink('r', progress.last!)} />}
        <ResetButton label="Reset Stats" warning="Clear every stat, the Gauntlet record, achievements and the last replay? Campaign, puzzle and scenario progress is kept." onReset={onReset} />
        <BackButton onClick={onBack} />
      </div>
      <TipCard page="stats" />
    </main>
  )
}
