import { useState, useSyncExternalStore } from 'react'
import { PERSONALITIES } from '../../engine/data/personality'
import { CLASSIC_ROLES, draftProblem } from '../../engine/data/draft'
import { ASCENSIONS, GAUNTLET_STAGES, MAX_ASCENSION, parseRunCode, RELIC_UNLOCK_WINS, RELICS, restStages, startingRelics, roster, stageFoe, type RelicId, type Reward, type Run, type RunPiece } from '../../engine/data/gauntlet'
import { ROLE_NAMES } from '../../engine/data/roster'
import { PERK_INFO, VETERAN_WINS, ELITE_WINS } from '../../engine/rules/growth'
import { SPELL_INFO } from '../../engine/rules/spells'
import type { Court, Role } from '../../engine/rules/types'
import { totalStars, type Progress } from '../../progress'
import { ascensionSnapshot, forDay, liveStreak, SHARDS_ASCENSION_WIN, SHARDS_DAILY_RUN, subscribeAscension } from '../../ascension'
import { dailySeed } from '../../engine/data/setups'
import { PieceArt } from '../../art/PieceArt'
import { DraftPicker } from './DraftPicker'
import { CourtPicker } from './CourtPicker'
import { Icon } from './icons'
import { PageArt } from './MenuArt'
import { TipCard } from '../tips/TipCard'
import { BackButton } from './BackButton'

interface Props {
  progress: Progress
  /** The run in progress, if any. */
  run: Run | null
  /** Lines about the run that just ended, if any. */
  report: string[]
  /** The text of the run that just ended, ready to share. */
  summary: string | null
  onStart: (court: Court, roles: Role[], opts: { ascension: number; seed?: number; relic?: RelicId }) => void
  onDaily: () => void
  onFight: () => void
  /** A fight of this stage was left unfinished; Fight picks it up where it stopped. */
  resuming?: boolean
  onReward: (reward: Reward) => void
  onAbandon: () => void
  onBack: () => void
}

const copy = (text: string) => {
  try {
    void navigator.clipboard?.writeText(text)
  } catch {
    // Without a clipboard the summary can still be selected by hand.
  }
}

const rank = (p: RunPiece) => (p.wins >= ELITE_WINS ? 'Elite' : p.wins >= VETERAN_WINS ? 'Veteran' : 'Recruit')

/** What a reward gives, in words. */
function describe(run: Run, reward: Reward): { title: string; text: string } {
  const names = ROLE_NAMES[run.court]
  const slots = roster(run)
  switch (reward.kind) {
    case 'piece': return { title: `Recruit a ${names[reward.role]}`, text: 'A new piece joins the army.' }
    case 'hp': return { title: `${names[slots[reward.target].role]}: +1 HP`, text: 'Its maximum HP rises by one for the rest of the run.' }
    case 'perk': return { title: `${names[slots[reward.target].role]}: ${PERK_INFO[reward.perk].name}`, text: `Becomes Elite. ${PERK_INFO[reward.perk].text}` }
    case 'spell': return { title: `Learn ${SPELL_INFO[reward.spell].name}`, text: SPELL_INFO[reward.spell].text }
    case 'relic': return { title: `Relic: ${RELICS[reward.relic].name}`, text: `${RELICS[reward.relic].text} It applies to both courts.` }
    case 'revive': return { title: `Rest: restore a ${names[run.fallen[reward.target].role]}`, text: `${rank(run.fallen[reward.target])}; it rejoins the army.` }
  }
}

function Army({ run }: { run: Run }) {
  const names = ROLE_NAMES[run.court]
  return (
    <ul className="setup-card army">
      {roster(run).map((p, i) => (
        <li key={i}>
          <svg className="avatar" viewBox="-0.45 -0.45 0.9 0.9" aria-hidden="true" width="22" height="22"><PieceArt role={p.role} court={run.court} /></svg>
          {' '}<strong>{names[p.role]}</strong> {rank(p)}{p.perk ? `, ${PERK_INFO[p.perk].name}` : ''}{p.bonus ? `, +${p.bonus} HP` : ''}
        </li>
      ))}
      {run.relics.length > 0 && <li>Relics: {run.relics.map((r) => RELICS[r].name).join(', ')}</li>}
      <li>Spells: {run.loadout.map((s) => SPELL_INFO[s].name).join(', ')}</li>
    </ul>
  )
}

/** The roguelike run: pick an army, fight eight opponents in a row, and take a reward after each win. */
export function Gauntlet({ progress, run, resuming, report, summary, onStart, onDaily, onFight, onReward, onAbandon, onBack }: Props) {
  const [court, setCourt] = useState<Court>('solari')
  const [roles, setRoles] = useState<Role[]>(() => [...CLASSIC_ROLES])
  const [ascension, setAscension] = useState(0)
  const [relic, setRelic] = useState<RelicId | null>(null)
  const [code, setCode] = useState('')
  const asc = useSyncExternalStore(subscribeAscension, ascensionSnapshot)
  const today = forDay(asc, dailySeed())
  const parsed = code.trim() ? parseRunCode(code) : null
  const level = Math.min(parsed ? parsed.ascension : ascension, MAX_ASCENSION)
  const g = progress.gauntlet
  const lines = report.length > 0 && (
    <div className="setup-card" role="status">
      {report.map((line) => <div key={line}>{line}</div>)}
      {summary && <pre className="run-summary">{summary}</pre>}
      {summary && <button onClick={() => copy(summary)}><Icon name="chain" />Copy Summary</button>}
    </div>
  )
  const back = <BackButton onClick={onBack} />

  if (!run)
    return (
      <main className="app menu gauntlet-menu">
        <PageArt icon="flame" />
        <h2>Gauntlet</h2>
        <p className="tagline">
          Eight opponents in a row with one army. Pieces keep what they earn, the fallen stay fallen, and a loss ends the run.
          Runs begun: {g.runs}, won: {g.won}, furthest stage: {g.best}.
        </p>
        {lines}
        <h3>Ascension</h3>
        <div className="choices">
          {Array.from({ length: asc.unlocked + 1 }, (_, a) => (
            <button key={a} className={`choice${a === level ? ' on' : ''}`} aria-pressed={a === level} disabled={!!parsed} onClick={() => setAscension(a)}>
              <strong>{a === 0 ? 'Ascension 0: the standard run' : `Ascension ${a}: ${ASCENSIONS[a - 1].name}`}</strong>
              <span>{a === 0 ? 'The eight opponents as they come.' : `${ASCENSIONS[a - 1].text} Adds to every level below. +${SHARDS_ASCENSION_WIN * a} Shards for a win.`}</span>
            </button>
          ))}
        </div>
        {asc.unlocked < MAX_ASCENSION && <p className="tagline">Win a run at ascension {asc.unlocked} to open {asc.unlocked + 1}.</p>}
        <h3>Daily run</h3>
        <div className="setup-card">
          Everyone gets the same foes today, with the classic army from the Solari court.{' '}
          {today.dayWon ? 'Won today.' : today.dayBest ? `Furthest today: stage ${today.dayBest}.` : `A first win pays ${SHARDS_DAILY_RUN} Shards.`}{' '}
          Days won: {asc.daysWon}. Streak: {liveStreak(asc, dailySeed())}{asc.bestStreak > 0 ? ` (best ${asc.bestStreak})` : ''}.
          {' '}Each day in a row adds Shards to a win. The daily run takes no starting relic.
        </div>
        <div className="menu-buttons stacked"><button onClick={onDaily}><Icon name="play" />Begin the Daily Run</button></div>
        <h3>Your court</h3>
        <CourtPicker value={court} onChange={setCourt} />
        <h3>Starting army</h3>
        <DraftPicker court={court} roles={roles} onChange={setRoles} stars={totalStars(progress)} />
        <h3>Starting relic</h3>
        <div className="choices">
          <button className={`choice${relic === null ? ' on' : ''}`} aria-pressed={relic === null} onClick={() => setRelic(null)}>
            <strong>None</strong><span>Begin with no relic.</span>
          </button>
          {(Object.keys(RELICS) as RelicId[]).map((r) => {
            const open = startingRelics(g.won).includes(r)
            return (
              <button key={r} className={`choice${relic === r ? ' on' : ''}`} aria-pressed={relic === r} disabled={!open} onClick={() => setRelic(r)}>
                <strong>{RELICS[r].name}</strong>
                <span>{open ? `${RELICS[r].text} It applies to both courts.` : `Win ${RELIC_UNLOCK_WINS[r]} gauntlet run${RELIC_UNLOCK_WINS[r] === 1 ? '' : 's'} to unlock (${g.won} so far).`}</span>
              </button>
            )
          })}
        </div>
        <h3>Run code</h3>
        <label className="setup-card">
          Enter a friend’s code to fight their sequence of foes (optional):{' '}
          <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="G2-1k5x9a" aria-label="Run code" maxLength={12} />
          {code.trim() !== '' && !parsed && <div role="alert">That code is not valid.</div>}
        </label>
        <div className="menu-buttons stacked">
          <button className="primary" disabled={!!draftProblem(roles) || (code.trim() !== '' && !parsed)} onClick={() => onStart(court, roles, { ascension: level, seed: parsed?.seed, relic: relic && startingRelics(g.won).includes(relic) ? relic : undefined })}><Icon name="play" />Begin the Run</button>
          {back}
        </div>
        <TipCard page="gauntlet" />
      </main>
    )

  if (run.offers)
    return (
      <main className="app menu gauntlet-menu">
        <PageArt icon="flame" />
        <h2>Spoils of stage {run.stage - 1}</h2>
        <p className="tagline">Take one reward. {restStages(run.ascension).includes(run.stage - 1) ? 'A quiet camp: the fallen may rise again.' : ''}</p>
        {lines}
        <div className="choices">
          {run.offers.map((reward, i) => {
            const d = describe(run, reward)
            return (
              <button key={i} className="choice" onClick={() => onReward(reward)}>
                <strong><Icon name="sparkle" />{d.title}</strong>
                <span>{d.text}</span>
              </button>
            )
          })}
        </div>
        <Army run={run} />
        <div className="menu-buttons stacked">
          <button onClick={onAbandon}><Icon name="exit" />Abandon the Run</button>
          {back}
        </div>
        <TipCard page="gauntlet-run" />
      </main>
    )

  const foe = stageFoe(run.seed, run.stage, run.ascension)
  const personality = PERSONALITIES[foe.personality]
  return (
    <main className="app menu gauntlet-menu">
      <PageArt icon="flame" />
      <h2>Stage {run.stage} of {GAUNTLET_STAGES}</h2>
      {(run.ascension > 0 || run.daily > 0) && <p className="tagline">{run.daily > 0 ? 'Daily run. ' : ''}{run.ascension > 0 ? `Ascension ${run.ascension}: ${ASCENSIONS[run.ascension - 1].name}.` : ''}</p>}
      <p className="tagline">{foe.name}: {foe.difficulty}, {personality.name}.</p>
      {lines}
      <div className="setup-card">
        {foe.blurb} {foe.hpBonus > 0 && `Every piece has ${foe.hpBonus} extra HP. `}
        {foe.tags.length > 0 ? `Rules: ${foe.tags.join(', ')}.` : 'No special rules.'}
        {foe.boss && <div className="boss">Boss: the Eclipse falls at round 20.</div>}
      </div>
      <h3>Your army ({run.army.length + 1} pieces)</h3>
      <Army run={run} />
      {run.fallen.length > 0 && <p className="tagline">{run.fallen.length} fallen; {restStages(run.ascension).find((s) => s >= run.stage) ? `a camp after stage ${restStages(run.ascension).find((s) => s >= run.stage)} may restore one.` : 'there is no camp left to restore them.'}</p>}
      <div className="menu-buttons stacked">
        <button className="primary" onClick={onFight}><Icon name="swords" />{resuming ? 'Resume Fight' : 'Fight'}</button>
        <button onClick={onAbandon}><Icon name="exit" />Abandon the Run</button>
        {back}
      </div>
      <TipCard page="gauntlet-run" />
    </main>
  )
}
