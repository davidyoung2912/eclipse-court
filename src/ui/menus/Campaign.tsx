import { CAMPAIGN } from '../../engine/data/campaign'
import { Icon } from './icons'

interface Props {
  /** Number of opponents beaten so far; the next one is unlocked. */
  cleared: number
  onPlay: (index: number) => void
  onBack: () => void
}

export function Campaign({ cleared, onPlay, onBack }: Props) {
  return (
    <main className="app menu">
      <h2>Campaign</h2>
      <ol className="campaign">
        {CAMPAIGN.map((o, i) => {
          const locked = i > cleared
          return (
            <li key={o.name}>
              <button className={`choice${i < cleared ? ' won' : ''}`} disabled={locked} onClick={() => onPlay(i)}>
                <strong><Icon name={locked ? 'lock' : i < cleared ? 'check' : 'swords'} />{i + 1}. {o.name}</strong>
                <span>{o.blurb} ({o.difficulty})</span>
              </button>
            </li>
          )
        })}
      </ol>
      <div className="menu-buttons">
        <button onClick={onBack}><Icon name="back" />Back</button>
      </div>
    </main>
  )
}
