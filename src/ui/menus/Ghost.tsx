import { useSyncExternalStore } from 'react'
import { PERSONALITIES } from '../../engine/data/personality'
import { dailySeed } from '../../engine/data/setups'
import { weekStart } from '../../engine/data/weekly'
import { ghostMatch, ghostScore, type Ghost as GhostResult } from '../../engine/ghost'
import { dailyResult, type Progress } from '../../progress'
import { forWeek, subscribeWeekly, weeklySnapshot } from '../../weekly'
import { Icon } from './icons'
import { PageArt } from './MenuArt'
import { BackButton } from './BackButton'
import { t } from '../../i18n'

interface Props {
  ghost: GhostResult
  progress: Progress
  /** Lines about the game just played against the ghost. */
  report?: string[]
  /** Plays the ghost's match; unscored. */
  onPlay: () => void
  /** The ghost is the current day's or week's match: the scored one is on its own screen. */
  onPlayScored: () => void
  onWatch: () => void
  onBack: () => void
}

/** `20261026` as `2026-10-26`. */
const dateLabel = (date: number) => `${Math.floor(date / 10000)}-${String(Math.floor(date / 100) % 100).padStart(2, '0')}-${String(date % 100).padStart(2, '0')}`

const line = (r: Pick<GhostResult, 'won' | 'draw' | 'turns' | 'lost'>) =>
  t(r.won ? 'ghost.won' : r.draw ? 'ghost.drew' : 'ghost.lost', { turns: r.turns, lost: r.lost, points: ghostScore(r) })

/** A friend's daily or weekly result beside yours, with the same match to play. */
export function Ghost({ ghost, progress, report, onPlay, onPlayScored, onWatch, onBack }: Props) {
  const store = useSyncExternalStore(subscribeWeekly, weeklySnapshot)
  const match = ghostMatch(ghost)
  if (!match) return null
  const current = ghost.kind === 'daily' ? ghost.id === dailySeed() : ghost.id === weekStart()
  const day = ghost.kind === 'daily' ? dailyResult(progress, ghost.id) : null
  const week = ghost.kind === 'weekly' ? forWeek(store, ghost.id) : null
  const mine = day ? { won: day.won, draw: false, turns: day.turns, lost: day.lost }
    : week && week.attempts > 0 ? week.best : null
  return (
    <main className="app menu">
      <PageArt icon="swords" />
      <h2>{t('ghost.title')}</h2>
      <p className="tagline">{t('ghost.tagline', { kind: t(`ghost.${ghost.kind}`) })}</p>
      {report && report.length > 0 && (
        <div className="setup-card" role="status">{report.map((l) => <div key={l}>{l}</div>)}</div>
      )}
      <ul className="setup-card">
        <li>{t('ghost.when', { kind: t(`ghost.${ghost.kind}`), date: dateLabel(ghost.id) })}</li>
        <li>{match.blurb}</li>
        <li>{t('daily.opponent', { name: PERSONALITIES[match.personality].name, difficulty: match.difficulty })}</li>
      </ul>
      <dl className="stats">
        <div><dt>{t('ghost.theirs')}</dt><dd>{line(ghost)}</dd></div>
        <div><dt>{t('ghost.yours')}</dt><dd>{
          mine === null ? t('ghost.notPlayed')
            : typeof mine === 'number' ? t('weekly.points', { count: mine })
              : line(mine)
        }</dd></div>
      </dl>
      <div className="menu-buttons stacked">
        {current && <button className="primary" onClick={onPlayScored}><Icon name="play" />{t('ghost.playToday')}</button>}
        <button className={current ? undefined : 'primary'} onClick={onPlay}><Icon name="play" />{t(current ? 'ghost.practice' : 'ghost.play')}</button>
        {ghost.record && <button onClick={onWatch}><Icon name="replay" />{t('ghost.watch')}</button>}
        <BackButton onClick={onBack} />
      </div>
      <p className="tagline">{t('ghost.practiceNote')}</p>
    </main>
  )
}
