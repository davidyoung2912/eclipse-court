import { useState } from 'react'
import { CAMPAIGN, battlesIn, grandBattles } from '../../engine/data/campaign'
import { CAMPAIGN_TIERS, GRAND_TIER } from '../../engine/data/tiers'
import { SCENARIOS, scenariosIn } from '../../engine/data/scenarios'
import { COOP_SCENARIOS } from '../../engine/data/coop'
import { objectiveGoal } from '../../engine/rules/events'
import { STAR_FLAWLESS, STAR_SWIFT, STAR_TEXT, STAR_WIN, starCount, battleUnlocked, clearedCount, coopStars, GRAND_STARS, scenarioStars, totalStars, type Progress } from '../../progress'
import { Icon, type IconName } from './icons'
import { ResetButton } from './ResetButton'
import { TipCard } from '../tips/TipCard'
import { CampaignArt, OpponentAvatar } from './MenuArt'
import { BackButton } from './BackButton'
import { t } from '../../i18n'

interface Props {
  progress: Progress
  /** One line about the battle that was just played, if any. */
  report?: string[]
  /** `series` plays a best-of-three that leaves stars and unlocks alone. */
  onPlay: (index: number, series: boolean) => void
  /** Plays a scenario; these have their own stars and leave the campaign alone. */
  onPlayScenario: (index: number) => void
  /** Plays a co-op scenario, two people sharing the Solari court. */
  onPlayCoop: (index: number) => void
  /** The tab to open on, such as the scenarios after one was played. */
  tab?: Tab
  onTab?: (tab: Tab) => void
  /** Clears the progress of the tab shown. */
  onReset: (tab: Tab) => void
  onBack: () => void
}

export type Tab = 'battles' | 'scenarios' | 'coop'

const LEVEL = { easy: 1, normal: 2, hard: 3 } as const

/** The kind of item (icon and words) with its difficulty as lit stars on the same line. */
function Kind({ icon, text, difficulty }: { icon: IconName; text: string; difficulty: keyof typeof LEVEL }) {
  return (
    <span className="kind">
      <Icon name={icon} />{text}
      <span className="stars" aria-label={t('campaign.difficulty', { n: LEVEL[difficulty] })}>
        {[1, 2, 3].map((n) => <i key={n} className={n <= LEVEL[difficulty] ? 'got' : undefined}>★</i>)}
      </span>
    </span>
  )
}

/** The "Completed" line at the foot of a finished card: earned stars and what earned them. */
function Completed({ bits, texts }: { bits: number; texts: readonly string[] }) {
  const earned = [STAR_WIN, STAR_FLAWLESS, STAR_SWIFT].map((bit, i) => (bits & bit ? texts[i] : null)).filter(Boolean)
  return (
    <span className="completed">
      <span className="stars" aria-label={t('campaign.starsOf', { n: starCount(bits) })}>
        {[STAR_WIN, STAR_FLAWLESS, STAR_SWIFT].map((bit) => <i key={bit} className={bits & bit ? 'got' : undefined}>★</i>)}
      </span>
      {t('campaign.completed', { earned: earned.join('; ') })}
    </span>
  )
}

export function Campaign({ progress, report, onPlay, onPlayScenario, onPlayCoop, tab = 'battles', onTab, onReset, onBack }: Props) {
  const [series, setSeries] = useState(false)
  const cleared = clearedCount(progress)
  /** The tier to open: the first with something still to win. */
  const currentBattleTier: string | undefined = CAMPAIGN_TIERS.find(({ difficulty }) => battlesIn(difficulty).some((o) => !((progress.battles[o.id] ?? 0) & STAR_WIN)))?.difficulty
    ?? (totalStars(progress) >= GRAND_STARS && grandBattles().some((o) => !((progress.battles[o.id] ?? 0) & STAR_WIN)) ? 'grand' : undefined)
  const currentScenarioTier = CAMPAIGN_TIERS.find(({ difficulty }) => scenariosIn(difficulty).some((x) => !((progress.scenarios[x.id] ?? 0) & STAR_WIN)))?.difficulty
  return (
    <main className="app menu campaign-menu">
      <CampaignArt />
      <h2>{t('campaign.title')}</h2>
      <div className="tabs" role="tablist">
        <button role="tab" aria-selected={tab === 'battles'} className={tab === 'battles' ? 'on' : ''} onClick={() => onTab?.('battles')}>{t('campaign.tab.battles')}</button>
        <button role="tab" aria-selected={tab === 'scenarios'} className={tab === 'scenarios' ? 'on' : ''} onClick={() => onTab?.('scenarios')}>{t('campaign.tab.scenarios')}</button>
        <button role="tab" aria-selected={tab === 'coop'} className={tab === 'coop' ? 'on' : ''} onClick={() => onTab?.('coop')}>{t('campaign.tab.coop')}</button>
      </div>
      {tab === 'coop' ? (
        <p className="tagline">{t('campaign.coopTagline', { stars: coopStars(progress), total: COOP_SCENARIOS.length * 3 })}</p>
      ) : tab === 'scenarios' ? (
        <p className="tagline">{t('campaign.scenariosTagline', { stars: scenarioStars(progress), total: SCENARIOS.length * 3 })}</p>
      ) : (
        <p className="tagline">{t('campaign.battlesTagline', { stars: totalStars(progress), total: CAMPAIGN.length * 3, rules: STAR_TEXT.map((s) => s.text).join('; ') })}</p>
      )}
      {report && report.length > 0 && (
        <div className="setup-card" role="status">{report.map((line) => <div key={line}>{line}</div>)}</div>
      )}
      {tab === 'coop' ? (
        <ol className="campaign">
          {COOP_SCENARIOS.map((x, n) => {
            const bits = progress.scenarios[x.id] ?? 0
            return (
              <li key={x.id}>
                <button className={`choice${bits & STAR_WIN ? ' won' : ''}`} onClick={() => onPlayCoop(n)}>
                  <strong>{n + 1}. {x.name}</strong>
                  <Kind icon="target" text={t('campaign.kind.coop', { kind: t(`campaign.objective.${x.objective.kind}`) })} difficulty={x.difficulty} />
                  <span>{x.blurb}</span>
                  <span className="boss">{t('campaign.goal', { goal: objectiveGoal(x.objective), bonus: x.bonus.text })}</span>
                  {bits & STAR_WIN ? <Completed bits={bits} texts={[STAR_TEXT[0].text.replace('battle', 'scenario'), STAR_TEXT[1].text, x.bonus.text]} /> : null}
                </button>
              </li>
            )
          })}
        </ol>
      ) : tab === 'scenarios' ? CAMPAIGN_TIERS.map(({ name, blurb, difficulty }) => {
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
                        {n + 1}. {x.name}
                      </strong>
                      <Kind icon="target" text={t('campaign.kind.scenario', { kind: t(`campaign.objective.${x.objective.kind}`) })} difficulty={x.difficulty} />
                      <span>{x.blurb}</span>
                      <span className="boss">{t('campaign.goal', { goal: objectiveGoal(x.objective), bonus: x.bonus.text })}</span>
                      {bits & STAR_WIN ? <Completed bits={bits} texts={[STAR_TEXT[0].text.replace('battle', 'scenario'), STAR_TEXT[1].text, x.bonus.text]} /> : null}
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
        <input type="checkbox" checked={series} onChange={() => setSeries((s) => !s)} /> {t('campaign.series', { won: progress.tournaments })}
      </label>
      {[...CAMPAIGN_TIERS.map(({ name, blurb, difficulty }) => ({ key: difficulty as string, name, blurb, list: battlesIn(difficulty), note: '' })),
        { key: 'grand', name: GRAND_TIER.name, blurb: GRAND_TIER.blurb, list: grandBattles(), note: totalStars(progress) < GRAND_STARS ? t('campaign.grandLocked', { stars: GRAND_STARS }) : '' }].map(({ key, name, blurb, list, note }) => {
        if (list.length === 0) return null
        const won = list.filter((o) => (progress.battles[o.id] ?? 0) & STAR_WIN).length
        return (
          <details key={key} className="tier-fold" open={key === currentBattleTier}>
            <summary><h3>{name} ({won}/{list.length})</h3></summary>
            <p className="tagline">{blurb}{note && ` ${note}`}</p>
            <ol className="campaign">
              {list.map((o, n) => {
                const i = CAMPAIGN.indexOf(o)
                const bits = progress.battles[o.id] ?? 0
                const locked = !battleUnlocked(progress, i)
                return (
                  <li key={o.id}>
                    <button className={`choice${bits & STAR_WIN ? ' won' : ''}`} disabled={locked} onClick={() => onPlay(i, series)}>
                      <OpponentAvatar index={i} locked={locked} />
                      <strong>
                        {n + 1}. {o.name}
                      </strong>
                      <Kind icon="swords" text={t(o.size === 9 ? 'campaign.kind.battle9' : 'campaign.kind.battle')} difficulty={o.difficulty} />
                      <span>{o.blurb}</span>
                      {o.boss && <span className="boss">{t('campaign.bossRule', { rule: o.boss })}</span>}
                      {bits & STAR_WIN ? <Completed bits={bits} texts={STAR_TEXT.map((star) => star.text)} /> : null}
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
        {tab === 'coop'
          ? <ResetButton label={t('campaign.resetCoop')} disabled={coopStars(progress) === 0} warning={t('campaign.resetCoopWarning')} onReset={() => onReset('coop')} />
          : tab === 'scenarios'
          ? <ResetButton label={t('campaign.resetScenarios')} disabled={scenarioStars(progress) === 0} warning={t('campaign.resetScenariosWarning')} onReset={() => onReset('scenarios')} />
          : <ResetButton label={t('campaign.resetCampaign')} disabled={cleared === 0 && totalStars(progress) === 0} warning={t('campaign.resetCampaignWarning')} onReset={() => onReset('battles')} />}
        <BackButton onClick={onBack} />
      </div>
      <TipCard page={tab === 'coop' ? 'campaign-coop' : tab === 'scenarios' ? 'campaign-scenarios' : 'campaign-battles'} />
    </main>
  )
}
