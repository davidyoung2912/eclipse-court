import { PERSONALITIES } from '../../engine/data/personality'
import { seasonalEvent } from '../../engine/data/events'
import { dailyShareText, type DailyMatch } from '../../engine/data/daily'
import { dailyResult, liveStreak, type Progress } from '../../progress'
import { challengeLink } from '../../share'
import { ShareButton } from '../ShareButton'
import { Icon } from './icons'
import { PageArt } from './MenuArt'
import { TipCard } from '../tips/TipCard'
import { BackButton } from './BackButton'
import { stampWeek } from '../../progression'
import { t } from '../../i18n'

interface Props {
  match: DailyMatch
  progress: Progress
  /** Lines about the match just played, such as an achievement. */
  report?: string[]
  onPlay: () => void
  onBack: () => void
}

/** `20261026` as `2026-10-26`. */
const dateLabel = (date: number) => `${Math.floor(date / 10000)}-${String(Math.floor(date / 100) % 100).padStart(2, '0')}-${String(date % 100).padStart(2, '0')}`

/** Today's match: the same board, army, rules and opponent for everyone, with one scored attempt. */
export function Daily({ match, progress, report, onPlay, onBack }: Props) {
  const result = dailyResult(progress, match.date)
  const streak = liveStreak(progress, match.date)
  const event = seasonalEvent()
  const week = stampWeek(match.date, progress.daily.last?.date ?? null, streak)
  return (
    <main className="app menu">
      <PageArt icon="sun" />
      <h2>{t('daily.title')}</h2>
      <p className="tagline">{t('daily.tagline', { date: dateLabel(match.date) })}</p>
      {report && report.length > 0 && (
        <div className="setup-card" role="status">{report.map((line) => <div key={line}>{line}</div>)}</div>
      )}
      <ul className="setup-card">
        <li>{match.blurb}</li>
        {event && <li>{t('daily.event')}<strong>{event.event.name}</strong>. {event.event.text} {t('daily.eventLeft', { days: t('common.day', { count: event.daysLeft }) })}</li>}
        <li>{t('daily.opponent', { name: PERSONALITIES[match.personality].name, difficulty: match.difficulty })}</li>
        <li>{t('daily.court', { court: match.court === 'solari' ? 'Solari' : 'Umbral' })}</li>
      </ul>
      <dl className="stats">
        <div><dt>{t('daily.today')}</dt><dd>{result ? t(result.won ? 'daily.won' : 'daily.lost', { turns: result.turns, lost: result.lost }) : t('common.notPlayed')}</dd></div>
        <div><dt>{t('daily.streak')}</dt><dd>{t('daily.streakValue', { days: t('common.day', { count: streak }), best: progress.daily.best })}</dd></div>
      </dl>
      <ol className="stamp-week" aria-label={t('daily.week')}>
        {week.map((d, i) => (
          <li key={d.date} className={`${d.stamped ? 'stamped' : ''}${d.today ? ' today' : ''}`} style={{ ['--i' as string]: i }}>
            <span>{d.date % 100}</span>
            {d.stamped && <i aria-label={t('daily.stamped')}><Icon name="sun" /></i>}
          </li>
        ))}
      </ol>
      <div className="menu-buttons stacked">
        <button className={result ? undefined : 'primary'} onClick={onPlay}>
          <Icon name="play" />{result ? t('daily.playAgain') : t('daily.play')}
        </button>
        {result && (
          <ShareButton title={t('daily.shareTitle')} label={t('daily.shareLabel')} text={dailyShareText(match, dateLabel(match.date), result.won, result.turns, result.lost)}
            link={() => challengeLink({ config: match.config, side: match.court })} />
        )}
        <BackButton onClick={onBack} />
      </div>
      <TipCard page="daily" />
    </main>
  )
}
