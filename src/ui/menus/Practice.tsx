import { useState } from 'react'
import { DIFFICULTY_LIST, DIFFICULTY, type Difficulty } from '../../ai/profile'
import { DRAFT_ROLES } from '../../engine/data/draft'
import { ROLE_NAMES, ROLE_STATS } from '../../engine/data/roster'
import { estimateOdds } from '../../engine/reducer'
import type { Court, DuelOutcome, Piece, Role } from '../../engine/rules/types'
import { PlayTimer } from '../PlayTimer'
import { DuelView } from '../duel/DuelView'
import { CourtPicker } from './CourtPicker'
import { PieceArt } from '../../art/PieceArt'
import { Icon } from './icons'
import { LEVEL_ICON } from './levels'
import { PageArt } from './MenuArt'
import { TipCard } from '../tips/TipCard'
import { BackButton } from './BackButton'
import { loadChoices, oneOf, saveChoices } from '../../lastChoices'
import { t } from '../../i18n'

interface Props {
  onPlaytime: (seconds: number) => void
  /** A duel fought to its end, for the practice record. */
  onDuel: (outcome: DuelOutcome) => void
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
export function Practice({ onPlaytime, onDuel, onBack }: Props) {
  const [saved] = useState(() => loadChoices('practice'))
  const [mine, setMine] = useState<Role>(() => oneOf(saved.mine, ROLES, 'footsoldier'))
  const [theirs, setTheirs] = useState<Role>(() => oneOf(saved.theirs, ROLES, 'footsoldier'))
  const [court, setCourt] = useState<Court>(() => oneOf<Court>(saved.court, ['solari', 'umbral'], 'solari'))
  const [light, setLight] = useState(() => oneOf(saved.light, LIGHTS, 0))
  const [difficulty, setDifficulty] = useState<Difficulty>(() => oneOf(saved.difficulty, DIFFICULTY_LIST, 'normal'))
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
          onDone={(o) => { setOutcome(o); setFighting(false); onDuel(o) }} />
      </>
    )

  const result = outcome && (outcome.defenderHp <= 0 ? (outcome.attackerHp > 0 ? t('practice.won') : t('practice.bothFell'))
    : outcome.attackerHp <= 0 ? t('practice.lost') : t('practice.draw'))
  const pick = (value: Role, set: (r: Role) => void, owner: Court, label: string) => (
    <div className="row-pick" role="group" aria-label={label}>
      {ROLES.map((r) => (
        <button key={r} className={value === r ? 'on' : undefined} aria-pressed={value === r} onClick={() => { set(r); setOutcome(null) }}>
          <svg className="role-icon" viewBox="-0.45 -0.45 0.9 0.9" aria-hidden="true"><PieceArt role={r} court={owner} /></svg>
          {ROLE_NAMES[owner][r]}
        </button>
      ))}
    </div>
  )
  return (
    <main className="app menu battle-menu">
      <PageArt icon="target" />
      <h2>{t('practice.title')}</h2>
      <p className="tagline">{t('practice.tagline')}</p>
      <h3>{t('practice.court')}</h3>
      <CourtPicker value={court} onChange={(c) => { setCourt(c); setOutcome(null) }} />
      <h3>{t('practice.yourPiece')}</h3>
      {pick(mine, setMine, court, t('practice.yourPieceLabel'))}
      <h3>{t('practice.theirPiece')}</h3>
      {pick(theirs, setTheirs, foe, t('practice.theirPieceLabel'))}
      <h3>{t('practice.light')}</h3>
      <div className="row-pick">
        {LIGHTS.map((l) => (
          <button key={l} className={light === l ? 'on' : undefined} onClick={() => { setLight(l); setOutcome(null) }}>{l > 0 ? `+${l}` : l}</button>
        ))}
      </div>
      <h3>{t('practice.skill')}</h3>
      <div className="row-pick">
        {DIFFICULTY_LIST.map((d) => (
          <button key={d} className={difficulty === d ? 'on' : undefined} onClick={() => setDifficulty(d)}><Icon name={LEVEL_ICON[d]} />{t(`level.${d}`)}</button>
        ))}
      </div>
      <div className="setup-card">
        <div className="odds" aria-label={t('practice.odds')}>
          <span className={`odds-a ${court}`} style={{ flexGrow: odds.attacker }} />
          <span className="odds-o" style={{ flexGrow: odds.other }} />
          <span className={`odds-d ${foe}`} style={{ flexGrow: odds.defender }} />
        </div>
        <p className="odds-text">{t('practice.oddsText', { you: pct(odds.attacker), draw: pct(odds.other), foe: pct(odds.defender) })}</p>
        <p className="odds-note">{t('practice.oddsNote')}</p>
        {result && <p className="practice-out" role="status">{result}</p>}
      </div>
      <div className="menu-buttons stacked">
        <button className="primary" onClick={() => { saveChoices('practice', { mine, theirs, court, light, difficulty }); setSeed(Date.now()); setOutcome(null); setFighting(true) }}><Icon name="swords" />{t('practice.fight')}</button>
        <BackButton onClick={onBack} />
      </div>
      <TipCard page="practice" />
    </main>
  )
}
