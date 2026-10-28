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
import { t } from '../../i18n'

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
      <h2>{t('weekly.title')}</h2>
      <p className="tagline">{t('weekly.tagline', { date: dateLabel(match.week) })}</p>
      {report && report.length > 0 && (
        <div className="setup-card" role="status">{report.map((line) => <div key={line}>{line}</div>)}</div>
      )}
      <ul className="setup-card">
        <li><strong>{match.modifier.name}</strong>: {match.modifier.text}</li>
        {match.event && <li>{t('weekly.event')}<strong>{match.event.name}</strong>. {match.event.text} {t('weekly.eventTail')}</li>}
        <li>{t('weekly.opponent', { name: PERSONALITIES[match.personality].name, difficulty: match.difficulty })}</li>
        <li>{t('weekly.court', { days: t('common.day', { count: left }) })}</li>
        <li>{t('weekly.shards', { win: SHARDS_WEEKLY_WIN, best: SHARDS_WEEKLY_BEST })}</li>
      </ul>
      <dl className="stats">
        <div><dt>{t('weekly.bestWeek')}</dt><dd>{week.attempts ? t('weekly.points', { count: week.best }) : t('common.notPlayed')}</dd></div>
        <div><dt>{t('weekly.attempts')}</dt><dd>{week.attempts}</dd></div>
        <div><dt>{t('weekly.weeksWon')}</dt><dd>{store.weeksWon}</dd></div>
        {past.length > 0 && <div><dt>{t('weekly.earlier')}</dt><dd>{past.map((h) => `${dateLabel(h.week).slice(5)}: ${h.best}`).join(' · ')}</dd></div>}
      </dl>
      <div className="menu-buttons stacked">
        <button className={week.attempts ? undefined : 'primary'} onClick={onPlay}>
          <Icon name="play" />{week.attempts ? t('weekly.retry') : t('weekly.play')}
        </button>
        {week.attempts > 0 && (
          <ShareButton title={t('weekly.shareTitle')} label={t('weekly.shareLabel')}
            text={t('weekly.shareText', { date: dateLabel(match.week), name: match.modifier.name, best: week.best })}
            link={() => challengeLink({ config: match.config, side: WEEKLY_COURT })} />
        )}
        <BackButton onClick={onBack} />
      </div>
      <TipCard page="weekly" />
    </main>
  )
}
