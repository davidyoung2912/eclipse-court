import { useState } from 'react'
import { DIFFICULTY_LIST, DIFFICULTY, type Difficulty } from '../../ai/profile'
import { DRAFT_ROLES } from '../../engine/data/draft'
import { ROLE_NAMES, ROLE_STATS } from '../../engine/data/roster'
import { estimateOdds } from '../../engine/reducer'
import type { Court, DuelOutcome, Piece, Role } from '../../engine/rules/types'
import { PlayTimer } from '../PlayTimer'
import { DuelView } from '../duel/DuelView'
import { Icon } from './icons'
import { PageArt } from './MenuArt'

interface Props {
  onPlaytime: (seconds: number) => void
  onBack: () => void
}

const ROLES: readonly Role[] = [...DRAFT_ROLES, 'leader']
const LIGHTS = [-2, -1, 0, 1, 2]

const fighter = (court: Court, role: Role): Piece => ({
  id: `${court}-${role}-practice`, court, role, hp: ROLE_STATS[role].hp, maxHp: ROLE_STATS[role].hp,
  pos: { x: 0, y: 0 }, rest: 0, moved: false, bound: false,
})

const pct = (n: number) => `${Math.round(n * 100)}%`

/** A duel between any two roles, with the odds card: for learning how pieces fight without a game riding on it. */
export function Practice({ onPlaytime, onBack }: Props) {
  const [mine, setMine] = useState<Role>('footsoldier')
  const [theirs, setTheirs] = useState<Role>('footsoldier')
  const [court, setCourt] = useState<Court>('solari')
  const [light, setLight] = useState(0)
  const [difficulty, setDifficulty] = useState<Difficulty>('normal')
  const [seed, setSeed] = useState(1)
  const [fighting, setFighting] = useState(false)
  const [outcome, setOutcome] = useState<DuelOutcome | null>(null)
  const foe: Court = court === 'solari' ? 'umbral' : 'solari'
  const attacker = fighter(court, mine)
  const defender = fighter(foe, theirs)
  const odds = estimateOdds(attacker, defender, light)
  const { skill, aggression } = DIFFICULTY[difficulty]

  if (fighting)
    return (
      <>
        <PlayTimer onFlush={onPlaytime} />
        <DuelView attacker={attacker} defender={defender} luminance={light} options={{ mirror: false, aimAssist: true, haptics: true }}
          opponentSkill={skill} opponentAggression={aggression} seed={seed}
          onDone={(o) => { setOutcome(o); setFighting(false) }} />
      </>
    )

  const result = outcome && (outcome.defenderHp <= 0 ? (outcome.attackerHp > 0 ? 'You won' : 'Both fell')
    : outcome.attackerHp <= 0 ? 'You lost' : 'A draw: the defender holds')
  const pick = (value: Role, set: (r: Role) => void, owner: Court, label: string) => (
    <div className="row-pick" role="group" aria-label={label}>
      {ROLES.map((r) => (
        <button key={r} className={value === r ? 'on' : undefined} aria-pressed={value === r} onClick={() => { set(r); setOutcome(null) }}>
          {ROLE_NAMES[owner][r]}
        </button>
      ))}
    </div>
  )
  return (
    <main className="app menu">
      <PageArt icon="target" />
      <h2>Practice Arena</h2>
      <p className="tagline">Fight any piece against any other. Nothing is saved.</p>
      <h3>Your court</h3>
      <div className="row-pick">
        {(['solari', 'umbral'] as Court[]).map((c) => (
          <button key={c} className={court === c ? 'on' : undefined} onClick={() => { setCourt(c); setOutcome(null) }}>{c === 'solari' ? 'Solari' : 'Umbral'}</button>
        ))}
      </div>
      <h3>Your piece (attacks)</h3>
      {pick(mine, setMine, court, 'Your piece')}
      <h3>Opponent piece (defends)</h3>
      {pick(theirs, setTheirs, foe, 'Opponent piece')}
      <h3>Light on the square</h3>
      <div className="row-pick">
        {LIGHTS.map((l) => (
          <button key={l} className={light === l ? 'on' : undefined} onClick={() => { setLight(l); setOutcome(null) }}>{l > 0 ? `+${l}` : l}</button>
        ))}
      </div>
      <h3>Opponent skill</h3>
      <div className="row-pick">
        {DIFFICULTY_LIST.map((d) => (
          <button key={d} className={difficulty === d ? 'on' : undefined} onClick={() => setDifficulty(d)}>{d[0].toUpperCase() + d.slice(1)}</button>
        ))}
      </div>
      <div className="setup-card">
        <div className="odds" aria-label="Win odds">
          <span className={`odds-a ${court}`} style={{ flexGrow: odds.attacker }} />
          <span className="odds-o" style={{ flexGrow: odds.other }} />
          <span className={`odds-d ${foe}`} style={{ flexGrow: odds.defender }} />
        </div>
        <p className="odds-text">You {pct(odds.attacker)} · Draw {pct(odds.other)} · Opponent {pct(odds.defender)}</p>
        {result && <p className="practice-out" role="status">{result}</p>}
      </div>
      <div className="menu-buttons stacked">
        <button className="primary" onClick={() => { setSeed(Date.now()); setOutcome(null); setFighting(true) }}><Icon name="swords" />Fight</button>
        <button onClick={onBack}><Icon name="back" />Back</button>
      </div>
    </main>
  )
}
