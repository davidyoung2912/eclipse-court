import { PERSONALITIES } from '../../ai/personality'
import { CAMPAIGN } from '../../engine/data/campaign'
import { STAR_FLAWLESS, STAR_SWIFT, STAR_TEXT, STAR_WIN, starCount, totalStars, type Progress } from '../../progress'
import { Icon } from './icons'

interface Props {
  progress: Progress
  /** One line about the battle that was just played, if any. */
  report?: string[]
  onPlay: (index: number) => void
  onBack: () => void
}

const STARS = [STAR_WIN, STAR_FLAWLESS, STAR_SWIFT]

export function Campaign({ progress, report, onPlay, onBack }: Props) {
  const { cleared, stars } = progress
  return (
    <main className="app menu">
      <h2>Campaign</h2>
      <p className="tagline">{totalStars(progress)} of {CAMPAIGN.length * 3} stars. {STAR_TEXT.map((s) => s.text).join('; ')}.</p>
      {report && report.length > 0 && (
        <div className="setup-card" role="status">{report.map((line) => <div key={line}>{line}</div>)}</div>
      )}
      <ol className="campaign">
        {CAMPAIGN.map((o, i) => {
          const locked = i > cleared
          const personality = PERSONALITIES[o.personality]
          return (
            <li key={o.name}>
              <button className={`choice${i < cleared ? ' won' : ''}`} disabled={locked} onClick={() => onPlay(i)}>
                <strong>
                  <Icon name={locked ? 'lock' : i < cleared ? 'check' : 'swords'} />{i + 1}. {o.name}
                  <span className="stars" aria-label={`${starCount(stars[i])} of 3 stars`}>
                    {STARS.map((bit) => <i key={bit} className={stars[i] & bit ? 'got' : undefined}>★</i>)}
                  </span>
                </strong>
                <span>{o.blurb} ({o.difficulty}, {personality.name})</span>
                {o.boss && <span className="boss">Boss rule: {o.boss}</span>}
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
