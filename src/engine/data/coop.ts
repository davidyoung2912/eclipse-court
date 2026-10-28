import type { Scenario } from './scenarios'
import { scenarioGame } from './scenarios'
import { at, builder, lose, taken, within, type Spec } from './scenarioHelpers'
import type { GameState } from '../rules/types'

const F = 'footsoldier'
const normal = builder('normal')
const hard = builder('hard')

/** A wide Solari force for two players: a Leader, a strike arm and a guard arm. */
const HOST: readonly Spec[] = [['leader', 0, 3], ['aura', 0, 2], ['bruiser', 1, 3], ['charger', 1, 4], ['marksman', 0, 4], ['marksman', 1, 1], ['flier', 0, 5], [F, 1, 2], [F, 1, 5]]
const RUNNERS: readonly Spec[] = [['leader', 0, 3], ['charger', 1, 3], ['flier', 0, 2], ['flier', 0, 4], ['bruiser', 1, 2], ['bruiser', 1, 4], ['marksman', 1, 1], ['marksman', 1, 5]]

const WALL: readonly Spec[] = [['leader', 6, 3], ['aura', 6, 2], ['bruiser', 5, 3], ['marksman', 6, 4], [F, 5, 1], [F, 5, 2], [F, 5, 4], [F, 5, 5]]

/**
 * Co-op scenarios: two people share the Solari court against the scripted Umbral AI, taking its turns in
 * turn (the first player on odd rounds, the second on even ones). The same rules, objectives and stars as any
 * scenario, with bigger forces and goals that reward talking it over.
 */
export const COOP_SCENARIOS: readonly Scenario[] = [
  normal({ id: 'coop-two-hands', name: 'Two Hands', blurb: 'Hold the centre for three turns against a steady wall. One of you advances, the other covers.', personality: 'balanced',
    objective: { kind: 'hold', at: at(3, 3), turns: 3, limit: 14 }, bonus: lose(2), solari: HOST, umbral: WALL }),
  normal({ id: 'coop-relay', name: 'The Relay', blurb: 'Pass the Solarch east, one move each. Get it to the far beacon within ten rounds.', personality: 'turtle',
    objective: { kind: 'escort', goal: at(6, 3), limit: 10 }, bonus: within(7), solari: RUNNERS, umbral: WALL, spells: ['blink', 'mend'] }),
  normal({ id: 'coop-night-watch', name: 'The Night Watch', blurb: 'Take turns on the wall. Keep the Solarch alive for eight rounds against the full Umbral court.', personality: 'rusher',
    objective: { kind: 'survive', rounds: 8 }, bonus: taken(3), solari: HOST,
    umbral: [['flier', 6, 0], ['marksman', 6, 1], ['aura', 6, 2], ['leader', 6, 3], ['bruiser', 6, 4], ['marksman', 6, 5], ['flier', 6, 6], [F, 5, 1], [F, 5, 2], ['charger', 5, 3], [F, 5, 4], [F, 5, 5]] }),
  normal({ id: 'coop-ruined-pair', name: 'The Ruined Pair', blurb: 'Two roads through the ruins to the north-eastern beacon. Split the route and meet at the gate.', personality: 'caster', board: 'ruins',
    rules: { beacons: [at(0, 3), at(6, 0)] },
    objective: { kind: 'escort', goal: at(6, 0), limit: 9 }, bonus: within(6), solari: RUNNERS, umbral: [['leader', 6, 3], ['aura', 6, 1], ['marksman', 5, 0], ['marksman', 6, 2], [F, 5, 1], [F, 5, 2], ['bruiser', 4, 1]] }),
  hard({ id: 'coop-pillar-pact', name: 'The Pillar Pact', blurb: 'Hold the centre among the pillars for four turns against an eager Rusher. Weak links break the chain.', personality: 'rusher', board: 'pillars',
    objective: { kind: 'hold', at: at(3, 3), turns: 4, limit: 16 }, bonus: lose(1), solari: HOST,
    umbral: [['leader', 6, 3], ['bruiser', 5, 3], ['charger', 5, 4], ['charger', 5, 2], ['marksman', 6, 2], ['marksman', 6, 4], [F, 5, 1], [F, 5, 5]] }),
  hard({ id: 'coop-last-stand', name: 'The Last Stand', blurb: 'The Eclipse falls at round 8. Last to round twelve with your Solarch alive, together.', personality: 'grabber',
    rules: { eclipseRound: 8, showdown: true },
    objective: { kind: 'survive', rounds: 12 }, bonus: lose(4), solari: HOST, umbral: WALL, spells: ['mend', 'blink'] }),
]

export const coopById = (id: string) => COOP_SCENARIOS.find((s) => s.id === id)

/** Which of the two people at the screen moves: the first on odd rounds, the second on even ones. */
export const coopPlayer = (round: number): 1 | 2 => (round % 2 === 1 ? 1 : 2)

/** The opening position of a co-op scenario. */
export const coopGame = (scenario: Scenario, seed: number): GameState => scenarioGame(scenario, seed)
