import { useState } from 'react'
import { DIFFICULTY_LIST, type Difficulty } from '../../ai/profile'
import type { Challenge as ChallengeCode } from '../../engine/challenge'
import { describeConfig } from '../../share'
import type { Court } from '../../engine/rules/types'
import { PieceArt } from '../../art/PieceArt'
import { Icon } from './icons'

interface Props {
  challenge: ChallengeCode
  onPlay: (human: Court, difficulty: Difficulty, hotSeat: boolean) => void
  onBack: () => void
}

/** A match someone sent: its rules, a court to take, and whether to face the AI or a friend. */
export function Challenge({ challenge, onPlay, onBack }: Props) {
  const [court, setCourt] = useState<Court>(challenge.side)
  return (
    <main className="app menu">
      <h2>Challenge</h2>
      <p className="tagline">Someone sent you this match. Every game from this link begins from the same position.</p>
      <ul className="setup-card">
        {describeConfig(challenge).map((line) => <li key={line}>{line}</li>)}
      </ul>
      <h3>Your court</h3>
      <div className="choices">
        {(['solari', 'umbral'] as const).map((c) => (
          <button key={c} className={`choice ${c}${court === c ? ' on' : ''}`} onClick={() => setCourt(c)}>
            <svg className="avatar" viewBox="-0.45 -0.45 0.9 0.9" aria-hidden="true"><PieceArt role="leader" court={c} /></svg>
            <strong><Icon name={c === 'solari' ? 'sun' : 'moon'} />{c === 'solari' ? 'Solari' : 'Umbral'}</strong>
          </button>
        ))}
      </div>
      <h3>Play</h3>
      <div className="menu-buttons stacked">
        {DIFFICULTY_LIST.map((d) => (
          <button key={d} className={d === 'normal' ? 'primary' : undefined} onClick={() => onPlay(court, d, false)}>
            <Icon name="swords" />Against the AI: {d}
          </button>
        ))}
        <button onClick={() => onPlay(court, 'normal', true)}><Icon name="banner" />With a friend on this device</button>
        <button onClick={onBack}><Icon name="back" />Back</button>
      </div>
    </main>
  )
}
