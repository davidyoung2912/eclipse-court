import { useState, useSyncExternalStore } from 'react'
import { foeById, LADDER_FOES, rankOf, RANKS, suggestFoe } from '../../engine/data/ladder'
import { PERSONALITIES } from '../../engine/data/personality'
import { ladderSnapshot, subscribeLadder } from '../../ladder'
import { Icon } from './icons'
import { PageArt } from './MenuArt'
import { BackButton } from './BackButton'

interface Props {
  /** Lines about the game just played. */
  report?: string[]
  onPlay: (foeId: string) => void
  onBack: () => void
}

/** The ranked ladder: a rating earned against the AI personas, with the opponent that keeps the match close suggested. */
export function Ladder({ report, onPlay, onBack }: Props) {
  const store = useSyncExternalStore(subscribeLadder, ladderSnapshot)
  const suggested = suggestFoe(store.rating)
  const [chosen, setChosen] = useState<string | null>(null)
  const foe = foeById(chosen ?? suggested.id) ?? suggested
  const next = RANKS.find((r) => r.from > store.rating)
  return (
    <main className="app menu">
      <PageArt icon="trophy" />
      <h2>Ranked Ladder</h2>
      <p className="tagline">Win to climb. Beating a stronger foe earns more, and the suggested opponent keeps matches close.</p>
      {report && report.length > 0 && (
        <div className="setup-card" role="status">{report.map((line) => <div key={line}>{line}</div>)}</div>
      )}
      <dl className="stat-tiles">
        <div><dd>{store.rating}</dd><dt>{rankOf(store.rating)}</dt></div>
        <div><dd>{store.peak}</dd><dt>Peak rating</dt></div>
        <div><dd>{store.wins} / {store.losses} / {store.draws}</dd><dt>Won / lost / drawn</dt></div>
      </dl>
      {next && <p className="tagline">{next.from - store.rating} points to {next.title}.</p>}
      <div className="choices">
        {LADDER_FOES.map((f) => (
          <button key={f.id} className={`choice${f.id === foe.id ? ' on' : ''}`} aria-pressed={f.id === foe.id} onClick={() => setChosen(f.id)}>
            <strong><Icon name="swords" />{f.name} · {f.rating}{f.id === suggested.id ? ' · suggested' : ''}</strong>
            <span>{PERSONALITIES[f.personality].text}</span>
          </button>
        ))}
      </div>
      {store.history.length > 0 && (
        <p className="tagline">Recent: {store.history.slice().reverse().map((h) => `${h.result === 'win' ? 'W' : h.result === 'loss' ? 'L' : 'D'} ${h.change >= 0 ? '+' : ''}${h.change}`).join(' · ')}</p>
      )}
      <div className="menu-buttons stacked">
        <button className="primary" onClick={() => onPlay(foe.id)}><Icon name="play" />Play {foe.name}</button>
        <BackButton onClick={onBack} />
      </div>
    </main>
  )
}
