import { boardById, BOARDS } from './boards'
import { arrange, randomDraft } from './draft'
import { DEFAULT_CONFIG } from './matchConfig'
import { rngNext } from '../rng'
import { DAYS, type CycleId } from '../rules/luminance'
import type { Court, MatchConfig, MatchMode, Role, Spell, TurnClock } from '../rules/types'

export type SetupMode = 'classic' | 'draft' | 'random' | 'daily'

export const SETUP_INFO: Record<SetupMode, { name: string; text: string }> = {
  classic: { name: 'Classic', text: 'The standard army, mirrored.' },
  draft: { name: 'Draft', text: 'Spend a budget on your own army; the AI drafts its own.' },
  random: { name: 'Random', text: 'A random army, the same for both courts.' },
  daily: { name: 'Daily', text: "Today's board and army, the same for everyone." },
}

/** The day number of a `dailySeed`, counted the same way everywhere so that consecutive days differ by one. */
export const dayIndex = (seed: number) => Math.round(Date.UTC(Math.floor(seed / 10000), Math.floor((seed % 10000) / 100) - 1, seed % 100) / 86400000)

/** A day as one number, such as 20261026, so everyone playing it gets the same game. */
export const dailySeed = (date = new Date()) => date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate()

export interface SetupChoice {
  mode: SetupMode
  /** Board variant id; ignored for the daily game, which picks its own. */
  board: string
  /** The human's drafted army, for `draft`. */
  roles?: readonly Role[]
  /** The human's chosen spells; the classic seven when absent. */
  loadout?: readonly Spell[]
  /** Spells return to their Leader after this many rounds; one-use when absent. */
  recharge?: number
  /** How the match is won; Beacons when absent. */
  winMode?: MatchMode
  /** Day events strike. */
  events?: boolean
  /** The Eclipse closes in on the centre. */
  showdown?: boolean
  /** Length of the light's day; standard when absent. */
  cycle?: CycleId
  /** The light starts out running the other way. */
  reverse?: boolean
  /** Each turn is timed; untimed when absent. */
  clock?: TurnClock
  /** Duel wins make Veterans and Elites. */
  growth?: boolean
  /** Footsoldiers that cross the board are promoted. */
  promotion?: boolean
  /** Court passives (Solari fliers in full light, Umbral regeneration in the dark); on when absent. */
  passives?: boolean
  /** Both Leaders carry exactly these spells, whatever `loadout` says. */
  spells?: readonly Spell[]
}

/** The rule choices of a setup: everything a preset can fill in. */
export type PresetRules = Pick<SetupChoice, 'winMode' | 'events' | 'showdown' | 'cycle' | 'reverse' | 'clock' | 'growth' | 'promotion' | 'recharge' | 'passives' | 'spells'>

export interface Preset {
  id: string
  name: string
  icon: 'moon' | 'sparkle' | 'sun' | 'flame'
  text: string
  /** 1 (gentle) to 3 (demanding). */
  difficulty: 1 | 2 | 3
  /** Campaign stars needed to pick it. */
  stars: number
  rules: PresetRules
}

/** Named bundles of rules. Every field that matters is stated, so a preset also switches off what it leaves out. */
export const PRESETS: readonly Preset[] = [
  { id: 'long-night', name: 'Long Night', icon: 'moon', text: 'A long day of fog and blight, ending in an Eclipse showdown.', difficulty: 2, stars: 0,
    rules: { cycle: 'long', events: true, showdown: true } },
  { id: 'blitz-hill', name: 'Blitz Hill', icon: 'flame', text: 'Hold the Hill with 15 seconds a turn.', difficulty: 2, stars: 0,
    rules: { winMode: 'hill', clock: { seconds: 15 } } },
  { id: 'veterans-war', name: "Veteran's War", icon: 'sparkle', text: 'Pieces grow, Footsoldiers promote and spells return.', difficulty: 2, stars: 3,
    rules: { growth: true, promotion: true, recharge: 8 } },
  { id: 'sudden-sun', name: 'Sudden Sun', icon: 'sun', text: 'A swift day with the light running backward, on the Hill.', difficulty: 3, stars: 6,
    rules: { winMode: 'hill', cycle: 'swift', reverse: true } },
]

/** The groups of options on the setup screen that a rules tier can fix. */
export type RuleGroup = 'win' | 'spells' | 'cycle' | 'reverse' | 'showdown' | 'events' | 'growth' | 'promotion' | 'recharge' | 'clock' | 'army'

export type RulesetId = 'classic' | 'standard' | 'advanced'

export interface Ruleset {
  id: RulesetId
  name: string
  icon: 'leaf' | 'shield' | 'flame'
  text: string
  rules: PresetRules
  /** Option groups the tier fixes; the setup screen hides them. */
  locks: readonly RuleGroup[]
  /** Presets are bundles of Advanced rules, so only that tier offers them. */
  presets: boolean
}

/** The spells Classic rules keep: the three that are easiest to read. */
export const CLASSIC_RULES_SPELLS: readonly Spell[] = ['blink', 'mend', 'swap']

/** How many things a player has to track: from the plain core game to every option. Separate from the AI's level. */
export const RULESETS: readonly Ruleset[] = [
  { id: 'classic', name: 'Classic', icon: 'leaf', text: 'Move, duel and hold the beacons. Three simple spells, no extras.',
    rules: { passives: false, showdown: false, spells: CLASSIC_RULES_SPELLS },
    locks: ['win', 'spells', 'cycle', 'reverse', 'showdown', 'events', 'growth', 'promotion', 'recharge', 'clock', 'army'], presets: false },
  { id: 'standard', name: 'Standard', icon: 'shield', text: 'The full game: all seven spells, court gifts and the Eclipse showdown.',
    rules: { showdown: true },
    locks: ['win', 'cycle', 'reverse', 'events', 'growth', 'promotion', 'recharge', 'clock'], presets: false },
  { id: 'advanced', name: 'Advanced', icon: 'flame', text: 'Every option open: Hill, events, growth, recharge, loadouts, the clock and presets.',
    rules: { showdown: true },
    locks: [], presets: true },
]

export const rulesetById = (id: string) => RULESETS.find((r) => r.id === id)

export const presetById = (id: string) => PRESETS.find((p) => p.id === id)

/** The rule fields of a setup in one comparable form, with absent values filled in. */
export const normalRules = (r: Partial<PresetRules>) => ({
  winMode: r.winMode ?? 'beacons',
  events: !!r.events,
  showdown: !!r.showdown,
  cycle: r.cycle ?? 'standard',
  reverse: !!r.reverse,
  growth: !!r.growth,
  promotion: !!r.promotion,
  recharge: r.recharge ?? 0,
  seconds: r.clock?.seconds ?? 0,
  bank: !!r.clock?.bank,
  passives: r.passives ?? true,
  spells: (r.spells ?? []).join(','),
})

/** True while a setup's rules are exactly the preset's. */
export const matchesPreset = (choice: Partial<PresetRules>, preset: Preset) =>
  JSON.stringify(normalRules(choice)) === JSON.stringify(normalRules(preset.rules))

/** The AI court's choices that a skirmish needs beyond the seed. */
export interface FoeChoice {
  roles?: readonly Role[]
  loadout?: readonly Spell[]
}

/**
 * The match settings for a skirmish. `foe` holds the army the AI drafted (used by `draft`) and the
 * spells it carries; the other modes derive everything from the seed.
 */
export function skirmishConfig(choice: SetupChoice, human: Court, seed: number, foe: FoeChoice = {}, date = new Date()): MatchConfig {
  const foeRoles = foe.roles ?? []
  const { mode } = choice
  const seeded = mode === 'daily' ? dailySeed(date) : seed
  const board = boardById(mode === 'daily' ? BOARDS[Math.floor(rngNext(seeded)[0] * BOARDS.length)].id : choice.board)
  const base: MatchConfig = { ...DEFAULT_CONFIG, seed: seeded, beacons: board.beacons, blocked: board.blocked, setup: mode, board: board.id }
  if (choice.spells) base.loadouts = { solari: choice.spells, umbral: choice.spells }
  else if (choice.loadout) {
    const mine = choice.loadout
    const theirs = foe.loadout ?? choice.loadout
    base.loadouts = human === 'solari' ? { solari: mine, umbral: theirs } : { solari: theirs, umbral: mine }
  }
  if (choice.recharge) base.recharge = choice.recharge
  if (choice.winMode && choice.winMode !== 'beacons') base.mode = choice.winMode
  if (choice.events) base.events = true
  if (choice.showdown) base.showdown = true
  if (choice.cycle && choice.cycle !== 'standard') base.day = DAYS[choice.cycle]
  if (choice.reverse) base.reverse = true
  if (choice.clock) base.turnClock = choice.clock
  if (choice.growth) base.growth = true
  if (choice.promotion) base.promotion = true
  if (choice.passives === false) base.passives = false
  if (mode === 'classic') return base
  if (mode === 'draft') {
    const mine = arrange(choice.roles ?? [])
    const theirs = arrange(foeRoles)
    return { ...base, layout: human === 'solari' ? mine : theirs, umbralLayout: human === 'solari' ? theirs : mine }
  }
  return { ...base, layout: arrange(randomDraft(seeded)) }
}
