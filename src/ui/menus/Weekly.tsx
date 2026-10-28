import { useSyncExternalStore } from 'react'
import { PERSONALITIES } from '../../engine/data/personality'
import { daysLeftInWeek, WEEKLY_COURT, type WeeklyMatch } from '../../engine/data/weekly'
import { forWeek, SHARDS_WEEKLY_BEST, SHARDS_WEEKLY_WIN, subscribeWeekly, weeklySnapshot } from '../../weekly'
import { challengeLink } from '../../share'
import { ShareButton } from '../ShareButton'
import { Icon } from './icons'
import { PageArt } from './MenuArt'
import { BackButton } from './BackButton'
import { TipCard } from '../tips/TipCard'

interface Props {
  match: WeeklyMatch
  /** Lines about the match just played. */
  report?: string[]
  onPlay: () => void
  onBack: () => void
}

/** `20261026` as `2026-10-26`. */
const dateLabel = (date: number) => `${Math.floor(date / 10000)}-${String(Math.floor(date / 100) % 100).padStart(2, '0')}-${String(date % 100).padStart(2, '0')}`

/** This week's challenge: one rule twist for everyone, with the best score on this device. */
export function Weekly({ match, report, onPlay, onBack }: Props) {
  const store = useSyncExternalStore(subscribeWeekly, weeklySnapshot)
  const week = forWeek(store, match.week)
  const left = daysLeftInWeek()
  const past = store.history.filter((h) => h.week !== match.week).slice().reverse()
  return (
    <main className="app menu">
      <PageArt icon="cycle" />
      <h2>Weekly Challenge</h2>
      <p className="tagline">Week of {dateLabel(match.week)}. The same twist for everyone; play as often as you like, your best score stands.</p>
      {report && report.length > 0 && (
        <div className="setup-card" role="status">{report.map((line) => <div key={line}>{line}</div>)}</div>
      )}
      <ul className="setup-card">
        <li><strong>{match.modifier.name}</strong>: {match.modifier.text}</li>
        {match.event && <li>Seasonal event: <strong>{match.event.name}</strong>. {match.event.text} Adds to the Shard multiplier.</li>}
        <li>Opponent: {PERSONALITIES[match.personality].name}, {match.difficulty}</li>
        <li>You play the Solari court. A new challenge in {left} {left === 1 ? 'day' : 'days'}.</li>
        <li>Shards: {SHARDS_WEEKLY_WIN} for the week’s first win, {SHARDS_WEEKLY_BEST} for each better winning score after.</li>
      </ul>
      <dl className="stats">
        <div><dt>Best this week</dt><dd>{week.attempts ? `${week.best} points` : 'Not played'}</dd></div>
        <div><dt>Attempts</dt><dd>{week.attempts}</dd></div>
        <div><dt>Weeks won</dt><dd>{store.weeksWon}</dd></div>
        {past.length > 0 && <div><dt>Earlier weeks</dt><dd>{past.map((h) => `${dateLabel(h.week).slice(5)}: ${h.best}`).join(' · ')}</dd></div>}
      </dl>
      <div className="menu-buttons stacked">
        <button className={week.attempts ? undefined : 'primary'} onClick={onPlay}>
          <Icon name="play" />{week.attempts ? 'Try for a Better Score' : 'Play This Week’s Match'}
        </button>
        {week.attempts > 0 && (
          <ShareButton title="Eclipse Court weekly" label="Share Challenge"
            text={`Eclipse Court weekly ${dateLabel(match.week)}, ${match.modifier.name}: ${week.best} points.`}
            link={() => challengeLink({ config: match.config, side: WEEKLY_COURT })} />
        )}
        <BackButton onClick={onBack} />
      </div>
      <TipCard page="weekly" />
    </main>
  )
}
