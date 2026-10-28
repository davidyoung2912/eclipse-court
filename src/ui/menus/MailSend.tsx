import { useState } from 'react'
import { replay, type GameRecord } from '../../engine/log'
import { statusOf, type MailGame } from '../../mail'
import { turnLink } from '../../share'
import { ShareButton } from '../ShareButton'
import { Icon } from './icons'
import { PageArt } from './MenuArt'
import { BackButton } from './BackButton'
import { TipCard } from '../tips/TipCard'

interface Props {
  game: MailGame
  record: GameRecord
  onReplay: (record: GameRecord) => void
  onBack: () => void
}

const HEADLINE = {
  theirs: 'Send this link to your opponent',
  won: 'You won. Send the link so they can see it.',
  lost: 'You lost. Send the link back if you like.',
  draw: 'Drawn. Send the link so they can see it.',
  yours: 'It is your move',
} as const

/** The link that carries the game so far, to hand to the other player. */
export function MailSend({ game, record, onReplay, onBack }: Props) {
  const [note, setNote] = useState<string | null>(null)
  const link = turnLink(record)
  const status = statusOf(record, game.me)
  const round = replay(record)?.round ?? 1
  return (
    <main className="app menu battle-menu">
      <PageArt icon="chain" />
      <h2>{HEADLINE[status]}</h2>
      <p className="tagline">
        Round {round}. The link holds the whole game, so there is nothing to upload. They open it, make their move, and send one back.
      </p>
      <textarea className="code-box" rows={5} readOnly value={link} aria-label="Link to send" onFocus={(e) => e.target.select()} />
      <div className="menu-buttons stacked">
        <ShareButton label="Share Link" title="Eclipse Court move" link={() => link} text="My move in Eclipse Court:" />
        <button onClick={async () => {
          try { await navigator.clipboard.writeText(link); setNote('Copied.') } catch { setNote('Could not copy; select the link above.') }
        }}><Icon name="chain" />{note ?? 'Copy Link'}</button>
        <button onClick={() => onReplay(record)}><Icon name="replay" />Watch the Game</button>
        {status === 'yours' && <button className="primary" onClick={onBack}>Back to Games</button>}
        {status !== 'yours' && <BackButton onClick={onBack} label="Back to Games" />}
      </div>
      <TipCard page="mail-send" />
    </main>
  )
}
