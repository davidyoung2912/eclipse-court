import type { PersonalityId } from '../../ai/personality'
import type { Difficulty } from '../../ai/profile'
import { newGame } from '../reducer'
import { CLASSIC_SPELLS } from '../rules/spells'
import type { Court, GameState, MatchConfig, Piece, Role } from '../rules/types'
import { boardById } from './boards'
import { arrange } from './draft'
import { DEFAULT_CONFIG } from './matchConfig'

export interface Opponent {
  name: string
  blurb: string
  difficulty: Difficulty
  personality: PersonalityId
  /** Board variant id; classic when absent. */
  board?: string
  /** Match settings beyond the board (win condition, events, showdown, ...). */
  rules?: Partial<MatchConfig>
  /** The Umbral army when it is not the classic one. */
  army?: readonly Role[]
  /** Rewrites the opening position; `foe` is the court the AI plays. */
  setup?: (state: GameState, foe: Court) => GameState
  /** A rule only this opponent plays by; the config and setup above already carry it out. */
  boss?: string
}

const mapFoe = (s: GameState, foe: Court, f: (p: Piece) => Piece): GameState => ({
  ...s,
  pieces: s.pieces.map((p) => (p.court === foe ? f(p) : p)),
})
const withHp = (p: Piece, delta: number): Piece => ({ ...p, hp: p.hp + delta, maxHp: p.maxHp + delta })

/** Eight opponents, easiest first; each bends the rules, the board or the army in a different way. */
export const CAMPAIGN: readonly Opponent[] = [
  {
    name: 'The Novice',
    blurb: 'Fragile Footsoldiers: 1 HP less each.',
    difficulty: 'easy',
    personality: 'balanced',
    setup: (s, foe) => mapFoe(s, foe, (p) => (p.role === 'footsoldier' ? withHp(p, -1) : p)),
  },
  {
    name: 'The Archerless',
    blurb: 'A Rusher with no Marksmen, who hunts your pieces from the first move.',
    difficulty: 'easy',
    personality: 'rusher',
    army: ['footsoldier', 'footsoldier', 'footsoldier', 'footsoldier', 'flier', 'flier', 'bruiser', 'charger', 'charger', 'aura'],
  },
  {
    name: 'The Tongue-Tied',
    blurb: 'A Caster whose Leader knows only three spells, on the Ruins board.',
    difficulty: 'normal',
    personality: 'caster',
    board: 'ruins',
    setup: (s, foe) => ({ ...s, spells: { ...s.spells, [foe]: CLASSIC_SPELLS.slice(0, 3) } }),
  },
  {
    name: 'The Wall',
    blurb: 'A Turtle behind Footsoldiers with 2 extra HP, among the Pillars.',
    difficulty: 'normal',
    personality: 'turtle',
    board: 'pillars',
    setup: (s, foe) => mapFoe(s, foe, (p) => (p.role === 'footsoldier' ? withHp(p, 2) : p)),
  },
  {
    name: 'The Troll Court',
    blurb: 'Both Marksmen stand as Bruisers. Capture their Leader to win.',
    difficulty: 'normal',
    personality: 'rusher',
    rules: { mode: 'leader' },
    setup: (s, foe) => mapFoe(s, foe, (p) => (p.role === 'marksman' ? { ...p, role: 'bruiser', hp: 10, maxHp: 10 } : p)),
  },
  {
    name: 'The Backwards Hour',
    blurb: 'A Grabber racing for the beacons. The day runs in reverse, with day events, on the Flanks. First to 20 points.',
    difficulty: 'hard',
    personality: 'grabber',
    board: 'flanks',
    rules: { mode: 'score', events: true, reverse: true },
  },
  {
    name: 'The Iron Court',
    blurb: 'A Turtle with 1 extra HP on every piece; duel wins make Veterans for both courts.',
    difficulty: 'hard',
    personality: 'turtle',
    rules: { growth: true, showdown: true },
    setup: (s, foe) => mapFoe(s, foe, (p) => withHp(p, 1)),
  },
  {
    name: 'The Eclipse Queen',
    blurb: 'Every piece has 2 extra HP.',
    boss: 'The Eclipse falls at round 20, and the outer squares turn deadly.',
    difficulty: 'hard',
    personality: 'caster',
    rules: { eclipseRound: 20, showdown: true, events: true },
    setup: (s, foe) => mapFoe(s, foe, (p) => withHp(p, 2)),
  },
]

/** The Umbral court is the opponent in every campaign battle. */
export const CAMPAIGN_FOE: Court = 'umbral'

/** The opening position of a campaign battle: the player is Solari with the classic army and spells. */
export function campaignGame(opponent: Opponent, seed: number, setup = 'campaign'): GameState {
  const board = boardById(opponent.board)
  const config: MatchConfig = {
    ...DEFAULT_CONFIG, ...opponent.rules, seed, beacons: opponent.rules?.beacons ?? board.beacons, blocked: board.blocked, board: board.id, setup,
  }
  if (opponent.army) config.umbralLayout = arrange(opponent.army)
  const state = newGame(config)
  return opponent.setup ? opponent.setup(state, CAMPAIGN_FOE) : state
}
