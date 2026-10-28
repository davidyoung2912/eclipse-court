import { useState } from 'react'
import { replay, type GameRecord } from '../../engine/log'
import { dropMail, mailGames, putMail, receive, recordOfGame, sameStart, statusOf, type MailGame, type MailStatus, type Receipt } from '../../mail'
import { parseShared } from '../../share'
import { Icon } from './icons'
import { PageArt } from './MenuArt'
import { BackButton } from './BackButton'

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

const STATUS_TEXT: Record<MailStatus, string> = {
  yours: 'Your move',
  theirs: 'Waiting for them',
  won: 'You won',
  lost: 'You lost',
  draw: 'Drawn',
}

const COURT_NAME = { solari: 'Solari', umbral: 'Umbral' } as const

const NOTE: Record<Exclude<Receipt['kind'], 'new' | 'update'>, string> = {
  over: 'That game is already over. You can watch it, but there is nothing left to play.',
  known: 'You already have this move. Send your own move, or wait for theirs.',
  clash: 'That link does not continue the game you hold. It may belong to a different game, or one of you went back and played another move.',
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
    <main className="app menu">
      <PageArt icon="chain" />
      <h2>Play by Link</h2>
      <p className="tagline">No connection needed. Make a move, send your friend the link, and wait for the link that comes back.</p>
      {incoming && receipt && (
        <div className="setup-card" role="status">
          <strong>A move arrived</strong>
          {receipt.kind === 'new' ? <p>A new game, and it is your move as {COURT_NAME[receipt.me]}.</p>
            : receipt.kind === 'update' ? <p>Your opponent has moved in a game you hold.</p>
            : <p>{NOTE[receipt.kind]}</p>}
          <div className="menu-buttons">
            {receipt.kind === 'new' && <button className="primary" onClick={() => accept(incoming, receipt.me)}><Icon name="play" />Play</button>}
            {receipt.kind === 'update' && held && <button className="primary" onClick={() => accept(incoming, held.me)}><Icon name="play" />Open</button>}
            {(receipt.kind === 'clash' || receipt.kind === 'over') && <button onClick={() => onReplay(incoming)}><Icon name="replay" />Watch It</button>}
            <button onClick={() => setIncoming(null)}>Dismiss</button>
          </div>
        </div>
      )}
      <div className="menu-buttons stacked">
        <button className="primary" onClick={onNew}><Icon name="plus" />New Game</button>
      </div>
      <h3>Your games</h3>
      {games.length === 0 && <p className="tagline">No games yet. Start one, or paste a move below.</p>}
      <ul className="setup-card">
        {games.map((game) => {
          const record = recordOfGame(game)
          if (!record) return (
            <li key={game.id}>A game from another version of Eclipse Court. <button onClick={() => { dropMail(game.id); refresh((n) => n + 1) }}>Remove</button></li>
          )
          const status = statusOf(record, game.me)
          const round = replay(record)?.round ?? 1
          return (
            <li key={game.id}>
              <strong>{COURT_NAME[game.me]}</strong> · round {round} · {STATUS_TEXT[status]}{' '}
              <button className={status === 'yours' ? 'primary' : undefined} onClick={() => (status === 'yours' ? onPlay(game) : onSend(game))}>
                {status === 'yours' ? 'Play' : status === 'theirs' ? 'Link' : 'Open'}
              </button>{' '}
              <button onClick={() => { dropMail(game.id); refresh((n) => n + 1) }}>Remove</button>
            </li>
          )
        })}
      </ul>
      <h3>Paste a move</h3>
      <textarea className="code-box" rows={4} value={text} spellCheck={false} aria-label="Link or code from your opponent"
        onChange={(e) => { setText(e.target.value); setError(false) }} />
      {error && <p role="alert">That is not a valid move link for this version of the game.</p>}
      <div className="menu-buttons stacked">
        <button disabled={!text.trim()} onClick={() => {
          const shared = parseShared(text)
          if (shared && shared.kind !== 'challenge') { setIncoming(shared.record); setText('') }
          else setError(true)
        }}><Icon name="chain" />Open Move</button>
        <BackButton onClick={onBack} />
      </div>
    </main>
  )
}
