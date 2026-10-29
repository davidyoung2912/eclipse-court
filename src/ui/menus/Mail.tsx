import { useState } from 'react'
import { replay, type GameRecord } from '../../engine/log'
import { dropMail, mailGames, putMail, receive, recordOfGame, sameStart, statusOf, type MailGame, type MailStatus, type Receipt } from '../../mail'
import { parseShared } from '../../share'
import { Icon } from './icons'
import { PageArt } from './MenuArt'
import { BackButton } from './BackButton'
import { TipCard } from '../tips/TipCard'
import { t, type StringKey } from '../../i18n'

interface Props {
  /** A move that arrived by link, waiting to be accepted. */
  incoming?: GameRecord
  onNew: () => void
  /** Opens a game where it is your move. */
  onPlay: (game: MailGame) => void
  /** Shows the link to send, when it is their move or the game is over. */
  onSend: (game: MailGame) => void
  onReplay: (record: GameRecord) => void
  onBack: () => void
}

const STATUS_TEXT: Record<MailStatus, StringKey> = {
  yours: 'mail.yours',
  theirs: 'mail.theirs',
  won: 'mail.won',
  lost: 'mail.lost',
  draw: 'mail.draw',
}

const COURT_NAME = { solari: 'court.solari', umbral: 'court.umbral' } as const satisfies Record<string, StringKey>

const NOTE: Record<Exclude<Receipt['kind'], 'new' | 'update'>, StringKey> = {
  over: 'mail.noteOver',
  known: 'mail.noteKnown',
  clash: 'mail.noteClash',
}

/** Games passed back and forth by link: the list, a way to start one, and where a pasted move is accepted. */
export function Mail({ incoming: arrived, onNew, onPlay, onSend, onReplay, onBack }: Props) {
  const [incoming, setIncoming] = useState(arrived ?? null)
  const [text, setText] = useState('')
  const [error, setError] = useState(false)
  const [, refresh] = useState(0)
  const games = mailGames()

  const accept = (record: GameRecord, me: MailGame['me']) => {
    const game = putMail(record, me)
    setIncoming(null)
    if (statusOf(record, me) === 'yours') onPlay(game)
    else onSend(game)
  }

  const held = incoming && games.find((g) => {
    const record = recordOfGame(g)
    return record && sameStart(record, incoming)
  })
  const receipt = incoming && receive((held && recordOfGame(held)) || null, incoming)

  return (
    <main className="app menu battle-menu">
      <PageArt icon="chain" />
      <h2>{t('mail.title')}</h2>
      <p className="tagline">{t('mail.tagline')}</p>
      {incoming && receipt && (
        <div className="setup-card" role="status">
          <strong>{t('mail.arrived')}</strong>
          {receipt.kind === 'new' ? <p>{t('mail.newGame', { court: t(COURT_NAME[receipt.me]) })}</p>
            : receipt.kind === 'update' ? <p>{t('mail.updated')}</p>
            : <p>{t(NOTE[receipt.kind])}</p>}
          <div className="menu-buttons">
            {receipt.kind === 'new' && <button className="primary" onClick={() => accept(incoming, receipt.me)}><Icon name="play" />{t('mail.play')}</button>}
            {receipt.kind === 'update' && held && <button className="primary" onClick={() => accept(incoming, held.me)}><Icon name="play" />{t('mail.open')}</button>}
            {(receipt.kind === 'clash' || receipt.kind === 'over') && <button onClick={() => onReplay(incoming)}><Icon name="replay" />{t('mail.watchIt')}</button>}
            <button onClick={() => setIncoming(null)}>{t('mail.dismiss')}</button>
          </div>
        </div>
      )}
      <div className="menu-buttons stacked">
        <button className="primary" onClick={onNew}><Icon name="plus" />{t('mail.new')}</button>
      </div>
      <h3>{t('mail.yourGames')}</h3>
      {games.length === 0 && <p className="tagline">{t('mail.none')}</p>}
      <ul className="setup-card">
        {games.map((game) => {
          const record = recordOfGame(game)
          if (!record) return (
            <li key={game.id}>{t('mail.otherVersion')} <button onClick={() => { dropMail(game.id); refresh((n) => n + 1) }}>{t('mail.remove')}</button></li>
          )
          const status = statusOf(record, game.me)
          const round = replay(record)?.round ?? 1
          return (
            <li key={game.id}>
              <strong>{t(COURT_NAME[game.me])}</strong> · {t('mail.round', { round })} · {t(STATUS_TEXT[status])}{' '}
              <button className={status === 'yours' ? 'primary' : undefined} onClick={() => (status === 'yours' ? onPlay(game) : onSend(game))}>
                {status === 'yours' ? t('mail.play') : status === 'theirs' ? t('mail.link') : t('mail.open')}
              </button>{' '}
              <button onClick={() => { dropMail(game.id); refresh((n) => n + 1) }}>{t('mail.remove')}</button>
            </li>
          )
        })}
      </ul>
      <h3>{t('mail.paste')}</h3>
      <textarea className="code-box" rows={4} value={text} spellCheck={false} aria-label={t('mail.pasteLabel')}
        onChange={(e) => { setText(e.target.value); setError(false) }} />
      {error && <p role="alert">{t('mail.invalid')}</p>}
      <div className="menu-buttons stacked">
        <button disabled={!text.trim()} onClick={() => {
          const shared = parseShared(text)
          if (shared && shared.kind !== 'challenge' && shared.kind !== 'ghost' && shared.kind !== 'pack') { setIncoming(shared.record); setText('') }
          else setError(true)
        }}><Icon name="chain" />{t('mail.openMove')}</button>
        <BackButton onClick={onBack} />
      </div>
      <TipCard page="mail" />
    </main>
  )
}
