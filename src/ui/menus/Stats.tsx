import { useSyncExternalStore } from 'react'
import { ACHIEVEMENTS, ACHIEVEMENT_CATEGORIES, type Progress } from '../../progress'
import { dailySeed } from '../../engine/data/setups'
import { overall, percent, sections, totals } from '../../statsModel'
import { storySnapshot, subscribeStory } from '../../story'
import { Bar } from './Bar'
import { shareLink } from '../../share'
import { ShareButton } from '../ShareButton'
import { ResetButton } from './ResetButton'
import { formatTime } from '../PlayTimer'
import { Icon } from './icons'
import { PageArt } from './MenuArt'
import { TipCard } from '../tips/TipCard'
import { BackButton } from './BackButton'

interface Props {
  progress: Progress
  onReplay?: () => void
  onReset: () => void
  onBack: () => void
}

export function Stats({ progress, onReplay, onReset, onBack }: Props) {
  const story = useSyncExternalStore(subscribeStory, storySnapshot)
  const list = sections(progress, story, dailySeed())
  const done = overall(list)
  const tiles = [...totals(progress), { label: 'Total time played', value: formatTime(progress.stats.playSeconds) }]
  return (
    <main className="app menu">
      <PageArt icon="trophy" />
      <h2>Stats</h2>
      <div className="stat-overall" role="group" aria-label="Overall completion">
        <strong>{percent(done)}</strong>
        <span>complete across the campaign, scenarios, puzzles, gauntlet, story and achievements</span>
        <Bar fraction={done} />
      </div>
      <dl className="stat-tiles">
        {tiles.map(({ label, value }) => <div key={label}><dd>{value}</dd><dt>{label}</dt></div>)}
      </dl>
      {list.map((section) => (
        <details key={section.id} className="stat-section" open>
          <summary>
            <h3><Icon name={section.icon} />{section.title}</h3>
            {section.fraction !== null && <em>{percent(section.fraction)}</em>}
          </summary>
          {section.fraction !== null && <Bar fraction={section.fraction} />}
          <dl className="stat-rows">
            {section.rows.map((r) => (
              <div key={r.label}>
                <dt>{r.label}</dt>
                <dd>{r.value}</dd>
                {r.fraction !== undefined && <Bar fraction={r.fraction} thin />}
              </div>
            ))}
          </dl>
        </details>
      ))}
      <h3>Achievements ({progress.achievements.length} of {ACHIEVEMENTS.length})</h3>
      {ACHIEVEMENT_CATEGORIES.map((category) => {
        const list = ACHIEVEMENTS.filter((a) => a.category === category)
        const earned = list.filter((a) => progress.achievements.includes(a.id)).length
        return (
          <details key={category} className="tier-fold">
            <summary><h3>{category} ({earned}/{list.length})</h3></summary>
            <ul className="achievements">
              {list.map((a) => {
                const got = progress.achievements.includes(a.id)
                return (
                  <li key={a.id} className={got ? 'got' : undefined}>
                    <strong><Icon name={got ? 'trophy' : 'lock'} />{a.name}</strong>
                    <span>{a.text}</span>
                  </li>
                )
              })}
            </ul>
          </details>
        )
      })}
      <div className="menu-buttons stacked">
        {onReplay && <button onClick={onReplay}><Icon name="replay" />Replay Last Game</button>}
        {progress.last && <ShareButton title="Eclipse Court replay" label="Copy Replay Link" link={() => shareLink('r', progress.last!)} />}
        <ResetButton label="Reset Stats" warning="Clear every stat, the Gauntlet record, achievements and the last replay? Campaign, puzzle and scenario progress is kept." onReset={onReset} />
        <BackButton onClick={onBack} />
      </div>
      <TipCard page="stats" />
    </main>
  )
}
