import { useState } from 'react'
import { DIFFICULTY_LIST, type Difficulty } from '../../ai/profile'
import { BOARDS, GRAND_BOARDS, boardById, grandBoardById } from '../../engine/data/boards'
import { CLASSIC_ROLES, DRAFT_ROLES, draftCost, draftProblem } from '../../engine/data/draft'
import { matchesPreset, presetById, skirmishConfig, PRESETS, RULESETS, rulesetById, SETUP_INFO, type Preset, type RuleGroup, type RulesetId, type PresetRules, type SetupChoice, type SetupMode } from '../../engine/data/setups'
import { MODE_INFO } from '../../engine/rules/events'
import type { CycleId } from '../../engine/rules/luminance'
import { LOADOUT_SIZE, loadoutProblem, spellPool } from '../../engine/rules/spells'
import { BANK_SECONDS } from '../../clock'
import { FOG_SIGHT, HEAD_START_LEVELS, shardMultiplier, SUDDEN_DEATH_ROUNDS } from '../../engine/data/modifiers'
import { DraftPicker } from './DraftPicker'
import { LoadoutPicker } from './LoadoutPicker'
import { ShareButton } from '../ShareButton'
import { CourtPicker } from './CourtPicker'
import { Icon } from './icons'
import { LEVEL_ICON } from './levels'
import { changedSections, type SectionId } from './menuModel'
import { Section, Segmented, ToggleRow, type SegOption } from './SetupControls'
import { TipCard } from '../tips/TipCard'
import { SkirmishArt } from './MenuArt'
import { BOARD_STARS, GRAND_STARS, boardUnlocked, presetUnlocked, totalStars, type Progress } from '../../progress'
import type { Court, MatchMode, Role, Spell } from '../../engine/rules/types'
import { bountiesFor } from '../../engine/data/bounties'
import { claimedOn } from '../../bounties'
import { dailySeed } from '../../engine/data/setups'
import { BackButton } from './BackButton'
import { bool, list, loadChoices, oneOf, saveChoices } from '../../lastChoices'

interface Props {
  progress: Progress
  /** The Rules tier the screen opens on; Classic for a player fresh from the tutorial. */
  initialTier?: RulesetId
  /** `hotSeat` means a second person takes the other court; the difficulty is then unused. */
  onStart: (human: Court, difficulty: Difficulty, setup: SetupChoice, hotSeat: boolean) => void
  /** Hosts an online game: the court is the host's own and the match is the one set up. */
  onHost?: (human: Court, setup: SetupChoice) => void
  /** Hosting starts a game played by passing links, not a live connection. */
  byLink?: boolean
  /** The link to a challenge for the settings chosen, with a fresh seed. */
  challengeLink: (human: Court, difficulty: Difficulty, setup: SetupChoice, hotSeat: boolean) => string
  onBack: () => void
}

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


const LEVEL_TEXT: Record<Difficulty, string> = {
  easy: 'Slow to react, poor aim, rarely dodges.',
  normal: 'Fair reactions and a two-move lookahead.',
  hard: 'Quick, accurate, and plans three moves ahead.',
}

export function SkirmishSetup({ progress, initialTier = 'standard', onStart, onHost, byLink, challengeLink, onBack }: Props) {
  const [saved] = useState(() => loadChoices('skirmish'))
  const grandOpen = totalStars(progress) >= GRAND_STARS
  const startGrand = bool(saved.grand, false) && grandOpen
  const startBoards = startGrand ? GRAND_BOARDS : BOARDS
  const startBoard = oneOf(saved.boardId, startBoards.map((b) => b.id).filter((id) => boardUnlocked(progress, id)), startGrand ? GRAND_BOARDS[0].id : 'classic')
  const startTwo = !onHost && bool(saved.twoPlayers, false)
  const startMode = oneOf(saved.mode, Object.keys(SETUP_INFO) as SetupMode[], 'classic')
  const startRoles = list(saved.roles, DRAFT_ROLES)
  const startPreset = typeof saved.presetId === 'string' ? presetById(saved.presetId) : undefined
  const [court, setCourt] = useState<Court>(() => oneOf<Court>(saved.court, ['solari', 'umbral'], 'solari'))
  const [difficulty, setDifficulty] = useState<Difficulty>(() => oneOf(saved.difficulty, DIFFICULTY_LIST, 'normal'))
  const [twoPlayers, setTwoPlayers] = useState(startTwo)
  const [online, setOnline] = useState(!!onHost)
  /** Hot seat and online both pit two people, so neither can draft an army or pick a loadout; the AI is not used. */
  const hotSeat = twoPlayers || online
  const [mode, setMode] = useState<SetupMode>(() => (startGrand ? 'classic' : startMode === 'draft' && (startTwo || onHost) ? 'classic' : startMode))
  const [boardId, setBoardId] = useState(startBoard)
  const [grand, setGrand] = useState(startGrand)
  const [roles, setRoles] = useState<Role[]>(() => (startRoles && !draftProblem(startRoles) ? startRoles : [...CLASSIC_ROLES]))
  const [spellMode, setSpellMode] = useState<'classic' | 'loadout'>(() => (!startTwo && !onHost && saved.spellMode === 'loadout' ? 'loadout' : 'classic'))
  const [loadout, setLoadout] = useState<Spell[]>(() => {
    const picked = list(saved.loadout, spellPool(oneOf<Court>(saved.court, ['solari', 'umbral'], 'solari')))
    return picked && picked.length <= LOADOUT_SIZE ? picked : []
  })
  const [recharge, setRecharge] = useState(() => bool(saved.recharge, false))
  const [winMode, setWinMode] = useState<MatchMode>(() => oneOf(saved.winMode, Object.keys(MODE_INFO) as MatchMode[], 'beacons'))
  const [events, setEvents] = useState(() => bool(saved.events, false))
  const [showdown, setShowdown] = useState(() => bool(saved.showdown, initialTier !== 'classic'))
  const [cycle, setCycle] = useState<CycleId>(() => oneOf(saved.cycle, CYCLES.map((c) => c.id), 'standard'))
  const [reverse, setReverse] = useState(() => bool(saved.reverse, false))
  const [clockSeconds, setClockSeconds] = useState(() => oneOf(saved.clockSeconds, CLOCKS.map((c) => c.seconds), 0))
  const [extraTime, setExtraTime] = useState(() => bool(saved.extraTime, false))
  const [growth, setGrowth] = useState(() => bool(saved.growth, false))
  const [promotion, setPromotion] = useState(() => bool(saved.promotion, false))
  const [fog, setFog] = useState(() => bool(saved.fog, false))
  const [suddenDeath, setSuddenDeath] = useState(() => oneOf<number>(saved.suddenDeath, [0, ...SUDDEN_DEATH_ROUNDS], 0))
  const [headStart, setHeadStart] = useState(() => oneOf<number>(saved.headStart, [0, ...HEAD_START_LEVELS], 0))
  const [presetId, setPresetId] = useState<string | null>(() => (startPreset && presetUnlocked(progress, startPreset) ? startPreset.id : null))
  const [rulesId, setRulesId] = useState<RulesetId>(() => oneOf(saved.rulesId, RULESETS.map((t) => t.id), initialTier))
  const tier = rulesetById(rulesId) ?? RULESETS[1]
  const open = (group: RuleGroup) => !tier.locks.includes(group)
  const board = grand ? grandBoardById(boardId) : boardById(boardId)
  const problem: { text: string; section: SectionId } | null = mode === 'draft' && draftProblem(roles)
    ? { text: draftProblem(roles) as string, section: 'army' }
    : spellMode === 'loadout' && loadoutProblem(court, loadout)
      ? { text: loadoutProblem(court, loadout) as string, section: 'spells' }
      : null
  const ready = problem === null
  const [openSections, setOpenSections] = useState<Record<SectionId, boolean>>({ army: false, spells: false, win: false, hazards: false, clock: false, twists: false })
  const reveal = (...ids: SectionId[]) => setOpenSections((o) => ({ ...o, ...Object.fromEntries(ids.map((id) => [id, true])) }))
  const choice = (): SetupChoice => ({
    mode: grand ? 'classic' : mode, board: boardId, roles,
    ...(grand ? { size: 9 as const } : {}),
    loadout: spellMode === 'loadout' ? loadout : undefined,
    recharge: recharge ? RECHARGE_ROUNDS : undefined,
    winMode, events, showdown, cycle, reverse, growth, promotion,
    ...(tier.rules.passives === false ? { passives: false } : {}),
    ...(tier.rules.spells ? { spells: tier.rules.spells } : {}),
    clock: clockSeconds ? { seconds: clockSeconds, ...(extraTime ? { bank: BANK_SECONDS } : {}) } : undefined,
    ...(fog ? { fog } : {}), ...(suddenDeath ? { suddenDeath } : {}), ...(headStart ? { headStart } : {}),
  })
  const remember = () => saveChoices('skirmish', {
    court, difficulty, twoPlayers, mode, boardId, grand, roles, spellMode, loadout, recharge, winMode, events, showdown, cycle, reverse,
    clockSeconds, extraTime, growth, promotion, fog, suddenDeath, headStart, presetId, rulesId,
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
    reveal(...changedSections({ rules: preset.rules, armyMode: 'classic', boardId: 'classic', spellMode: 'classic' }, tier.rules))
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
    classic: grand ? 'The 16-piece Grand army for both courts, with longer reach for every piece.' : 'The standard 12-piece army for both courts.',
    draft: `Your drafted army: ${roles.length + 1} pieces for ${draftCost(roles)} points. The AI drafts its own.`,
    random: 'A fresh random army, the same for both courts.',
    daily: "Today's board and army, identical for every player today.",
  }[mode]
  const boardLabel = !grand && mode === 'daily' ? 'the daily board' : `${board.name} board`
  const changed = new Set(changedSections({
    rules: {
      winMode, events, showdown, cycle, reverse, growth, promotion,
      recharge: recharge ? RECHARGE_ROUNDS : undefined,
      clock: clockSeconds ? { seconds: clockSeconds, ...(extraTime ? { bank: BANK_SECONDS } : {}) } : undefined,
    },
    armyMode: mode, boardId, spellMode,
  }, tier.rules))
  const twistList = [fog && 'Fog of war', suddenDeath > 0 && `Sudden death ${suddenDeath}`, headStart > 0 && `AI +${headStart} HP`].filter(Boolean)
  // The multiplier is for a match against the computer; two people share it, so none is promised then.
  const bonus = hotSeat ? 1 : shardMultiplier(skirmishConfig(choice(), court, 1), court)
  const clockName = CLOCKS.find((c) => c.seconds === clockSeconds)?.name ?? 'Untimed'
  const hazards = [
    open('events') && events && 'Events',
    open('showdown') && showdown && 'Showdown',
    open('growth') && growth && 'Veterancy',
    open('promotion') && promotion && 'Promotion',
  ].filter(Boolean)
  const summaries: Record<SectionId, string> = {
    army: `${open('army') && !grand ? `${SETUP_INFO[mode].name} army · ` : ''}${!grand && mode === 'daily' ? 'Daily board' : `${board.name} board`}`,
    spells: [spellMode === 'loadout' ? `Loadout ${loadout.length}/${LOADOUT_SIZE}` : 'Classic spells', recharge && open('recharge') && 'recharging'].filter(Boolean).join(' · '),
    win: [open('win') && MODE_INFO[winMode].name, open('cycle') && `${CYCLES.find((c) => c.id === cycle)?.name} day`, open('reverse') && reverse && 'reversed'].filter(Boolean).join(' · '),
    hazards: hazards.length ? hazards.join(' · ') : 'None',
    clock: clockSeconds ? `${clockName}${extraTime ? ' + extra time' : ''}` : 'Untimed',
    twists: twistList.length ? twistList.join(' · ') : 'None',
  }
  const sectionProps = (id: SectionId) => ({
    summary: summaries[id], changed: changed.has(id) || (id === 'twists' && twistList.length > 0), open: openSections[id],
    onToggle: (o: boolean) => setOpenSections((cur) => ({ ...cur, [id]: o })),
  })
  const onlineOption: SegOption<'one' | 'two' | 'online'> = { value: 'online', label: byLink ? 'By Link' : 'Online', icon: 'chain', hint: byLink ? 'Pass links back and forth, one move at a time. Duels are settled automatically.' : 'Host a game for a friend on another device. Duels are settled automatically.' }
  // Hosting a game is already an online choice, so it is the only one offered then.
  const players: SegOption<'one' | 'two' | 'online'>[] = onHost ? [onlineOption] : [
    { value: 'one', label: 'One Player', icon: 'swords', hint: 'Play against the AI.' },
    { value: 'two', label: 'Two Players', icon: 'versus', hint: 'Share this device, taking turns. Duels are settled automatically.' },
  ]
  const opponents: SegOption<Difficulty>[] = DIFFICULTY_LIST.map((d) => ({ value: d, label: d[0].toUpperCase() + d.slice(1), icon: LEVEL_ICON[d], hint: LEVEL_TEXT[d] }))
  const tiers: SegOption<RulesetId>[] = RULESETS.map((t) => ({ value: t.id, label: t.name, icon: t.icon, hint: t.text }))
  const armies: SegOption<SetupMode>[] = (Object.keys(SETUP_INFO) as SetupMode[]).map((m) => ({
    value: m, label: SETUP_INFO[m].name, hint: SETUP_INFO[m].text, disabled: hotSeat && m === 'draft',
  }))
  const shownBoards = grand ? GRAND_BOARDS : BOARDS
  const boards: SegOption<string>[] = shownBoards.map((b) => ({
    value: b.id, label: b.name, hint: b.text, locked: !boardUnlocked(progress, b.id), disabled: (!grand && mode === 'daily') || !boardUnlocked(progress, b.id),
  }))
  const boardNote = !grand && mode === 'daily' ? 'The daily game picks its own board.'
    : [board.text, ...shownBoards.filter((b) => !boardUnlocked(progress, b.id)).map((b) => `${b.name}: earn ${BOARD_STARS[b.id]} campaign stars to unlock.`)].join(' ')
  const sizes: SegOption<'standard' | 'grand'>[] = [
    { value: 'standard', label: 'Standard 7x7', hint: 'The classic board and 12-piece armies.' },
    { value: 'grand', label: 'Grand 9x9', hint: 'A wider board with 16 pieces a side. Footsoldiers, Bruisers and Marksmen reach further, and the Leader teleports 5.', locked: !grandOpen, disabled: !grandOpen },
  ]
  const setSize = (v: 'standard' | 'grand') => {
    setGrand(v === 'grand')
    setBoardId(v === 'grand' ? GRAND_BOARDS[0].id : 'classic')
    setMode('classic')
  }
  const spellModes: SegOption<'classic' | 'loadout'>[] = [
    { value: 'classic', label: 'Classic', hint: 'The seven classic spells.' },
    { value: 'loadout', label: 'Loadout', hint: `Pick ${LOADOUT_SIZE} from the shared pool and your court's signatures.`, disabled: hotSeat },
  ]
  const wins: SegOption<MatchMode>[] = (Object.keys(MODE_INFO) as MatchMode[]).map((m) => ({ value: m, label: MODE_INFO[m].name, hint: MODE_INFO[m].text }))
  const cycles: SegOption<CycleId>[] = CYCLES.map((c) => ({ value: c.id, label: c.name, hint: c.text }))
  const clocks: SegOption<number>[] = CLOCKS.map((c) => ({ value: c.seconds, label: c.name, hint: c.text }))
  const showSpells = open('spells') || open('recharge')
  const showWin = open('win') || open('cycle') || open('reverse')
  const showHazards = open('events') || open('showdown') || open('growth') || open('promotion')
  return (
    <main className="app menu setup battle-menu">
      <SkirmishArt />
      <h2>Skirmish</h2>
      {!hotSeat && (
        <details className="tier-fold">
          <summary><h3>Today’s bounties ({claimedOn().length}/{bountiesFor(dailySeed()).length})</h3></summary>
          <ul className="setup-card">
            {bountiesFor(dailySeed()).map((b) => (
              <li key={b.id}>{claimedOn().includes(b.id) ? '✓ ' : ''}{b.text} · +{b.shards} Shards</li>
            ))}
          </ul>
          <p className="setup-hint">Claimed in any skirmish against a Normal or Hard AI.</p>
        </details>
      )}
      <div className="setup-card">
        <strong>{tier.name} rules · {grand ? 'Grand' : SETUP_INFO[mode].name} army on {boardLabel} · {online ? (byLink ? 'By link' : 'Online') : hotSeat ? 'Two players' : `${difficulty[0].toUpperCase() + difficulty.slice(1)} AI`}.</strong> {summary}
      </div>
      <h3>Players</h3>
      <Segmented label="Players" options={players} value={online ? 'online' : twoPlayers ? 'two' : 'one'} onChange={(v) => {
        setTwoPlayers(v === 'two')
        setOnline(v === 'online')
        if (v === 'two') { setSpellMode('classic'); if (mode === 'draft') setMode('classic') }
      }} />
      {!twoPlayers && <h3>Your court</h3>}
      {!twoPlayers && <CourtPicker value={court} onChange={(c) => { setCourt(c); setLoadout([]) }} />}
      {!hotSeat && <h3>Opponent</h3>}
      {!hotSeat && <Segmented label="Opponent" options={opponents} value={difficulty} onChange={setDifficulty} />}
      <h3>Rules</h3>
      <Segmented label="Rules" options={tiers} value={rulesId} onChange={applyTier} />
      {tier.presets && <h3>Presets{customised && <small> · customised</small>}</h3>}
      {tier.presets && <div className="choices row setup-presets">
        {PRESETS.map((pr) => {
          const unlocked = presetUnlocked(progress, pr)
          return (
            <button key={pr.id} className={`choice${chosenPreset === pr ? ' on' : ''}`} disabled={!unlocked} onClick={() => applyPreset(pr)}>
              <strong>{!unlocked && <Icon name="lock" />}<Icon name={pr.icon} />{pr.name}{chosenPreset === pr && customised ? ' (customised)' : ''}</strong>
              <span>{unlocked ? `${pr.text} ${'★'.repeat(pr.difficulty)}` : `Earn ${pr.stars} campaign stars to unlock.`}</span>
            </button>
          )
        })}
      </div>}
      <h3>Options</h3>
      <Section title="Army & Board" {...sectionProps('army')}>
        <Segmented label="Board size" options={sizes} value={grand ? 'grand' : 'standard'} onChange={setSize}
          note={grandOpen ? undefined : `Grand 9x9: earn ${GRAND_STARS} campaign stars to unlock.`} />
        {open('army') && !grand && <Segmented label="Army" options={armies} value={mode} onChange={(m) => { setMode(m); if (m === 'draft') reveal('army') }}
          note={hotSeat ? `${SETUP_INFO[mode].text} Draft isn't available with two players.` : undefined} />}
        {!grand && mode === 'draft' && open('army') && <DraftPicker court={court} roles={roles} onChange={setRoles} stars={totalStars(progress)} />}
        <Segmented label="Board" options={boards} value={boardId} onChange={setBoardId} note={boardNote} />
      </Section>
      {showSpells && <Section title="Spells" {...sectionProps('spells')}>
        {open('spells') && <Segmented label="Spells" options={spellModes} value={spellMode}
          onChange={(m) => {
            setSpellMode(m)
            if (m === 'loadout') { setLoadout((l) => l.filter((sp) => spellPool(court).includes(sp)).slice(0, LOADOUT_SIZE)); reveal('spells') }
          }}
          note={hotSeat ? 'Loadouts are not available with two players.' : undefined} />}
        {spellMode === 'loadout' && open('spells') && <LoadoutPicker court={court} spells={loadout} onChange={setLoadout} stars={totalStars(progress)} />}
        {open('recharge') && <ToggleRow label="Recharge" text={`Spells return to the Leader after ${RECHARGE_ROUNDS} rounds.`} checked={recharge} onChange={() => setRecharge((r) => !r)} />}
      </Section>}
      {showWin && <Section title="Win & Light" {...sectionProps('win')}>
        {open('win') && <><h4>Win condition</h4><Segmented label="Win condition" options={wins} value={winMode} onChange={setWinMode} /></>}
        {open('cycle') && <><h4>Light</h4><Segmented label="Light" options={cycles} value={cycle} onChange={setCycle} /></>}
        {open('reverse') && <ToggleRow label="Reverse light" text="The light starts running the other way." checked={reverse} onChange={() => setReverse((r) => !r)} />}
      </Section>}
      {showHazards && <Section title="Hazards & Growth" {...sectionProps('hazards')}>
        {open('events') && <ToggleRow label="Day events" text="Solar Flare, Gloaming, Fog and Blight." checked={events} onChange={() => setEvents((e) => !e)} />}
        {open('showdown') && <ToggleRow label="Eclipse showdown" text="The outer squares turn deadly, closing in on the centre." checked={showdown} onChange={() => setShowdown((d) => !d)} />}
        {open('growth') && <ToggleRow label="Veterancy" text="2 duel wins add 1 max HP, 4 earn a perk." checked={growth} onChange={() => setGrowth((g) => !g)} />}
        {open('promotion') && <ToggleRow label="Promotion" text="A Footsoldier reaching the far column becomes a Charger or Marksman." checked={promotion} onChange={() => setPromotion((p) => !p)} />}
      </Section>}
      {open('clock') && <Section title="Turn clock" {...sectionProps('clock')}>
        <Segmented label="Turn clock" options={clocks} value={clockSeconds} onChange={setClockSeconds} />
        {clockSeconds > 0 && <ToggleRow label="Extra time" text={`${BANK_SECONDS} seconds per court, spent only after a turn runs out.`} checked={extraTime} onChange={() => setExtraTime((v) => !v)} />}
      </Section>}
      <Section title="Twists" {...sectionProps('twists')}>
        <ToggleRow label="Fog of war" text={`Enemy pieces more than ${FOG_SIGHT} squares from yours are hidden. Against the computer only.`} checked={fog} onChange={() => setFog((f) => !f)} />
        <h4>Sudden death</h4>
        <Segmented label="Sudden death" options={[{ value: 0, label: 'Off', hint: 'The game runs its course.' },
          ...SUDDEN_DEATH_ROUNDS.map((r) => ({ value: r, label: `Round ${r}`, hint: `From round ${r}, the first duel that kills a piece ends the game.` }))]}
          value={suddenDeath} onChange={setSuddenDeath} />
        <h4>AI head start</h4>
        <Segmented label="AI head start" options={[{ value: 0, label: 'None', hint: 'An even start.' },
          ...HEAD_START_LEVELS.map((h) => ({ value: h, label: `+${h} HP`, hint: `Every opposing piece starts with ${h} more HP.` }))]}
          value={headStart} onChange={setHeadStart} />
        {bonus > 1 && <p className="setup-note">Twists and a short clock pay {Math.round((bonus - 1) * 100)}% more Shards on a win.</p>}
      </Section>
      <div className="setup-actions">
        {problem && <button className="setup-problem" onClick={() => reveal(problem.section)}>{problem.text}</button>}
        <div className="menu-buttons">
          <BackButton onClick={onBack} />
          {ready && !online && <ShareButton title="Eclipse Court challenge" label="Share" link={() => challengeLink(court, difficulty, choice(), hotSeat)} />}
          <button className="primary" disabled={!ready} onClick={() => { remember(); if (online) onHost?.(court, choice()); else onStart(court, difficulty, choice(), hotSeat) }}><Icon name="play" />{online && !byLink ? 'Host' : 'Start'}</button>
        </div>
      </div>
      <TipCard page="skirmish" />
    </main>
  )
}
