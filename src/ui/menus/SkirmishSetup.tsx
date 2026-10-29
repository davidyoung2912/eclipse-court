import { useState } from 'react'
import { DIFFICULTY_LIST, type Difficulty } from '../../ai/profile'
import { BOARDS, GRAND_BOARDS, boardById, grandBoardById } from '../../engine/data/boards'
import { CLASSIC_ROLES, DRAFT_ROLES, draftCost, draftProblem } from '../../engine/data/draft'
import { matchesPreset, presetById, skirmishConfig, PRESETS, RULESETS, rulesetById, SETUP_INFO, type Preset, type RuleGroup, type RulesetId, type PresetRules, type SetupChoice, type SetupMode } from '../../engine/data/setups'
import { MODE_INFO } from '../../engine/rules/events'
import type { CycleId } from '../../engine/rules/luminance'
import { LOADOUT_SIZE, loadoutProblem, spellPool } from '../../engine/rules/spells'
import { BANK_SECONDS } from '../../clock'
import { MAYHEMS, MAYHEM_INFO } from '../../engine/rules/mayhem'
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
import { PersonaFace } from '../../art/PersonaFace'
import { SkirmishArt } from './MenuArt'
import { BOARD_STARS, GRAND_STARS, boardUnlocked, presetUnlocked, totalStars, type Progress } from '../../progress'
import type { Court, MatchMode, Mayhem, Role, Spell } from '../../engine/rules/types'
import { bountiesFor } from '../../engine/data/bounties'
import { claimedOn } from '../../bounties'
import { dailySeed } from '../../engine/data/setups'
import { BackButton } from './BackButton'
import { type Legacy } from '../../engine/data/legacy'
import { loadLegacy } from '../../legacy'
import { t } from '../../i18n'
import { PERSONAS, personaById } from '../../engine/data/personas'
import { menuLine, PERSONA_CHOICES, type PersonaChoice } from '../../personaMenu'
import { VETERAN_WINS } from '../../engine/rules/growth'
import { bool, list, loadChoices, oneOf, saveChoices } from '../../lastChoices'
import { MAX_NAME, MAX_SAVED_PRESETS, deletePreset, loadPresets, savePreset, type SavedPreset } from '../../savedPresets'

interface Props {
  progress: Progress
  /** The Rules tier the screen opens on; Classic for a player fresh from the tutorial. */
  initialTier?: RulesetId
  /** `hotSeat` means a second person takes the other court; the difficulty is then unused. */
  onStart: (human: Court, difficulty: Difficulty, setup: SetupChoice, hotSeat: boolean, persona: PersonaChoice) => void
  /** Hosts an online game: the court is the host's own and the match is the one set up. */
  onHost?: (human: Court, setup: SetupChoice) => void
  /** Hosting starts a game played by passing links, not a live connection. */
  byLink?: boolean
  /** The link to a challenge for the settings chosen, with a fresh seed. */
  challengeLink: (human: Court, difficulty: Difficulty, setup: SetupChoice, hotSeat: boolean) => string
  onBack: () => void
}

const legacyVeterans = (l: Legacy) => [l.leader, ...l.army].filter((p) => p.wins >= VETERAN_WINS).length

/** Rounds before a cast spell returns, when recharging is on. */
const RECHARGE_ROUNDS = 8

const CYCLES: { id: CycleId }[] = [{ id: 'standard' }, { id: 'swift' }, { id: 'long' }]

/** Seconds per turn for Blitz; 0 means untimed. */
const CLOCKS: { seconds: number; id: 'untimed' | 'rapid' | 'blitz' }[] = [
  { seconds: 0, id: 'untimed' },
  { seconds: 30, id: 'rapid' },
  { seconds: 15, id: 'blitz' },
]

export function SkirmishSetup({ progress, initialTier = 'standard', onStart, onHost, byLink, challengeLink, onBack }: Props) {
  const [saved] = useState(() => loadChoices('skirmish'))
  const grandOpen = totalStars(progress) >= GRAND_STARS
  const startGrand = bool(saved.grand, false) && grandOpen
  const startBoards = startGrand ? GRAND_BOARDS : BOARDS
  const startBoard = oneOf(saved.boardId, startBoards.map((b) => b.id).filter((id) => boardUnlocked(progress, id)), startGrand ? GRAND_BOARDS[0].id : 'classic')
  const startTwo = !onHost && bool(saved.twoPlayers, false)
  const startMode = oneOf(saved.mode, Object.keys(SETUP_INFO) as SetupMode[], 'classic')
  const [legacy] = useState<Legacy | null>(loadLegacy)
  const startRoles = list(saved.roles, DRAFT_ROLES)
  const startPreset = typeof saved.presetId === 'string' ? presetById(saved.presetId) : undefined
  const [court, setCourt] = useState<Court>(() => oneOf<Court>(saved.court, ['solari', 'umbral'], 'solari'))
  const [difficulty, setDifficulty] = useState<Difficulty>(() => oneOf(saved.difficulty, DIFFICULTY_LIST, 'normal'))
  const [persona, setPersona] = useState<PersonaChoice>(() => oneOf<PersonaChoice>(saved.persona, PERSONA_CHOICES, 'none'))
  const [twoPlayers, setTwoPlayers] = useState(startTwo)
  const [online, setOnline] = useState(!!onHost)
  /** Hot seat and online both pit two people, so neither can draft an army or pick a loadout; the AI is not used. */
  const hotSeat = twoPlayers || online
  const [mode, setMode] = useState<SetupMode>(() => (startGrand ? 'classic' : (startMode === 'draft' || startMode === 'legacy') && (startTwo || onHost) ? 'classic' : startMode === 'legacy' && !legacy ? 'classic' : startMode))
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
  const [shuffle, setShuffle] = useState(() => bool(saved.shuffle, false))
  const [mayhem, setMayhem] = useState<Mayhem[]>(() => MAYHEMS.filter((m) => Array.isArray(saved.mayhem) && saved.mayhem.includes(m)))
  const toggleMayhem = (m: Mayhem) => setMayhem((l) => (l.includes(m) ? l.filter((x) => x !== m) : [...l, m]))
  const [presetId, setPresetId] = useState<string | null>(() => (startPreset && presetUnlocked(progress, startPreset) ? startPreset.id : null))
  const [rulesId, setRulesId] = useState<RulesetId>(() => oneOf(saved.rulesId, RULESETS.map((r) => r.id), initialTier))
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
    ...(mode === 'legacy' && legacy ? { legacy } : {}),
    ...(grand ? { size: 9 as const } : {}),
    loadout: spellMode === 'loadout' ? loadout : undefined,
    recharge: recharge ? RECHARGE_ROUNDS : undefined,
    winMode, events, showdown, cycle, reverse, growth, promotion,
    ...(tier.rules.passives === false ? { passives: false } : {}),
    ...(tier.rules.spells ? { spells: tier.rules.spells } : {}),
    clock: clockSeconds ? { seconds: clockSeconds, ...(extraTime ? { bank: BANK_SECONDS } : {}) } : undefined,
    ...(fog ? { fog } : {}), ...(suddenDeath ? { suddenDeath } : {}), ...(headStart ? { headStart } : {}),
    ...(mayhem.length ? { mayhem } : {}),
    ...(shuffle && open('army') && !grand && mode !== 'daily' ? { shuffle } : {}),
  })
  const remember = () => saveChoices('skirmish', {
    court, difficulty, persona, twoPlayers, mode, boardId, grand, roles, spellMode, loadout, recharge, winMode, events, showdown, cycle, reverse,
    clockSeconds, extraTime, growth, promotion, fog, suddenDeath, headStart, mayhem, shuffle, presetId, rulesId,
  })
  const [mine, setMine] = useState<SavedPreset[]>(loadPresets)
  const [mineName, setMineName] = useState('')
  const [mineId, setMineId] = useState<string | null>(null)
  /** What a named preset keeps: the match's rules, army, board and twists, not who plays or which court. */
  const presetChoices = () => ({
    mode, boardId, grand, roles, spellMode, loadout, recharge, winMode, events, showdown, cycle, reverse,
    clockSeconds, extraTime, growth, promotion, fog, suddenDeath, headStart, mayhem, shuffle, rulesId,
  })
  const applyMine = (p: SavedPreset) => {
    const c = p.choices
    const wantGrand = bool(c.grand, false) && grandOpen
    const boards = wantGrand ? GRAND_BOARDS : BOARDS
    const picked = list(c.roles, DRAFT_ROLES)
    const wantMode = oneOf(c.mode, Object.keys(SETUP_INFO) as SetupMode[], 'classic')
    setGrand(wantGrand)
    setBoardId(oneOf(c.boardId, boards.map((b) => b.id).filter((id) => boardUnlocked(progress, id)), wantGrand ? GRAND_BOARDS[0].id : 'classic'))
    setMode(wantGrand || ((wantMode === 'draft' || wantMode === 'legacy') && hotSeat) || (wantMode === 'legacy' && !legacy) ? 'classic' : wantMode)
    setRoles(picked && !draftProblem(picked) ? picked : [...CLASSIC_ROLES])
    const wantLoadout = list(c.loadout, spellPool(court))
    const useLoadout = !hotSeat && c.spellMode === 'loadout' && !!wantLoadout && wantLoadout.length <= LOADOUT_SIZE
    setSpellMode(useLoadout ? 'loadout' : 'classic')
    setLoadout(useLoadout && wantLoadout ? wantLoadout : [])
    setRecharge(bool(c.recharge, false))
    setWinMode(oneOf(c.winMode, Object.keys(MODE_INFO) as MatchMode[], 'beacons'))
    setEvents(bool(c.events, false))
    setShowdown(bool(c.showdown, false))
    setCycle(oneOf(c.cycle, CYCLES.map((x) => x.id), 'standard'))
    setReverse(bool(c.reverse, false))
    setClockSeconds(oneOf(c.clockSeconds, CLOCKS.map((x) => x.seconds), 0))
    setExtraTime(bool(c.extraTime, false))
    setGrowth(bool(c.growth, false))
    setPromotion(bool(c.promotion, false))
    setFog(bool(c.fog, false))
    setSuddenDeath(oneOf<number>(c.suddenDeath, [0, ...SUDDEN_DEATH_ROUNDS], 0))
    setHeadStart(oneOf<number>(c.headStart, [0, ...HEAD_START_LEVELS], 0))
    setMayhem(MAYHEMS.filter((m) => Array.isArray(c.mayhem) && c.mayhem.includes(m)))
    setShuffle(bool(c.shuffle, false))
    setRulesId(oneOf(c.rulesId, RULESETS.map((r) => r.id), 'standard'))
    setPresetId(null)
    setMineId(p.id)
    reveal('army', 'spells', 'win', 'hazards', 'clock', 'twists')
  }
  const saveMine = () => {
    const next = savePreset(mineName, presetChoices())
    setMine(next)
    setMineId(next.find((p) => p.name.toLowerCase() === mineName.trim().toLowerCase())?.id ?? null)
    setMineName('')
  }
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
    classic: grand ? t('setup.sum.grand') : t('setup.sum.classic'),
    draft: t('setup.sum.draft', { pieces: roles.length + 1, points: draftCost(roles) }),
    random: t('setup.sum.random'),
    daily: t('setup.sum.daily'),
    legacy: legacy ? t('setup.sum.legacy', { pieces: legacy.army.length + 1, veterans: legacyVeterans(legacy), relics: legacy.relics.length }) : t('setup.sum.legacyNone'),
  }[mode]
  const boardLabel = !grand && mode === 'daily' ? t('setup.dailyBoardLower') : t('setup.boardOf', { name: board.name })
  const changed = new Set(changedSections({
    rules: {
      winMode, events, showdown, cycle, reverse, growth, promotion,
      recharge: recharge ? RECHARGE_ROUNDS : undefined,
      clock: clockSeconds ? { seconds: clockSeconds, ...(extraTime ? { bank: BANK_SECONDS } : {}) } : undefined,
    },
    armyMode: mode, boardId, spellMode,
  }, tier.rules))
  const twistList = [fog && t('setup.fogName'), suddenDeath > 0 && t('setup.suddenN', { n: suddenDeath }), headStart > 0 && t('setup.headStartN', { n: headStart }), ...mayhem.map((m) => MAYHEM_INFO[m].name)].filter(Boolean)
  // The multiplier is for a match against the computer; two people share it, so none is promised then.
  const bonus = hotSeat ? 1 : shardMultiplier(skirmishConfig(choice(), court, 1), court)
  const clockName = t(`setup.clockName.${CLOCKS.find((c) => c.seconds === clockSeconds)?.id ?? 'untimed'}`)
  const hazards = [
    open('events') && events && t('setup.events'),
    open('showdown') && showdown && t('setup.showdown'),
    open('growth') && growth && t('setup.veterancy'),
    open('promotion') && promotion && t('setup.promotion'),
  ].filter(Boolean)
  const summaries: Record<SectionId, string> = {
    army: `${open('army') && !grand ? `${t('setup.armyOf', { name: SETUP_INFO[mode].name })}${shuffle && mode !== 'daily' ? t('setup.shuffledTag') : ''} · ` : ''}${!grand && mode === 'daily' ? t('setup.dailyBoard') : t('setup.boardOf', { name: board.name })}`,
    spells: [spellMode === 'loadout' ? t('setup.loadoutN', { n: loadout.length, max: LOADOUT_SIZE }) : t('setup.classicSpells'), recharge && open('recharge') && t('setup.recharging')].filter(Boolean).join(' · '),
    win: [open('win') && MODE_INFO[winMode].name, open('cycle') && t('setup.dayOf', { name: t(`setup.cycleName.${cycle}`) }), open('reverse') && reverse && t('setup.reversed')].filter(Boolean).join(' · '),
    hazards: hazards.length ? hazards.join(' · ') : t('setup.none'),
    clock: clockSeconds ? `${clockName}${extraTime ? t('setup.extraTag') : ''}` : t('setup.clockName.untimed'),
    twists: twistList.length ? twistList.join(' · ') : t('setup.none'),
  }
  const sectionProps = (id: SectionId) => ({
    summary: summaries[id], changed: changed.has(id) || (id === 'twists' && twistList.length > 0), open: openSections[id],
    onToggle: (o: boolean) => setOpenSections((cur) => ({ ...cur, [id]: o })),
  })
  const onlineOption: SegOption<'one' | 'two' | 'online'> = { value: 'online', label: byLink ? t('setup.byLink') : t('setup.online'), icon: 'chain', hint: byLink ? t('setup.byLinkHint') : t('setup.onlineHint') }
  // Hosting a game is already an online choice, so it is the only one offered then.
  const players: SegOption<'one' | 'two' | 'online'>[] = onHost ? [onlineOption] : [
    { value: 'one', label: t('setup.onePlayer'), icon: 'swords', hint: t('setup.onePlayerHint') },
    { value: 'two', label: t('setup.twoPlayers'), icon: 'versus', hint: t('setup.twoPlayersHint') },
  ]
  const opponents: SegOption<Difficulty>[] = DIFFICULTY_LIST.map((d) => ({ value: d, label: t(`level.${d}`), icon: LEVEL_ICON[d], hint: t(`setup.levelHint.${d}`) }))
  const voices: SegOption<PersonaChoice>[] = [
    { value: 'none', label: t('setup.voiceNone'), hint: t('setup.voiceNoneHint') },
    { value: 'random', label: t('setup.voiceRandom'), hint: t('setup.voiceRandomHint') },
    ...PERSONAS.map((p) => ({ value: p.id, label: p.name, face: <PersonaFace id={p.id} />, hint: t('setup.personaHint', { fullName: p.fullName, title: p.title }) })),
  ]
  const voiceNote = persona === 'none' ? t('setup.voiceNoneHint')
    : persona === 'random' ? t('setup.voiceRandomHint')
    : t('setup.voiceNote', { fullName: personaById(persona)!.fullName, title: personaById(persona)!.title, line: menuLine(persona, 'picked', 'skirmish') })
  const tiers: SegOption<RulesetId>[] = RULESETS.map((r) => ({ value: r.id, label: r.name, icon: r.icon, hint: r.text }))
  const armies: SegOption<SetupMode>[] = (Object.keys(SETUP_INFO) as SetupMode[]).map((m) => ({
    value: m, label: SETUP_INFO[m].name, hint: SETUP_INFO[m].text, disabled: (hotSeat && (m === 'draft' || m === 'legacy')) || (m === 'legacy' && !legacy),
  }))
  const shownBoards = grand ? GRAND_BOARDS : BOARDS
  const boards: SegOption<string>[] = shownBoards.map((b) => ({
    value: b.id, label: b.name, hint: b.text, locked: !boardUnlocked(progress, b.id), disabled: (!grand && mode === 'daily') || !boardUnlocked(progress, b.id),
  }))
  const boardNote = !grand && mode === 'daily' ? t('setup.dailyBoardNote')
    : [board.text, ...shownBoards.filter((b) => !boardUnlocked(progress, b.id)).map((b) => t('setup.boardLock', { name: b.name, stars: BOARD_STARS[b.id] }))].join(' ')
  const sizes: SegOption<'standard' | 'grand'>[] = [
    { value: 'standard', label: t('setup.sizeStandard'), hint: t('setup.sizeStandardHint') },
    { value: 'grand', label: t('setup.sizeGrand'), hint: t('setup.sizeGrandHint'), locked: !grandOpen, disabled: !grandOpen },
  ]
  const setSize = (v: 'standard' | 'grand') => {
    setGrand(v === 'grand')
    setBoardId(v === 'grand' ? GRAND_BOARDS[0].id : 'classic')
    setMode('classic')
  }
  const spellModes: SegOption<'classic' | 'loadout'>[] = [
    { value: 'classic', label: t('setup.spellClassic'), hint: t('setup.spellClassicHint') },
    { value: 'loadout', label: t('setup.spellLoadout'), hint: t('setup.spellLoadoutHint', { n: LOADOUT_SIZE }), disabled: hotSeat },
  ]
  const wins: SegOption<MatchMode>[] = (Object.keys(MODE_INFO) as MatchMode[]).map((m) => ({ value: m, label: MODE_INFO[m].name, hint: MODE_INFO[m].text }))
  const cycles: SegOption<CycleId>[] = CYCLES.map((c) => ({ value: c.id, label: t(`setup.cycleName.${c.id}`), hint: t(`setup.cycleHint.${c.id}`) }))
  const clocks: SegOption<number>[] = CLOCKS.map((c) => ({ value: c.seconds, label: t(`setup.clockName.${c.id}`), hint: t(`setup.clockHint.${c.id}`) }))
  const showSpells = open('spells') || open('recharge')
  const showWin = open('win') || open('cycle') || open('reverse')
  const showHazards = open('events') || open('showdown') || open('growth') || open('promotion')
  return (
    <main className="app menu setup battle-menu">
      <SkirmishArt />
      <h2>{t('setup.title')}</h2>
      <TipCard float page="skirmish" />
      {!hotSeat && (
        <details className="tier-fold">
          <summary><h3>{t('setup.bounties', { claimed: claimedOn().length, total: bountiesFor(dailySeed()).length })}</h3></summary>
          <ul className="setup-card">
            {bountiesFor(dailySeed()).map((b) => (
              <li key={b.id}>{claimedOn().includes(b.id) ? '✓ ' : ''}{t('setup.bountyRow', { text: b.text, shards: b.shards })}</li>
            ))}
          </ul>
          <p className="setup-hint">{t('setup.bountyNote')}</p>
        </details>
      )}
      <div className="setup-card">
        <strong>{t('setup.cardLine', { tier: tier.name, army: grand ? t('setup.grand') : SETUP_INFO[mode].name, board: boardLabel, who: online ? (byLink ? t('setup.whoLink') : t('setup.online')) : hotSeat ? t('setup.whoTwo') : t('setup.whoAi', { level: t(`level.${difficulty}`) }) })}</strong> {summary}
      </div>
      <h3>{t('setup.hPlayers')}</h3>
      <Segmented label={t('setup.hPlayers')} options={players} value={online ? 'online' : twoPlayers ? 'two' : 'one'} onChange={(v) => {
        setTwoPlayers(v === 'two')
        setOnline(v === 'online')
        if (v === 'two') { setSpellMode('classic'); if (mode === 'draft' || mode === 'legacy') setMode('classic') }
      }} />
      {!twoPlayers && <h3>{t('setup.hCourt')}</h3>}
      {!twoPlayers && <CourtPicker value={court} onChange={(c) => { setCourt(c); setLoadout([]) }} />}
      {!hotSeat && <h3>{t('setup.hOpponent')}</h3>}
      {!hotSeat && <Segmented label={t('setup.hOpponent')} options={opponents} value={difficulty} onChange={setDifficulty} />}
      {!hotSeat && <h3>{t('setup.hNamed')}</h3>}
      {!hotSeat && <Segmented label={t('setup.hNamed')} options={voices} value={persona} onChange={setPersona} note={voiceNote} />}
      <h3>{t('setup.hRules')}</h3>
      <Segmented label={t('setup.hRules')} options={tiers} value={rulesId} onChange={applyTier} />
      {tier.presets && <h3>{t('setup.hPresets')}{customised && <small>{t('setup.customisedDot')}</small>}</h3>}
      {tier.presets && <div className="choices row setup-presets">
        {PRESETS.map((pr) => {
          const unlocked = presetUnlocked(progress, pr)
          return (
            <button key={pr.id} className={`choice${chosenPreset === pr ? ' on' : ''}`} disabled={!unlocked} onClick={() => applyPreset(pr)}>
              <strong>{!unlocked && <Icon name="lock" />}<Icon name={pr.icon} />{pr.name}{chosenPreset === pr && customised ? t('setup.customisedTag') : ''}</strong>
              <span>{unlocked ? t('setup.presetText', { text: pr.text, stars: '★'.repeat(pr.difficulty) }) : t('setup.earnStars', { stars: pr.stars })}</span>
            </button>
          )
        })}
      </div>}
      <h3>{t('setup.hMine')}</h3>
      {mine.length > 0 && <div className="choices row setup-presets">
        {mine.map((p) => (
          <div key={p.id} className="setup-mine">
            <button className={`choice${mineId === p.id ? ' on' : ''}`} onClick={() => applyMine(p)}><strong>{p.name}</strong></button>
            <button className="setup-mine-delete" aria-label={t('setup.deletePreset', { name: p.name })} onClick={() => { setMine(deletePreset(p.id)); if (mineId === p.id) setMineId(null) }}>×</button>
          </div>
        ))}
      </div>}
      <div className="setup-mine-save">
        <input type="text" value={mineName} maxLength={MAX_NAME} placeholder={t('setup.namePlaceholder')} aria-label={t('setup.presetName')}
          onChange={(e) => setMineName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && mineName.trim()) saveMine() }} />
        <button disabled={!mineName.trim() || (mine.length >= MAX_SAVED_PRESETS && !mine.some((p) => p.name.toLowerCase() === mineName.trim().toLowerCase()))} onClick={saveMine}>{t('setup.save')}</button>
      </div>
      <p className="setup-hint">{t('setup.mineHint')}</p>
      <h3>{t('setup.hOptions')}</h3>
      <Section title={t('setup.secArmy')} {...sectionProps('army')}>
        <Segmented label={t('setup.boardSize')} options={sizes} value={grand ? 'grand' : 'standard'} onChange={setSize}
          note={grandOpen ? undefined : t('setup.grandLock', { stars: GRAND_STARS })} />
        {open('army') && !grand && <Segmented label={t('setup.army')} options={armies} value={mode} onChange={(m) => { setMode(m); if (m === 'draft') reveal('army') }}
          note={hotSeat ? t('setup.armyNoteHot', { text: SETUP_INFO[mode].text }) : !legacy ? t('setup.armyNoteLegacy', { text: SETUP_INFO[mode].text }) : undefined} />}
        {open('army') && !grand && mode !== 'daily' && <ToggleRow label={t('setup.shuffle')} text={t('setup.shuffleText')} checked={shuffle} onChange={() => setShuffle((v) => !v)} />}
        {!grand && mode === 'draft' && open('army') && <DraftPicker court={court} roles={roles} onChange={setRoles} stars={totalStars(progress)} />}
        <Segmented label={t('setup.board')} options={boards} value={boardId} onChange={setBoardId} note={boardNote} />
      </Section>
      {showSpells && <Section title={t('setup.secSpells')} {...sectionProps('spells')}>
        {open('spells') && <Segmented label={t('setup.secSpells')} options={spellModes} value={spellMode}
          onChange={(m) => {
            setSpellMode(m)
            if (m === 'loadout') { setLoadout((l) => l.filter((sp) => spellPool(court).includes(sp)).slice(0, LOADOUT_SIZE)); reveal('spells') }
          }}
          note={hotSeat ? t('setup.loadoutHot') : undefined} />}
        {spellMode === 'loadout' && open('spells') && <LoadoutPicker court={court} spells={loadout} onChange={setLoadout} stars={totalStars(progress)} />}
        {open('recharge') && <ToggleRow label={t('setup.recharge')} text={t('setup.rechargeText', { n: RECHARGE_ROUNDS })} checked={recharge} onChange={() => setRecharge((r) => !r)} />}
      </Section>}
      {showWin && <Section title={t('setup.secWin')} {...sectionProps('win')}>
        {open('win') && <><h4>{t('setup.winCondition')}</h4><Segmented label={t('setup.winCondition')} options={wins} value={winMode} onChange={setWinMode} /></>}
        {open('cycle') && <><h4>{t('setup.light')}</h4><Segmented label={t('setup.light')} options={cycles} value={cycle} onChange={setCycle} /></>}
        {open('reverse') && <ToggleRow label={t('setup.reverse')} text={t('setup.reverseText')} checked={reverse} onChange={() => setReverse((r) => !r)} />}
      </Section>}
      {showHazards && <Section title={t('setup.secHazards')} {...sectionProps('hazards')}>
        {open('events') && <ToggleRow label={t('setup.dayEvents')} text={t('setup.dayEventsText')} checked={events} onChange={() => setEvents((e) => !e)} />}
        {open('showdown') && <ToggleRow label={t('setup.eclipseShowdown')} text={t('setup.eclipseShowdownText')} checked={showdown} onChange={() => setShowdown((d) => !d)} />}
        {open('growth') && <ToggleRow label={t('setup.veterancy')} text={t('setup.veterancyText')} checked={growth} onChange={() => setGrowth((g) => !g)} />}
        {open('promotion') && <ToggleRow label={t('setup.promotion')} text={t('setup.promotionText')} checked={promotion} onChange={() => setPromotion((p) => !p)} />}
      </Section>}
      {open('clock') && <Section title={t('setup.secClock')} {...sectionProps('clock')}>
        <Segmented label={t('setup.secClock')} options={clocks} value={clockSeconds} onChange={setClockSeconds} />
        {clockSeconds > 0 && <ToggleRow label={t('setup.extraTime')} text={t('setup.extraTimeText', { seconds: BANK_SECONDS })} checked={extraTime} onChange={() => setExtraTime((v) => !v)} />}
      </Section>}
      <Section title={t('setup.secTwists')} {...sectionProps('twists')}>
        <ToggleRow label={t('setup.fogName')} text={t('setup.fogText', { n: FOG_SIGHT })} checked={fog} onChange={() => setFog((f) => !f)} />
        <h4>{t('setup.suddenDeath')}</h4>
        <Segmented label={t('setup.suddenDeath')} options={[{ value: 0, label: t('setup.off'), hint: t('setup.suddenOffHint') },
          ...SUDDEN_DEATH_ROUNDS.map((r) => ({ value: r, label: t('setup.roundN', { n: r }), hint: t('setup.suddenHint', { n: r }) }))]}
          value={suddenDeath} onChange={setSuddenDeath} />
        <h4>{t('setup.headStart')}</h4>
        <Segmented label={t('setup.headStart')} options={[{ value: 0, label: t('setup.none'), hint: t('setup.headStartOffHint') },
          ...HEAD_START_LEVELS.map((h) => ({ value: h, label: t('setup.hpN', { n: h }), hint: t('setup.headStartHint', { n: h }) }))]}
          value={headStart} onChange={setHeadStart} />
        <h4>{t('setup.mayhem')}</h4>
        {MAYHEMS.map((m) => <ToggleRow key={m} label={MAYHEM_INFO[m].name} text={MAYHEM_INFO[m].text} checked={mayhem.includes(m)} onChange={() => toggleMayhem(m)} />)}
        {bonus > 1 && <p className="setup-note">{t('setup.bonus', { percent: Math.round((bonus - 1) * 100) })}</p>}
      </Section>
      <div className="setup-actions">
        {problem && <button className="setup-problem" onClick={() => reveal(problem.section)}>{problem.text}</button>}
        <div className="menu-buttons">
          <BackButton onClick={onBack} />
          {ready && !online && <ShareButton title={t('setup.shareTitle')} label={t('setup.share')} link={() => challengeLink(court, difficulty, choice(), hotSeat)} />}
          <button className="primary" disabled={!ready} onClick={() => { remember(); if (online) onHost?.(court, choice()); else onStart(court, difficulty, choice(), hotSeat, persona) }}><Icon name="play" />{online && !byLink ? t('setup.host') : t('setup.start')}</button>
        </div>
      </div>
    </main>
  )
}
