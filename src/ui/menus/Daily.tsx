import { PERSONALITIES } from '../../engine/data/personality'
import { dailyShareText, type DailyMatch } from '../../engine/data/daily'
import { dailyResult, liveStreak, type Progress } from '../../progress'
import { challengeLink } from '../../share'
import { ShareButton } from '../ShareButton'
import { Icon } from './icons'
import { PageArt } from './MenuArt'
import { TipCard } from '../tips/TipCard'
import { BackButton } from './BackButton'

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
  return (
    <main className="app menu">
      <PageArt icon="sun" />
      <h2>Daily Match</h2>
      <p className="tagline">{dateLabel(match.date)}. The same game for everyone today; your first finished attempt is the one that counts.</p>
      {report && report.length > 0 && (
        <div className="setup-card" role="status">{report.map((line) => <div key={line}>{line}</div>)}</div>
      )}
      <ul className="setup-card">
        <li>{match.blurb}</li>
        <li>Opponent: {PERSONALITIES[match.personality].name}, {match.difficulty}</li>
        <li>You play the {match.court === 'solari' ? 'Solari' : 'Umbral'} court today.</li>
      </ul>
      <dl className="stats">
        <div><dt>Today</dt><dd>{result ? `${result.won ? 'Won' : 'Lost'}, ${result.turns} rounds, ${result.lost} lost` : 'Not played'}</dd></div>
        <div><dt>Streak</dt><dd>{streak} {streak === 1 ? 'day' : 'days'} (best {progress.daily.best})</dd></div>
      </dl>
      <div className="menu-buttons stacked">
        <button className={result ? undefined : 'primary'} onClick={onPlay}>
          <Icon name="play" />{result ? 'Play Again (Not Scored)' : 'Play Today’s Match'}
        </button>
        {result && (
          <ShareButton title="Eclipse Court daily" label="Share Result" text={dailyShareText(match, dateLabel(match.date), result.won, result.turns, result.lost)}
            link={() => challengeLink({ config: match.config, side: match.court })} />
        )}
        <BackButton onClick={onBack} />
      </div>
      <TipCard page="daily" />
    </main>
  )
}
