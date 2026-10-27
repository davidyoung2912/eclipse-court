import { useState } from 'react'
import { DIFFICULTY_LIST, type Difficulty } from '../../ai/profile'
import { BOARDS, boardById } from '../../engine/data/boards'
import { CLASSIC_ROLES, draftCost, draftProblem } from '../../engine/data/draft'
import { SETUP_INFO, type SetupChoice, type SetupMode } from '../../engine/data/setups'
import { MODE_INFO } from '../../engine/rules/events'
import type { CycleId } from '../../engine/rules/luminance'
import { LOADOUT_SIZE, loadoutProblem, spellPool } from '../../engine/rules/spells'
import { DraftPicker } from './DraftPicker'
import { LoadoutPicker } from './LoadoutPicker'
import { Icon, type IconName } from './icons'
import { BOARD_STARS, boardUnlocked, totalStars, type Progress } from '../../progress'
import type { Court, MatchMode, Role, Spell } from '../../engine/rules/types'

interface Props {
  progress: Progress
  onStart: (human: Court, difficulty: Difficulty, setup: SetupChoice) => void
  onBack: () => void
}

const COURTS: { court: Court; name: string; icon: IconName; text: string }[] = [
  { court: 'solari', name: 'Solari', icon: 'sun', text: 'Straight shots and dashes. Moves first.' },
  { court: 'umbral', name: 'Umbral', icon: 'moon', text: 'Lobbed shots and regeneration. Moves second.' },
]

/** Rounds before a cast spell returns, when recharging is on. */
const RECHARGE_ROUNDS = 8

const CYCLES: { id: CycleId; name: string; text: string }[] = [
  { id: 'standard', name: 'Standard', text: 'An 8-round day.' },
  { id: 'swift', name: 'Swift', text: 'A 6-round day.' },
  { id: 'long', name: 'Long', text: 'A 10-round day.' },
]

const LEVEL_ICON: Record<Difficulty, IconName> = { easy: 'leaf', normal: 'shield', hard: 'flame' }

const LEVEL_TEXT: Record<Difficulty, string> = {
  easy: 'Slow to react, poor aim, rarely dodges.',
  normal: 'Fair reactions and a two-move lookahead.',
  hard: 'Quick, accurate, and plans three moves ahead.',
}

export function SkirmishSetup({ progress, onStart, onBack }: Props) {
  const [court, setCourt] = useState<Court>('solari')
  const [difficulty, setDifficulty] = useState<Difficulty>('normal')
  const [mode, setMode] = useState<SetupMode>('classic')
  const [boardId, setBoardId] = useState('classic')
  const [roles, setRoles] = useState<Role[]>([...CLASSIC_ROLES])
  const [spellMode, setSpellMode] = useState<'classic' | 'loadout'>('classic')
  const [loadout, setLoadout] = useState<Spell[]>([])
  const [recharge, setRecharge] = useState(false)
  const [winMode, setWinMode] = useState<MatchMode>('beacons')
  const [events, setEvents] = useState(false)
  const [showdown, setShowdown] = useState(true)
  const [cycle, setCycle] = useState<CycleId>('standard')
  const [reverse, setReverse] = useState(false)
  const [growth, setGrowth] = useState(false)
  const [promotion, setPromotion] = useState(false)
  const board = boardById(boardId)
  const ready = (mode !== 'draft' || draftProblem(roles) === null) && (spellMode === 'classic' || loadoutProblem(court, loadout) === null)
  const summary = {
    classic: 'The standard 12-piece army for both courts.',
    draft: `Your drafted army: ${roles.length + 1} pieces for ${draftCost(roles)} points. The AI drafts its own.`,
    random: 'A fresh random army, the same for both courts.',
    daily: "Today's board and army, identical for every player today.",
  }[mode]
  return (
    <main className="app menu">
      <h2>Skirmish</h2>
      <h3>Your court</h3>
      <div className="choices">
        {COURTS.map((c) => (
          <button key={c.court} className={`choice ${c.court}${court === c.court ? ' on' : ''}`} onClick={() => { setCourt(c.court); setLoadout([]) }}>
            <strong><Icon name={c.icon} />{c.name}</strong>
            <span>{c.text}</span>
          </button>
        ))}
      </div>
      <h3>Opponent</h3>
      <div className="choices">
        {DIFFICULTY_LIST.map((d) => (
          <button key={d} className={`choice${difficulty === d ? ' on' : ''}`} onClick={() => setDifficulty(d)}>
            <strong><Icon name={LEVEL_ICON[d]} />{d[0].toUpperCase() + d.slice(1)}</strong>
            <span>{LEVEL_TEXT[d]}</span>
          </button>
        ))}
      </div>
      <h3>Army</h3>
      <div className="choices row">
        {(Object.keys(SETUP_INFO) as SetupMode[]).map((m) => (
          <button key={m} className={`choice${mode === m ? ' on' : ''}`} onClick={() => setMode(m)}>
            <strong>{SETUP_INFO[m].name}</strong>
            <span>{SETUP_INFO[m].text}</span>
          </button>
        ))}
      </div>
      {mode === 'draft' && <DraftPicker court={court} roles={roles} onChange={setRoles} stars={totalStars(progress)} />}
      <h3>Spells</h3>
      <div className="choices row">
        <button className={`choice${spellMode === 'classic' ? ' on' : ''}`} onClick={() => setSpellMode('classic')}>
          <strong>Classic</strong>
          <span>The seven classic spells.</span>
        </button>
        <button className={`choice${spellMode === 'loadout' ? ' on' : ''}`}
          onClick={() => { setSpellMode('loadout'); setLoadout((l) => l.filter((sp) => spellPool(court).includes(sp)).slice(0, LOADOUT_SIZE)) }}>
          <strong>Loadout</strong>
          <span>Pick {LOADOUT_SIZE} from the shared pool and your court's signatures.</span>
        </button>
      </div>
      {spellMode === 'loadout' && <LoadoutPicker court={court} spells={loadout} onChange={setLoadout} stars={totalStars(progress)} />}
      <label className="recharge"><input type="checkbox" checked={recharge} onChange={() => setRecharge((r) => !r)} /> Spells recharge after {RECHARGE_ROUNDS} rounds</label>
      <h3>Win condition</h3>
      <div className="choices row">
        {(Object.keys(MODE_INFO) as MatchMode[]).map((m) => (
          <button key={m} className={`choice${winMode === m ? ' on' : ''}`} onClick={() => setWinMode(m)}>
            <strong>{MODE_INFO[m].name}</strong>
            <span>{MODE_INFO[m].text}</span>
          </button>
        ))}
      </div>
      <h3>Light</h3>
      <div className="choices row">
        {CYCLES.map((c) => (
          <button key={c.id} className={`choice${cycle === c.id ? ' on' : ''}`} onClick={() => setCycle(c.id)}>
            <strong>{c.name}</strong>
            <span>{c.text}</span>
          </button>
        ))}
      </div>
      <label className="recharge"><input type="checkbox" checked={reverse} onChange={() => setReverse((r) => !r)} /> The light starts running the other way</label>
      <label className="recharge"><input type="checkbox" checked={events} onChange={() => setEvents((e) => !e)} /> Day events (Solar Flare, Gloaming, Fog, Blight)</label>
      <label className="recharge"><input type="checkbox" checked={showdown} onChange={() => setShowdown((d) => !d)} /> Eclipse showdown: the outer squares turn deadly, closing in on the centre</label>
      <label className="recharge"><input type="checkbox" checked={growth} onChange={() => setGrowth((g) => !g)} /> Veterancy: 2 duel wins add 1 max HP, 4 earn a perk</label>
      <label className="recharge"><input type="checkbox" checked={promotion} onChange={() => setPromotion((p) => !p)} /> Promotion: a Footsoldier reaching the far column becomes a Charger or Marksman</label>
      <h3>Board</h3>
      <div className="choices row">
        {BOARDS.map((b) => (
          <button key={b.id} className={`choice${boardId === b.id ? ' on' : ''}`} disabled={mode === 'daily' || !boardUnlocked(progress, b.id)} onClick={() => setBoardId(b.id)}>
            <strong>{!boardUnlocked(progress, b.id) && <Icon name="lock" />}{b.name}</strong>
            <span>{boardUnlocked(progress, b.id) ? b.text : `Earn ${BOARD_STARS[b.id]} campaign stars to unlock.`}</span>
          </button>
        ))}
      </div>
      <div className="setup-card">
        <strong>{SETUP_INFO[mode].name} on {mode === 'daily' ? 'the daily board' : `${board.name} board`}.</strong> {summary}
      </div>
      <div className="menu-buttons stacked">
        <button className="primary" disabled={!ready} onClick={() => onStart(court, difficulty, {
          mode, board: boardId, roles,
          loadout: spellMode === 'loadout' ? loadout : undefined,
          recharge: recharge ? RECHARGE_ROUNDS : undefined,
          winMode, events, showdown, cycle, reverse, growth, promotion,
        })}><Icon name="play" />Start</button>
        <button onClick={onBack}><Icon name="back" />Back</button>
      </div>
    </main>
  )
}
