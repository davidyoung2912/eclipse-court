import type { Difficulty } from './difficulty'
import type { Summary } from './summary'
import { FULL_UMBRAL, at, lineup, type Spec } from './scenarioHelpers'
import { BEGINNER_SCENARIOS } from './scenariosBeginner'
import { EXPERT_SCENARIOS } from './scenariosExpert'
import { CELL_SCENARIOS } from './scenariosCells'
import { NORMAL_SCENARIOS } from './scenariosNormal'
import { campaignGame, type Opponent } from './campaign'
import type { GameState, Objective } from '../rules/types'

/** A hand-built situation with its own goal; the player is Solari, as in the campaign. */
export interface Scenario extends Opponent {
  id: string
  objective: Objective
  /** The third star: something harder than winning, and what it asks for. */
  bonus: { text: string; met: (s: Summary) => boolean }
}

const AUTHORED: readonly Scenario[] = [
  {
    id: 'long-night',
    name: 'The Long Night',
    blurb: 'Six of yours against twelve. Keep the Solarch alive until dawn, eight rounds away.',
    difficulty: 'normal',
    personality: 'rusher',
    objective: { kind: 'survive', rounds: 8 },
    bonus: { text: 'Take three enemy pieces', met: (s) => s.taken >= 3 },
    setup: lineup(
      [['leader', 0, 3], ['aura', 0, 2], ['bruiser', 1, 3], ['footsoldier', 1, 2], ['footsoldier', 1, 4], ['marksman', 0, 4]],
      FULL_UMBRAL,
    ),
  },
  {
    id: 'long-road',
    name: 'The Long Road',
    blurb: 'Carry the Solarch across the board to the far beacon. The Duskmother has a wall waiting.',
    difficulty: 'normal',
    personality: 'turtle',
    rules: { beacons: [at(0, 3), at(6, 3)] },
    objective: { kind: 'escort', goal: at(6, 3), limit: 10 },
    bonus: { text: 'Arrive within 6 rounds', met: (s) => s.turns <= 6 },
    setup: lineup(
      [['leader', 0, 3], ['charger', 1, 3], ['flier', 0, 2], ['flier', 0, 4], ['bruiser', 1, 2], ['marksman', 1, 4], ['marksman', 1, 1]],
      [['leader', 6, 5], ['bruiser', 5, 3], ['footsoldier', 5, 2], ['footsoldier', 5, 4], ['footsoldier', 4, 3], ['marksman', 6, 2], ['aura', 6, 4]],
    ),
  },
  {
    id: 'pillar-stand',
    name: 'The Pillar Stand',
    blurb: 'Take the centre among the pillars and keep it for three turns in a row. Their Footsoldiers are weak.',
    difficulty: 'hard',
    personality: 'rusher',
    board: 'pillars',
    objective: { kind: 'hold', at: at(3, 3), turns: 3, limit: 12 },
    bonus: { text: 'Win without losing a piece', met: (s) => s.lost === 0 },
    setup: lineup(
      [['leader', 0, 3], ['bruiser', 1, 3], ['aura', 0, 2], ['marksman', 0, 4], ['marksman', 1, 1], ['footsoldier', 1, 2], ['footsoldier', 1, 4], ['footsoldier', 1, 5]],
      FULL_UMBRAL.map((spec): Spec => (spec[0] === 'footsoldier' ? ['footsoldier', spec[1], spec[2], 2] : spec)),
    ),
  },
  {
    id: 'ruined-gate',
    name: 'The Ruined Gate',
    blurb: 'Fallen walls and a Caster guard the north-eastern beacon. Get the Solarch there within eight rounds.',
    difficulty: 'normal',
    personality: 'caster',
    board: 'ruins',
    rules: { beacons: [at(0, 3), at(6, 0)] },
    objective: { kind: 'escort', goal: at(6, 0), limit: 8 },
    bonus: { text: 'Arrive within 5 rounds', met: (s) => s.turns <= 5 },
    setup: lineup(
      [['leader', 0, 3], ['flier', 0, 2], ['flier', 0, 4], ['charger', 1, 3], ['bruiser', 1, 2], ['marksman', 1, 4]],
      [['leader', 6, 3], ['aura', 6, 1], ['marksman', 5, 0], ['marksman', 6, 2], ['footsoldier', 5, 1], ['footsoldier', 5, 2], ['bruiser', 4, 1]],
    ),
  },
  {
    id: 'three-against-army',
    name: 'Three Against the Court',
    blurb: 'The Solarch, a Golem and a Seraph hold out for ten rounds against the whole Umbral army.',
    difficulty: 'hard',
    personality: 'balanced',
    objective: { kind: 'survive', rounds: 10 },
    bonus: { text: 'Take two enemy pieces', met: (s) => s.taken >= 2 },
    setup: lineup([['leader', 0, 3], ['bruiser', 1, 3], ['aura', 0, 2]], FULL_UMBRAL),
  },
  {
    id: 'darkening-sky',
    name: 'The Darkening Sky',
    blurb: 'The Eclipse falls at round 8 and the showdown closes in. Last to round 12 with your Solarch alive. Beacons shelter you.',
    difficulty: 'normal',
    personality: 'grabber',
    rules: { eclipseRound: 8, showdown: true },
    objective: { kind: 'survive', rounds: 12 },
    bonus: { text: 'Lose no more than three pieces', met: (s) => s.lost <= 3 },
    setup: (s) => ({ ...s, spells: { ...s.spells, solari: ['mend', 'blink'] } }),
  },
  {
    id: 'sunless-hill',
    name: 'The Sunless Hill',
    blurb: 'The light runs backwards and day events strike. Hold the centre for four turns with a thin army.',
    difficulty: 'normal',
    personality: 'rusher',
    rules: { reverse: true, events: true },
    objective: { kind: 'hold', at: at(3, 3), turns: 4, limit: 14 },
    bonus: { text: 'Take four enemy pieces', met: (s) => s.taken >= 4 },
    setup: lineup(
      [['leader', 0, 3], ['bruiser', 1, 3], ['charger', 1, 4], ['aura', 0, 2], ['flier', 0, 4], ['marksman', 1, 2], ['footsoldier', 1, 1]],
      [['leader', 6, 3], ['bruiser', 6, 4], ['charger', 5, 3], ['marksman', 6, 2], ['marksman', 6, 5], ['flier', 6, 1], ['footsoldier', 5, 2], ['footsoldier', 5, 4]],
    ),
  },
]

const LEVEL: Record<Difficulty, number> = { easy: 0, normal: 1, hard: 2 }

/** Every scenario, Beginner first; within a tier, the order they are written in. */
export const SCENARIOS: readonly Scenario[] = [...AUTHORED, ...BEGINNER_SCENARIOS, ...NORMAL_SCENARIOS, ...EXPERT_SCENARIOS, ...CELL_SCENARIOS].sort((a, b) => LEVEL[a.difficulty] - LEVEL[b.difficulty])

/** The scenarios of one tier, in play order. */
export const scenariosIn = (difficulty: Difficulty) => SCENARIOS.filter((s) => s.difficulty === difficulty)

export const scenarioById = (id: string) => SCENARIOS.find((s) => s.id === id)

/** The opening position of a scenario: Solari to move, with its objective in the match config. */
export const scenarioGame = (scenario: Scenario, seed: number): GameState =>
  campaignGame({ ...scenario, rules: { ...scenario.rules, objective: scenario.objective } }, seed, 'scenario')


