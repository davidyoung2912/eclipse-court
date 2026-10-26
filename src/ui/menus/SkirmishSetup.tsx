import { useState } from 'react'
import { DIFFICULTY_LIST, type Difficulty } from '../../ai/profile'
import type { Court } from '../../engine/rules/types'

interface Props {
  onStart: (human: Court, difficulty: Difficulty) => void
  onBack: () => void
}

const COURTS: { court: Court; name: string; text: string }[] = [
  { court: 'solari', name: 'Solari', text: 'Straight shots and dashes. Moves first.' },
  { court: 'umbral', name: 'Umbral', text: 'Lobbed shots and regeneration. Moves second.' },
]

const LEVEL_TEXT: Record<Difficulty, string> = {
  easy: 'Slow to react, poor aim, rarely dodges.',
  normal: 'Fair reactions and a two-move lookahead.',
  hard: 'Quick, accurate, and plans three moves ahead.',
}

export function SkirmishSetup({ onStart, onBack }: Props) {
  const [court, setCourt] = useState<Court>('solari')
  const [difficulty, setDifficulty] = useState<Difficulty>('normal')
  return (
    <main className="app menu">
      <h2>Skirmish</h2>
      <h3>Your court</h3>
      <div className="choices">
        {COURTS.map((c) => (
          <button key={c.court} className={`choice ${c.court}${court === c.court ? ' on' : ''}`} onClick={() => setCourt(c.court)}>
            <strong>{c.name}</strong>
            <span>{c.text}</span>
          </button>
        ))}
      </div>
      <h3>Opponent</h3>
      <div className="choices">
        {DIFFICULTY_LIST.map((d) => (
          <button key={d} className={`choice${difficulty === d ? ' on' : ''}`} onClick={() => setDifficulty(d)}>
            <strong>{d[0].toUpperCase() + d.slice(1)}</strong>
            <span>{LEVEL_TEXT[d]}</span>
          </button>
        ))}
      </div>
      <div className="menu-buttons">
        <button onClick={onBack}>Back</button>
        <button className="primary" onClick={() => onStart(court, difficulty)}>Start</button>
      </div>
    </main>
  )
}
