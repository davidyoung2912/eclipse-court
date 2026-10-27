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
}

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
  if (choice.loadout) {
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
  if (mode === 'classic') return base
  if (mode === 'draft') {
    const mine = arrange(choice.roles ?? [])
    const theirs = arrange(foeRoles)
    return { ...base, layout: human === 'solari' ? mine : theirs, umbralLayout: human === 'solari' ? theirs : mine }
  }
  return { ...base, layout: arrange(randomDraft(seeded)) }
}
