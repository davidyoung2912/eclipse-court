import { ACHIEVEMENTS, totalStars, type Progress } from '../../progress'
import { CAMPAIGN } from '../../engine/data/campaign'
import { shareLink } from '../../share'
import { ShareButton } from '../ShareButton'
import { Icon } from './icons'

interface Props {
  progress: Progress
  onReplay?: () => void
  onBack: () => void
}

export function Stats({ progress, onReplay, onBack }: Props) {
  const { stats } = progress
  const rows: [string, number | string][] = [
    ['Games played', stats.games],
    ['Won / lost / drawn', `${stats.wins} / ${stats.losses} / ${stats.draws}`],
    ['Enemy pieces taken', stats.captures],
    ['Own pieces lost', stats.piecesLost],
    ['Campaign', `${progress.cleared} of ${CAMPAIGN.length} beaten, ${totalStars(progress)} stars`],
  ]
  return (
    <main className="app menu">
      <h2>Stats</h2>
      <dl className="stats">
        {rows.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}
      </dl>
      <h3>Achievements ({progress.achievements.length} of {ACHIEVEMENTS.length})</h3>
      <ul className="achievements">
        {ACHIEVEMENTS.map((a) => {
          const got = progress.achievements.includes(a.id)
          return (
            <li key={a.id} className={got ? 'got' : undefined}>
              <strong><Icon name={got ? 'trophy' : 'lock'} />{a.name}</strong>
              <span>{a.text}</span>
            </li>
          )
        })}
      </ul>
      <div className="menu-buttons stacked">
        {onReplay && <button onClick={onReplay}><Icon name="replay" />Replay last game</button>}
        {progress.last && <ShareButton title="Eclipse Court replay" label="Copy replay link" link={() => shareLink('r', progress.last!)} />}
        <button onClick={onBack}><Icon name="back" />Back</button>
      </div>
    </main>
  )
}
