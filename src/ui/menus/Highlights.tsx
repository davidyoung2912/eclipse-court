import { useSyncExternalStore } from 'react'
import { WEEK_DAYS } from '../../engine/data/highlights'
import { dailySeed } from '../../engine/data/setups'
import { currentGameOfTheWeek, highlightsSnapshot, subscribeHighlights } from '../../highlights'
import { decodeRecord } from '../../engine/serialize'
import { t } from '../../i18n'
import { replayLink } from '../../share'
import { ShareButton } from '../ShareButton'
import { BackButton } from './BackButton'
import { Icon } from './icons'
import { PageArt } from './MenuArt'
import type { GameRecord } from '../../engine/log'

interface Props {
  onWatch: (record: GameRecord) => void
  onBack: () => void
}

/** `20261026` as `2026-10-26`. */
const dateLabel = (date: number) => `${Math.floor(date / 10000)}-${String(Math.floor(date / 100) % 100).padStart(2, '0')}-${String(date % 100).padStart(2, '0')}`

/** The most dramatic game finished in the last seven days, with a way to watch it and send it on. */
export function Highlights({ onWatch, onBack }: Props) {
  useSyncExternalStore(subscribeHighlights, highlightsSnapshot)
  const game = currentGameOfTheWeek(dailySeed())
  const record = game ? decodeRecord(game.code) : null
  return (
    <main className="app menu blue-menu">
      <PageArt icon="trophy" />
      <h2>{t('highlights.title')}</h2>
      <p className="lede">{t('highlights.intro', { days: WEEK_DAYS })}</p>
      {game && record ? (
        <>
          <p className="status">{t('highlights.when', { date: dateLabel(game.day) })} · {t(game.facts.won ? 'highlights.won' : 'highlights.notWon')}</p>
          <ul className="tagline">
            <li>{t('highlights.captures', { count: game.facts.captures })}</li>
            <li>{t('highlights.rounds', { count: game.facts.turns })}</li>
            {game.facts.leadChanges > 0 && <li>{t('highlights.swings', { count: game.facts.leadChanges })}</li>}
            {game.facts.moments > 0 && <li>{t('highlights.moments', { count: game.facts.moments })}</li>}
            {game.facts.margin <= 1 && <li>{t('highlights.close')}</li>}
          </ul>
          <div className="menu-buttons stacked">
            <button className="primary" onClick={() => onWatch(record)}><Icon name="play" />{t('highlights.watch')}</button>
            <ShareButton label={t('highlights.share')} title={t('highlights.shareTitle')} text={t('highlights.shareText', { date: dateLabel(game.day) })} link={() => replayLink(record)} />
          </div>
        </>
      ) : (
        <p className="tagline">{t('highlights.empty')}</p>
      )}
      <div className="menu-buttons stacked"><BackButton onClick={onBack} /></div>
    </main>
  )
}
