import { useState } from 'react'
import { PERSONALITIES } from '../../ai/personality'
import { CAMPAIGN, battlesIn } from '../../engine/data/campaign'
import { CAMPAIGN_TIERS } from '../../engine/data/tiers'
import { SCENARIOS, scenariosIn } from '../../engine/data/scenarios'
import { objectiveGoal } from '../../engine/rules/events'
import { STAR_FLAWLESS, STAR_SWIFT, STAR_TEXT, STAR_WIN, battleUnlocked, clearedCount, scenarioStars, starCount, totalStars, type Progress } from '../../progress'
import { Icon } from './icons'
import { ResetButton } from './ResetButton'
import { CampaignArt, OpponentAvatar } from './MenuArt'

interface Props {
  progress: Progress
  /** One line about the battle that was just played, if any. */
  report?: string[]
  /** `series` plays a best-of-three that leaves stars and unlocks alone. */
  onPlay: (index: number, series: boolean) => void
  /** Plays a scenario; these have their own stars and leave the campaign alone. */
  onPlayScenario: (index: number) => void
  /** The tab to open on, such as the scenarios after one was played. */
  tab?: Tab
  onTab?: (tab: Tab) => void
  /** Clears the progress of the tab shown. */
  onReset: (tab: Tab) => void
  onBack: () => void
}

export type Tab = 'battles' | 'scenarios'

const STARS = [STAR_WIN, STAR_FLAWLESS, STAR_SWIFT]

export function Campaign({ progress, report, onPlay, onPlayScenario, tab = 'battles', onTab, onReset, onBack }: Props) {
  const [series, setSeries] = useState(false)
  const cleared = clearedCount(progress)
  /** The tier to open: the first with something still to win. */
  const currentBattleTier = CAMPAIGN_TIERS.find(({ difficulty }) => battlesIn(difficulty).some((o) => !((progress.battles[o.id] ?? 0) & STAR_WIN)))?.difficulty
  const currentScenarioTier = CAMPAIGN_TIERS.find(({ difficulty }) => scenariosIn(difficulty).some((x) => !((progress.scenarios[x.id] ?? 0) & STAR_WIN)))?.difficulty
  return (
    <main className="app menu">
      <CampaignArt />
      <h2>Campaign</h2>
      <div className="tabs" role="tablist">
        <button role="tab" aria-selected={tab === 'battles'} className={tab === 'battles' ? 'on' : ''} onClick={() => onTab?.('battles')}>Battles</button>
        <button role="tab" aria-selected={tab === 'scenarios'} className={tab === 'scenarios' ? 'on' : ''} onClick={() => onTab?.('scenarios')}>Scenarios</button>
      </div>
      {tab === 'scenarios' ? (
        <p className="tagline">{scenarioStars(progress)} of {SCENARIOS.length * 3} stars. Hand-built situations, each with its own goal. Stars: win; win without losing a piece; and a bonus of its own.</p>
      ) : (
        <p className="tagline">{totalStars(progress)} of {CAMPAIGN.length * 3} stars. {STAR_TEXT.map((s) => s.text).join('; ')}.</p>
      )}
      {report && report.length > 0 && (
        <div className="setup-card" role="status">{report.map((line) => <div key={line}>{line}</div>)}</div>
      )}
      {tab === 'scenarios' ? CAMPAIGN_TIERS.map(({ name, blurb, difficulty }) => {
        const list = scenariosIn(difficulty)
        if (list.length === 0) return null
        const won = list.filter((x) => (progress.scenarios[x.id] ?? 0) & STAR_WIN).length
        return (
          <details key={difficulty} className="tier-fold" open={difficulty === currentScenarioTier}>
            <summary><h3>{name} ({won}/{list.length})</h3></summary>
            <p className="tagline">{blurb}</p>
            <ol className="campaign">
              {list.map((x, n) => {
                const bits = progress.scenarios[x.id] ?? 0
                return (
                  <li key={x.id}>
                    <button className={`choice${bits & STAR_WIN ? ' won' : ''}`} onClick={() => onPlayScenario(SCENARIOS.indexOf(x))}>
                      <strong>
                        <Icon name={bits & STAR_WIN ? 'check' : 'swords'} />{n + 1}. {x.name}
                        <span className="stars" aria-label={`${starCount(bits)} of 3 stars`}>
                          {STARS.map((bit) => <i key={bit} className={bits & bit ? 'got' : undefined}>★</i>)}
                        </span>
                      </strong>
                      <span>{x.blurb} ({PERSONALITIES[x.personality].name})</span>
                      <span className="boss">Goal: {objectiveGoal(x.objective)}. Bonus star: {x.bonus.text}.</span>
                    </button>
                  </li>
                )
              })}
            </ol>
          </details>
        )
      }) : (
      <>
      <label className="recharge">
        <input type="checkbox" checked={series} onChange={() => setSeries((s) => !s)} /> Tournament: best of three against one opponent (no stars; {progress.tournaments} won)
      </label>
      {CAMPAIGN_TIERS.map(({ name, blurb, difficulty }) => {
        const list = battlesIn(difficulty)
        if (list.length === 0) return null
        const won = list.filter((o) => (progress.battles[o.id] ?? 0) & STAR_WIN).length
        return (
          <details key={difficulty} className="tier-fold" open={difficulty === currentBattleTier}>
            <summary><h3>{name} ({won}/{list.length})</h3></summary>
            <p className="tagline">{blurb}</p>
            <ol className="campaign">
              {list.map((o, n) => {
                const i = CAMPAIGN.indexOf(o)
                const bits = progress.battles[o.id] ?? 0
                const locked = !battleUnlocked(progress, i)
                const personality = PERSONALITIES[o.personality]
                return (
                  <li key={o.id}>
                    <button className={`choice${bits & STAR_WIN ? ' won' : ''}`} disabled={locked} onClick={() => onPlay(i, series)}>
                      <OpponentAvatar index={i} locked={locked} />
                      <strong>
                        <Icon name={locked ? 'lock' : bits & STAR_WIN ? 'check' : 'swords'} />{n + 1}. {o.name}
                        <span className="stars" aria-label={`${starCount(bits)} of 3 stars`}>
                          {STARS.map((bit) => <i key={bit} className={bits & bit ? 'got' : undefined}>★</i>)}
                        </span>
                      </strong>
                      <span>{o.blurb} ({personality.name})</span>
                      {o.boss && <span className="boss">Boss rule: {o.boss}</span>}
                    </button>
                  </li>
                )
              })}
            </ol>
          </details>
        )
      })}
      </>
      )}
      <div className="menu-buttons stacked">
        {tab === 'scenarios'
          ? <ResetButton label="Reset Scenarios" disabled={scenarioStars(progress) === 0} warning="Clear every scenario star so you can retry them all?" onReset={() => onReset('scenarios')} />
          : <ResetButton label="Reset Campaign" disabled={cleared === 0 && totalStars(progress) === 0} warning="Clear every battle and star? Boards, presets and themes unlocked by stars will lock again." onReset={() => onReset('battles')} />}
        <button onClick={onBack}><Icon name="back" />Back</button>
      </div>
    </main>
  )
}
