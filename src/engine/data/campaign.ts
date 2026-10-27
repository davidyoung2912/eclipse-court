import type { Difficulty } from './difficulty'
import { newGame } from '../reducer'
import { CLASSIC_SPELLS } from '../rules/spells'
import type { Court, GameState, MatchConfig } from '../rules/types'
import { boardById } from './boards'
import { arrange } from './draft'
import { mapFoe, withHp } from './campaignHelpers'
import { BEGINNER_BATTLES } from './campaignBeginner'
import { NORMAL_BATTLES } from './campaignNormal'
import { EXPERT_BATTLES } from './campaignExpert'
import { GRAND_BATTLES } from './campaignGrand'
import { DEFAULT_CONFIG, grandConfig } from './matchConfig'
import type { Opponent } from './campaignHelpers'

export type { Opponent }

/** Opponents grouped by tier, easiest tier first (the tier is the AI level: easy, normal, hard); each bends the rules, the board or the army in a different way. */
export const CAMPAIGN: readonly Opponent[] = [
  {
    id: 'novice',
    name: 'The Novice',
    blurb: 'Fragile Footsoldiers: 1 HP less each.',
    difficulty: 'easy',
    personality: 'balanced',
    setup: (s, foe) => mapFoe(s, foe, (p) => (p.role === 'footsoldier' ? withHp(p, -1) : p)),
  },
  {
    id: 'archerless',
    name: 'The Archerless',
    blurb: 'A Rusher with no Marksmen, who hunts your pieces from the first move.',
    difficulty: 'easy',
    personality: 'rusher',
    army: ['footsoldier', 'footsoldier', 'footsoldier', 'footsoldier', 'flier', 'flier', 'bruiser', 'charger', 'charger', 'aura'],
  },
  ...BEGINNER_BATTLES,
  {
    id: 'tongue-tied',
    name: 'The Tongue-Tied',
    blurb: 'A Caster whose Leader knows only three spells, on the Ruins board.',
    difficulty: 'normal',
    personality: 'caster',
    board: 'ruins',
    setup: (s, foe) => ({ ...s, spells: { ...s.spells, [foe]: CLASSIC_SPELLS.slice(0, 3) } }),
  },
  {
    id: 'wall',
    name: 'The Wall',
    blurb: 'A Turtle behind Footsoldiers with 2 extra HP, among the Pillars.',
    difficulty: 'normal',
    personality: 'turtle',
    board: 'pillars',
    setup: (s, foe) => mapFoe(s, foe, (p) => (p.role === 'footsoldier' ? withHp(p, 2) : p)),
  },
  {
    id: 'troll-court',
    name: 'The Troll Court',
    blurb: 'Both Marksmen stand as Bruisers. Capture their Leader to win.',
    difficulty: 'normal',
    personality: 'rusher',
    rules: { mode: 'leader' },
    setup: (s, foe) => mapFoe(s, foe, (p) => (p.role === 'marksman' ? { ...p, role: 'bruiser', hp: 10, maxHp: 10 } : p)),
  },
  ...NORMAL_BATTLES,
  {
    id: 'backwards-hour',
    name: 'The Backwards Hour',
    blurb: 'A Grabber racing for the beacons. The day runs in reverse, with day events, on the Flanks. First to 20 points.',
    difficulty: 'hard',
    personality: 'grabber',
    board: 'flanks',
    rules: { mode: 'score', events: true, reverse: true },
  },
  {
    id: 'iron-court',
    name: 'The Iron Court',
    blurb: 'A Turtle with 1 extra HP on every piece; duel wins make Veterans for both courts.',
    difficulty: 'hard',
    personality: 'turtle',
    rules: { growth: true, showdown: true },
    setup: (s, foe) => mapFoe(s, foe, (p) => withHp(p, 1)),
  },
  ...EXPERT_BATTLES,
  {
    id: 'eclipse-queen',
    name: 'The Eclipse Queen',
    blurb: 'Every piece has 2 extra HP.',
    boss: 'The Eclipse falls at round 20, and the outer squares turn deadly.',
    difficulty: 'hard',
    personality: 'caster',
    rules: { eclipseRound: 20, showdown: true, events: true },
    setup: (s, foe) => mapFoe(s, foe, (p) => withHp(p, 2)),
  },
  ...GRAND_BATTLES,
]

/** The 7x7 battles of one tier, in play order; the Grand Court has its own list. */
export const battlesIn = (difficulty: Difficulty) => CAMPAIGN.filter((o) => o.difficulty === difficulty && o.size !== 9)

/** The 9x9 Grand Court battles, in play order. */
export const grandBattles = () => CAMPAIGN.filter((o) => o.size === 9)

/** The Umbral court is the opponent in every campaign battle. */
export const CAMPAIGN_FOE: Court = 'umbral'

/** The opening position of a campaign battle: the player is Solari with the classic army and spells. */
export function campaignGame(opponent: Opponent, seed: number, setup = 'campaign'): GameState {
  if (opponent.size === 9) {
    const grand = grandConfig({ ...opponent.rules, seed, setup }, opponent.board)
    if (opponent.army) grand.umbralLayout = arrange(opponent.army)
    const state = newGame(grand)
    return opponent.setup ? opponent.setup(state, CAMPAIGN_FOE) : state
  }
  const board = boardById(opponent.board)
  const config: MatchConfig = {
    ...DEFAULT_CONFIG, ...opponent.rules, seed, beacons: opponent.rules?.beacons ?? board.beacons, blocked: board.blocked, cells: opponent.rules?.cells ?? board.cells, board: board.id, setup,
  }
  if (opponent.army) config.umbralLayout = arrange(opponent.army)
  const state = newGame(config)
  return opponent.setup ? opponent.setup(state, CAMPAIGN_FOE) : state
}
