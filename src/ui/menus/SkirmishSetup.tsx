import { useState } from 'react'
import { DIFFICULTY_LIST, type Difficulty } from '../../ai/profile'
import { BOARDS, boardById } from '../../engine/data/boards'
import { CLASSIC_ROLES, draftCost, draftProblem } from '../../engine/data/draft'
import { matchesPreset, presetById, PRESETS, RULESETS, rulesetById, SETUP_INFO, type Preset, type RuleGroup, type RulesetId, type PresetRules, type SetupChoice, type SetupMode } from '../../engine/data/setups'
import { MODE_INFO } from '../../engine/rules/events'
import type { CycleId } from '../../engine/rules/luminance'
import { LOADOUT_SIZE, loadoutProblem, spellPool } from '../../engine/rules/spells'
import { BANK_SECONDS } from '../../clock'
import { DraftPicker } from './DraftPicker'
import { LoadoutPicker } from './LoadoutPicker'
import { ShareButton } from '../ShareButton'
import { Icon, type IconName } from './icons'
import { SkirmishArt } from './MenuArt'
import { PieceArt } from '../../art/PieceArt'
import { BOARD_STARS, boardUnlocked, presetUnlocked, totalStars, type Progress } from '../../progress'
import type { Court, MatchMode, Role, Spell } from '../../engine/rules/types'

interface Props {
  progress: Progress
  /** The Rules tier the screen opens on; Classic for a player fresh from the tutorial. */
  initialTier?: RulesetId
  /** `hotSeat` means a second person takes the other court; the difficulty is then unused. */
  onStart: (human: Court, difficulty: Difficulty, setup: SetupChoice, hotSeat: boolean) => void
  /** The link to a challenge for the settings chosen, with a fresh seed. */
  challengeLink: (human: Court, difficulty: Difficulty, setup: SetupChoice, hotSeat: boolean) => string
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

/** Seconds per turn for Blitz; 0 means untimed. */
const CLOCKS: { seconds: number; name: string; text: string }[] = [
  { seconds: 0, name: 'Untimed', text: 'Take as long as you like.' },
  { seconds: 30, name: 'Rapid', text: '30 seconds a turn.' },
  { seconds: 15, name: 'Blitz', text: '15 seconds a turn.' },
]

const LEVEL_ICON: Record<Difficulty, IconName> = { easy: 'leaf', normal: 'shield', hard: 'flame' }

const LEVEL_TEXT: Record<Difficulty, string> = {
  easy: 'Slow to react, poor aim, rarely dodges.',
  normal: 'Fair reactions and a two-move lookahead.',
  hard: 'Quick, accurate, and plans three moves ahead.',
}

export function SkirmishSetup({ progress, initialTier = 'standard', onStart, challengeLink, onBack }: Props) {
  const [court, setCourt] = useState<Court>('solari')
  const [difficulty, setDifficulty] = useState<Difficulty>('normal')
  const [hotSeat, setHotSeat] = useState(false)
  const [mode, setMode] = useState<SetupMode>('classic')
  const [boardId, setBoardId] = useState('classic')
  const [roles, setRoles] = useState<Role[]>([...CLASSIC_ROLES])
  const [spellMode, setSpellMode] = useState<'classic' | 'loadout'>('classic')
  const [loadout, setLoadout] = useState<Spell[]>([])
  const [recharge, setRecharge] = useState(false)
  const [winMode, setWinMode] = useState<MatchMode>('beacons')
  const [events, setEvents] = useState(false)
  const [showdown, setShowdown] = useState(initialTier !== 'classic')
  const [cycle, setCycle] = useState<CycleId>('standard')
  const [reverse, setReverse] = useState(false)
  const [clockSeconds, setClockSeconds] = useState(0)
  const [extraTime, setExtraTime] = useState(false)
  const [growth, setGrowth] = useState(false)
  const [promotion, setPromotion] = useState(false)
  const [presetId, setPresetId] = useState<string | null>(null)
  const [rulesId, setRulesId] = useState<RulesetId>(initialTier)
  const tier = rulesetById(rulesId) ?? RULESETS[1]
  const open = (group: RuleGroup) => !tier.locks.includes(group)
  const board = boardById(boardId)
  const ready = (mode !== 'draft' || draftProblem(roles) === null) && (spellMode === 'classic' || loadoutProblem(court, loadout) === null)
  const choice = (): SetupChoice => ({
    mode, board: boardId, roles,
    loadout: spellMode === 'loadout' ? loadout : undefined,
    recharge: recharge ? RECHARGE_ROUNDS : undefined,
    winMode, events, showdown, cycle, reverse, growth, promotion,
    ...(tier.rules.passives === false ? { passives: false } : {}),
    ...(tier.rules.spells ? { spells: tier.rules.spells } : {}),
    clock: clockSeconds ? { seconds: clockSeconds, ...(extraTime ? { bank: BANK_SECONDS } : {}) } : undefined,
  })
  const applyRules = (r: PresetRules) => {
    setWinMode(r.winMode ?? 'beacons')
    setEvents(!!r.events)
    setShowdown(!!r.showdown)
    setCycle(r.cycle ?? 'standard')
    setReverse(!!r.reverse)
    setGrowth(!!r.growth)
    setPromotion(!!r.promotion)
    setRecharge(!!r.recharge)
    setClockSeconds(r.clock?.seconds ?? 0)
    setExtraTime(!!r.clock?.bank)
  }
  const applyPreset = (preset: Preset) => {
    setPresetId(preset.id)
    applyRules(preset.rules)
  }
  /** A tier starts every option from its own defaults, so nothing hidden is left switched on. */
  const applyTier = (id: RulesetId) => {
    setRulesId(id)
    setPresetId(null)
    applyRules(rulesetById(id)?.rules ?? {})
    setSpellMode('classic')
    setLoadout([])
    if (id === 'classic') setMode('classic')
  }
  const chosenPreset = presetId ? presetById(presetId) : undefined
  const customised = !!chosenPreset && !matchesPreset(choice(), chosenPreset)
  const summary = {
    classic: 'The standard 12-piece army for both courts.',
    draft: `Your drafted army: ${roles.length + 1} pieces for ${draftCost(roles)} points. The AI drafts its own.`,
    random: 'A fresh random army, the same for both courts.',
    daily: "Today's board and army, identical for every player today.",
  }[mode]
  return (
    <main className="app menu">
      <SkirmishArt />
      <h2>Skirmish</h2>
      <h3>Players</h3>
      <div className="choices row">
        <button className={`choice${!hotSeat ? ' on' : ''}`} onClick={() => setHotSeat(false)}>
          <strong><Icon name="swords" />One Player</strong>
          <span>Play against the AI.</span>
        </button>
        <button className={`choice${hotSeat ? ' on' : ''}`} onClick={() => { setHotSeat(true); setSpellMode('classic'); if (mode === 'draft') setMode('classic') }}>
          <strong><Icon name="banner" />Two Players</strong>
          <span>Share this device, taking turns. Duels are settled automatically.</span>
        </button>
      </div>
      {!hotSeat && <h3>Your court</h3>}
      {!hotSeat && <div className="choices">
        {COURTS.map((c) => (
          <button key={c.court} className={`choice ${c.court}${court === c.court ? ' on' : ''}`} onClick={() => { setCourt(c.court); setLoadout([]) }}>
            <svg className="avatar" viewBox="-0.45 -0.45 0.9 0.9" aria-hidden="true"><PieceArt role="leader" court={c.court} /></svg>
            <strong><Icon name={c.icon} />{c.name}</strong>
            <span>{c.text}</span>
          </button>
        ))}
      </div>}
      {!hotSeat && <h3>Opponent</h3>}
      {!hotSeat && <div className="choices">
        {DIFFICULTY_LIST.map((d) => (
          <button key={d} className={`choice${difficulty === d ? ' on' : ''}`} onClick={() => setDifficulty(d)}>
            <strong><Icon name={LEVEL_ICON[d]} />{d[0].toUpperCase() + d.slice(1)}</strong>
            <span>{LEVEL_TEXT[d]}</span>
          </button>
        ))}
      </div>}
      <h3>Rules</h3>
      <div className="choices row">
        {RULESETS.map((t) => (
          <button key={t.id} className={`choice${rulesId === t.id ? ' on' : ''}`} onClick={() => applyTier(t.id)}>
            <strong><Icon name={t.icon} />{t.name}</strong>
            <span>{t.text}</span>
          </button>
        ))}
      </div>
      <h3>Presets{customised && <small> · customised</small>}</h3>
      {!tier.presets && <div className="setup-card">Presets need Advanced rules.</div>}
      {tier.presets && <div className="choices row">
        {PRESETS.map((pr) => {
          const open = presetUnlocked(progress, pr)
          return (
            <button key={pr.id} className={`choice${chosenPreset === pr ? ' on' : ''}`} disabled={!open} onClick={() => applyPreset(pr)}>
              <strong>{!open && <Icon name="lock" />}<Icon name={pr.icon} />{pr.name}{chosenPreset === pr && customised ? ' (customised)' : ''}</strong>
              <span>{open ? `${pr.text} ${'★'.repeat(pr.difficulty)}` : `Earn ${pr.stars} campaign stars to unlock.`}</span>
            </button>
          )
        })}
      </div>}
      {open('army') && <h3>Army</h3>}
      {open('army') && <div className="choices row">
        {(Object.keys(SETUP_INFO) as SetupMode[]).map((m) => (
          <button key={m} className={`choice${mode === m ? ' on' : ''}`} disabled={hotSeat && m === 'draft'} onClick={() => setMode(m)}>
            <strong>{SETUP_INFO[m].name}</strong>
            <span>{SETUP_INFO[m].text}</span>
          </button>
        ))}
      </div>}
      {mode === 'draft' && open('army') && <DraftPicker court={court} roles={roles} onChange={setRoles} stars={totalStars(progress)} />}
      {open('spells') && <h3>Spells</h3>}
      {open('spells') && <div className="choices row">
        <button className={`choice${spellMode === 'classic' ? ' on' : ''}`} onClick={() => setSpellMode('classic')}>
          <strong>Classic</strong>
          <span>The seven classic spells.</span>
        </button>
        <button className={`choice${spellMode === 'loadout' ? ' on' : ''}`} disabled={hotSeat}
          onClick={() => { setSpellMode('loadout'); setLoadout((l) => l.filter((sp) => spellPool(court).includes(sp)).slice(0, LOADOUT_SIZE)) }}>
          <strong>Loadout</strong>
          <span>{hotSeat ? 'Not available with two players.' : `Pick ${LOADOUT_SIZE} from the shared pool and your court's signatures.`}</span>
        </button>
      </div>}
      {spellMode === 'loadout' && open('spells') && <LoadoutPicker court={court} spells={loadout} onChange={setLoadout} stars={totalStars(progress)} />}
      {open('recharge') && <label className="recharge"><input type="checkbox" checked={recharge} onChange={() => setRecharge((r) => !r)} /> Spells recharge after {RECHARGE_ROUNDS} rounds</label>}
      {open('win') && <h3>Win condition</h3>}
      {open('win') && <div className="choices row">
        {(Object.keys(MODE_INFO) as MatchMode[]).map((m) => (
          <button key={m} className={`choice${winMode === m ? ' on' : ''}`} onClick={() => setWinMode(m)}>
            <strong>{MODE_INFO[m].name}</strong>
            <span>{MODE_INFO[m].text}</span>
          </button>
        ))}
      </div>}
      {open('cycle') && <h3>Light</h3>}
      {open('cycle') && <div className="choices row">
        {CYCLES.map((c) => (
          <button key={c.id} className={`choice${cycle === c.id ? ' on' : ''}`} onClick={() => setCycle(c.id)}>
            <strong>{c.name}</strong>
            <span>{c.text}</span>
          </button>
        ))}
      </div>}
      {open('reverse') && <label className="recharge"><input type="checkbox" checked={reverse} onChange={() => setReverse((r) => !r)} /> The light starts running the other way</label>}
      {open('events') && <label className="recharge"><input type="checkbox" checked={events} onChange={() => setEvents((e) => !e)} /> Day events (Solar Flare, Gloaming, Fog, Blight)</label>}
      {open('showdown') && <label className="recharge"><input type="checkbox" checked={showdown} onChange={() => setShowdown((d) => !d)} /> Eclipse showdown: the outer squares turn deadly, closing in on the centre</label>}
      {open('growth') && <label className="recharge"><input type="checkbox" checked={growth} onChange={() => setGrowth((g) => !g)} /> Veterancy: 2 duel wins add 1 max HP, 4 earn a perk</label>}
      {open('promotion') && <label className="recharge"><input type="checkbox" checked={promotion} onChange={() => setPromotion((p) => !p)} /> Promotion: a Footsoldier reaching the far column becomes a Charger or Marksman</label>}
      {open('clock') && <h3>Turn clock</h3>}
      {open('clock') && <div className="choices row">
        {CLOCKS.map((c) => (
          <button key={c.seconds} className={`choice${clockSeconds === c.seconds ? ' on' : ''}`} onClick={() => setClockSeconds(c.seconds)}>
            <strong>{c.name}</strong>
            <span>{c.text}</span>
          </button>
        ))}
      </div>}
      {clockSeconds > 0 && open('clock') && <label className="recharge"><input type="checkbox" checked={extraTime} onChange={() => setExtraTime((v) => !v)} /> Extra time: {BANK_SECONDS} seconds per court, spent only after a turn runs out</label>}
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
        <button className="primary" disabled={!ready} onClick={() => onStart(court, difficulty, choice(), hotSeat)}><Icon name="play" />Start</button>
        {ready && <ShareButton title="Eclipse Court challenge" label="Copy Challenge Link" link={() => challengeLink(court, difficulty, choice(), hotSeat)} />}
        <button onClick={onBack}><Icon name="back" />Back</button>
      </div>
    </main>
  )
}
