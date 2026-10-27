import { useState } from 'react'
import { PERSONALITIES } from '../../engine/data/personality'
import { CLASSIC_ROLES, draftProblem } from '../../engine/data/draft'
import { GAUNTLET_STAGES, RELICS, REST_STAGES, roster, stageFoe, type Reward, type Run, type RunPiece } from '../../engine/data/gauntlet'
import { ROLE_NAMES } from '../../engine/data/roster'
import { PERK_INFO, VETERAN_WINS, ELITE_WINS } from '../../engine/rules/growth'
import { SPELL_INFO } from '../../engine/rules/spells'
import type { Court, Role } from '../../engine/rules/types'
import { totalStars, type Progress } from '../../progress'
import { PieceArt } from '../../art/PieceArt'
import { DraftPicker } from './DraftPicker'
import { Icon } from './icons'
import { PageArt } from './MenuArt'
import { TipCard } from '../tips/TipCard'

interface Props {
  progress: Progress
  /** The run in progress, if any. */
  run: Run | null
  /** Lines about the run that just ended, if any. */
  report: string[]
  onStart: (court: Court, roles: Role[]) => void
  onFight: () => void
  onReward: (reward: Reward) => void
  onAbandon: () => void
  onBack: () => void
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
export function Gauntlet({ progress, run, report, onStart, onFight, onReward, onAbandon, onBack }: Props) {
  const [court, setCourt] = useState<Court>('solari')
  const [roles, setRoles] = useState<Role[]>(() => [...CLASSIC_ROLES])
  const g = progress.gauntlet
  const lines = report.length > 0 && <div className="setup-card" role="status">{report.map((line) => <div key={line}>{line}</div>)}</div>
  const back = <button onClick={onBack}><Icon name="back" />Back</button>

  if (!run)
    return (
      <main className="app menu">
        <PageArt icon="flame" />
        <h2>Gauntlet</h2>
        <p className="tagline">
          Eight opponents in a row with one army. Pieces keep what they earn, the fallen stay fallen, and a loss ends the run.
          Runs begun: {g.runs}, won: {g.won}, furthest stage: {g.best}.
        </p>
        {lines}
        <h3>Your court</h3>
        <div className="row-pick">
          {(['solari', 'umbral'] as Court[]).map((c) => (
            <button key={c} className={court === c ? 'on' : undefined} onClick={() => setCourt(c)}>{c === 'solari' ? 'Solari' : 'Umbral'}</button>
          ))}
        </div>
        <h3>Starting army</h3>
        <DraftPicker court={court} roles={roles} onChange={setRoles} stars={totalStars(progress)} />
        <div className="menu-buttons stacked">
          <button className="primary" disabled={!!draftProblem(roles)} onClick={() => onStart(court, roles)}><Icon name="play" />Begin the Run</button>
          {back}
        </div>
        <TipCard page="gauntlet" />
      </main>
    )

  if (run.offers)
    return (
      <main className="app menu">
        <PageArt icon="flame" />
        <h2>Spoils of stage {run.stage - 1}</h2>
        <p className="tagline">Take one reward. {REST_STAGES.includes(run.stage - 1) ? 'A quiet camp: the fallen may rise again.' : ''}</p>
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

  const foe = stageFoe(run.seed, run.stage)
  const personality = PERSONALITIES[foe.personality]
  return (
    <main className="app menu">
      <PageArt icon="flame" />
      <h2>Stage {run.stage} of {GAUNTLET_STAGES}</h2>
      <p className="tagline">{foe.name}: {foe.difficulty}, {personality.name}.</p>
      {lines}
      <div className="setup-card">
        {foe.blurb} {foe.hpBonus > 0 && `Every piece has ${foe.hpBonus} extra HP. `}
        {foe.tags.length > 0 ? `Rules: ${foe.tags.join(', ')}.` : 'No special rules.'}
        {foe.boss && <div className="boss">Boss: the Eclipse falls at round 20.</div>}
      </div>
      <h3>Your army ({run.army.length + 1} pieces)</h3>
      <Army run={run} />
      {run.fallen.length > 0 && <p className="tagline">{run.fallen.length} fallen; a camp after stage {REST_STAGES.find((s) => s >= run.stage) ?? 'the last'} may restore one.</p>}
      <div className="menu-buttons stacked">
        <button className="primary" onClick={onFight}><Icon name="swords" />Fight</button>
        <button onClick={onAbandon}><Icon name="exit" />Abandon the Run</button>
        {back}
      </div>
      <TipCard page="gauntlet-run" />
    </main>
  )
}
