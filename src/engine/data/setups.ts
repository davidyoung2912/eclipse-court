import { boardById, BOARDS } from './boards'
import { arrange, randomDraft } from './draft'
import { DEFAULT_CONFIG } from './matchConfig'
import { rngNext } from '../rng'
import type { Court, MatchConfig, Role } from '../rules/types'

export type SetupMode = 'classic' | 'draft' | 'random' | 'daily'

export const SETUP_INFO: Record<SetupMode, { name: string; text: string }> = {
  classic: { name: 'Classic', text: 'The standard army, mirrored.' },
  draft: { name: 'Draft', text: 'Spend a budget on your own army; the AI drafts its own.' },
  random: { name: 'Random', text: 'A random army, the same for both courts.' },
  daily: { name: 'Daily', text: "Today's board and army, the same for everyone." },
}

/** A day as one number, such as 20261026, so everyone playing it gets the same game. */
export const dailySeed = (date = new Date()) => date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate()

export interface SetupChoice {
  mode: SetupMode
  /** Board variant id; ignored for the daily game, which picks its own. */
  board: string
  /** The human's drafted army, for `draft`. */
  roles?: readonly Role[]
}

/**
 * The match settings for a skirmish. `foeRoles` is the army the AI drafted, used by `draft`;
 * the other modes derive everything from the seed.
 */
export function skirmishConfig(choice: SetupChoice, human: Court, seed: number, foeRoles: readonly Role[] = []): MatchConfig {
  const { mode } = choice
  const seeded = mode === 'daily' ? dailySeed() : seed
  const board = boardById(mode === 'daily' ? BOARDS[Math.floor(rngNext(seeded)[0] * BOARDS.length)].id : choice.board)
  const base = { ...DEFAULT_CONFIG, seed: seeded, beacons: board.beacons, blocked: board.blocked, setup: mode, board: board.id }
  if (mode === 'classic') return base
  if (mode === 'draft') {
    const mine = arrange(choice.roles ?? [])
    const theirs = arrange(foeRoles)
    return { ...base, layout: human === 'solari' ? mine : theirs, umbralLayout: human === 'solari' ? theirs : mine }
  }
  return { ...base, layout: arrange(randomDraft(seeded)) }
}
