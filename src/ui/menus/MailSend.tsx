import { useState } from 'react'
import { replay, type GameRecord } from '../../engine/log'
import { statusOf, type MailGame } from '../../mail'
import { turnLink } from '../../share'
import { ShareButton } from '../ShareButton'
import { Icon } from './icons'
import { PageArt } from './MenuArt'
import { BackButton } from './BackButton'
import { TipCard } from '../tips/TipCard'
import { t, type StringKey } from '../../i18n'

interface Props {
  game: MailGame
  record: GameRecord
  onReplay: (record: GameRecord) => void
  onBack: () => void
}

const HEADLINE = {
  theirs: 'mailSend.theirs',
  won: 'mailSend.won',
  lost: 'mailSend.lost',
  draw: 'mailSend.draw',
  yours: 'mailSend.yours',
} as const satisfies Record<string, StringKey>

/** The link that carries the game so far, to hand to the other player. */
export function MailSend({ game, record, onReplay, onBack }: Props) {
  const [note, setNote] = useState<string | null>(null)
  const link = turnLink(record)
  const status = statusOf(record, game.me)
  const round = replay(record)?.round ?? 1
  return (
    <main className="app menu battle-menu">
      <PageArt icon="chain" />
      <h2>{t(HEADLINE[status])}</h2>
      <p className="tagline">
        {t('mailSend.tagline', { round })}
      </p>
      <textarea className="code-box" rows={5} readOnly value={link} aria-label={t('mailSend.linkLabel')} onFocus={(e) => e.target.select()} />
      <div className="menu-buttons stacked">
        <ShareButton label={t('mailSend.share')} title={t('mailSend.shareTitle')} link={() => link} text={t('mailSend.shareText')} />
        <button onClick={async () => {
          try { await navigator.clipboard.writeText(link); setNote(t('mailSend.copied')) } catch { setNote(t('mailSend.copyFailed')) }
        }}><Icon name="chain" />{note ?? t('mailSend.copy')}</button>
        <button onClick={() => onReplay(record)}><Icon name="replay" />{t('mailSend.watch')}</button>
        {status === 'yours' && <button className="primary" onClick={onBack}>{t('mailSend.backToGames')}</button>}
        {status !== 'yours' && <BackButton onClick={onBack} label={t('mailSend.backToGames')} />}
      </div>
      <TipCard page="mail-send" />
    </main>
  )
}
