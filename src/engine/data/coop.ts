import type { Scenario } from './scenarios'
import { scenarioGame } from './scenarios'
import { at, builder, cells, lose, taken, within, FULL_UMBRAL, type Spec } from './scenarioHelpers'
import type { GameState } from '../rules/types'

const F = 'footsoldier'
const normal = builder('normal')
const easy = builder('easy')
const hard = builder('hard')

/** A wide Solari force for two players: a Leader, a strike arm and a guard arm. */
const HOST: readonly Spec[] = [['leader', 0, 3], ['aura', 0, 2], ['bruiser', 1, 3], ['charger', 1, 4], ['marksman', 0, 4], ['marksman', 1, 1], ['flier', 0, 5], [F, 1, 2], [F, 1, 5]]
const RUNNERS: readonly Spec[] = [['leader', 0, 3], ['charger', 1, 3], ['flier', 0, 2], ['flier', 0, 4], ['bruiser', 1, 2], ['bruiser', 1, 4], ['marksman', 1, 1], ['marksman', 1, 5]]

/** More Solari forces: two Seraphs and two Golems on guard, a strike arm of Chargers and Fliers, and a firing line. */
const GUARDS: readonly Spec[] = [['leader', 0, 3], ['aura', 0, 2], ['aura', 0, 4], ['bruiser', 1, 3], ['bruiser', 1, 2], ['marksman', 0, 1], ['marksman', 0, 5], [F, 1, 4], [F, 1, 1]]
const RAIDERS: readonly Spec[] = [['leader', 0, 3], ['charger', 1, 2], ['charger', 1, 4], ['flier', 0, 2], ['flier', 0, 4], ['marksman', 1, 3], ['bruiser', 1, 1], ['bruiser', 1, 5]]
const ARCHERS: readonly Spec[] = [['leader', 0, 3], ['marksman', 0, 1], ['marksman', 0, 2], ['marksman', 0, 4], ['marksman', 0, 5], ['aura', 1, 3], ['bruiser', 1, 2], ['bruiser', 1, 4], [F, 1, 1]]

/** More Umbral forces, from a token guard to a swarm and a court of casters. */
const PICKET: readonly Spec[] = [['leader', 6, 3], ['bruiser', 5, 3], ['marksman', 6, 2], [F, 5, 2], [F, 5, 4]]
const SCREEN: readonly Spec[] = [['leader', 6, 3], ['marksman', 6, 2], ['marksman', 6, 4], [F, 5, 2], [F, 5, 3], [F, 5, 4]]
const SWARM: readonly Spec[] = [['leader', 6, 3], ['aura', 6, 2], ['aura', 6, 4], [F, 5, 0], [F, 5, 1], [F, 5, 2], [F, 5, 3], [F, 5, 4], [F, 5, 5], [F, 5, 6]]
const RAID: readonly Spec[] = [['leader', 6, 3], ['charger', 5, 2], ['charger', 5, 4], ['flier', 6, 1], ['flier', 6, 5], ['bruiser', 5, 3], ['marksman', 6, 2], ['marksman', 6, 4]]
const CASTERS: readonly Spec[] = [['leader', 6, 3], ['aura', 6, 2], ['aura', 6, 4], ['marksman', 5, 2], ['marksman', 5, 4], [F, 5, 3], ['flier', 6, 1], ['flier', 6, 5]]

const WALL: readonly Spec[] = [['leader', 6, 3], ['aura', 6, 2], ['bruiser', 5, 3], ['marksman', 6, 4], [F, 5, 1], [F, 5, 2], [F, 5, 4], [F, 5, 5]]

/**
 * Co-op scenarios: two people share the Solari court against the scripted Umbral AI, taking its turns in
 * turn (the first player on odd rounds, the second on even ones). The same rules, objectives and stars as any
 * scenario, with bigger forces and goals that reward talking it over.
 */
export const COOP_SCENARIOS: readonly Scenario[] = [
  easy({ id: 'coop-first-light', name: 'First Light', blurb: 'A gentle start: hold the centre for two turns while a thin guard looks on. Practise trading the moves.', personality: 'balanced',
    objective: { kind: 'hold', at: at(3, 3), turns: 2, limit: 14 }, bonus: lose(2), solari: HOST, umbral: PICKET }),
  easy({ id: 'coop-short-walk', name: 'The Short Walk', blurb: 'Walk the Solarch to the far side in ten rounds. One of you leads, the other clears the way.', personality: 'turtle',
    objective: { kind: 'escort', goal: at(5, 3), limit: 10 }, bonus: within(8), solari: RUNNERS, umbral: PICKET }),
  easy({ id: 'coop-quiet-vigil', name: 'The Quiet Vigil', blurb: 'Keep the Solarch alive for five rounds against a small, cautious guard.', personality: 'turtle',
    objective: { kind: 'survive', rounds: 5 }, bonus: taken(1), solari: HOST, umbral: PICKET }),
  easy({ id: 'coop-tag-team', name: 'Tag Team', blurb: 'The centre glows with Might. Take turns standing on it and hold it for three turns.', personality: 'balanced',
    rules: { cells: cells('might', [3, 3], [2, 3]) },
    objective: { kind: 'hold', at: at(3, 3), turns: 3, limit: 14 }, bonus: taken(2), solari: GUARDS, umbral: SCREEN }),
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
  normal({ id: 'coop-bridge-guard', name: 'Bridge Guard', blurb: 'Fallen walls leave one way through the middle. Hold it for three turns against a guarding court.', personality: 'guardian', board: 'ruins',
    objective: { kind: 'hold', at: at(3, 3), turns: 3, limit: 14 }, bonus: lose(1), solari: GUARDS, umbral: SCREEN }),
  normal({ id: 'coop-swarm-night', name: 'Swarm Night', blurb: 'Seven Footsoldiers and two Seraphs surge at you. Last eight rounds, together.', personality: 'rusher',
    objective: { kind: 'survive', rounds: 8 }, bonus: taken(4), solari: GUARDS, umbral: SWARM }),
  normal({ id: 'coop-high-road', name: 'The High Road', blurb: 'Take the long way round to the south-eastern beacon, with casters watching the road.', personality: 'baiter',
    rules: { beacons: [at(0, 3), at(6, 6)] },
    objective: { kind: 'escort', goal: at(6, 6), limit: 10 }, bonus: within(8), solari: RUNNERS, umbral: CASTERS }),
  normal({ id: 'coop-shrine-keepers', name: 'The Shrine Keepers', blurb: 'Might and Ward cells ring the centre. Win the hill and hold it for three turns.', personality: 'guardian', board: 'shrine',
    objective: { kind: 'hold', at: at(3, 3), turns: 3, limit: 15 }, bonus: taken(3), solari: RAIDERS, umbral: SCREEN }),
  normal({ id: 'coop-crossfire', name: 'Crossfire', blurb: 'A firing line of four Marksmen against a court of casters. Survive nine rounds and keep healing.', personality: 'caster',
    objective: { kind: 'survive', rounds: 9 }, bonus: lose(2), solari: ARCHERS, umbral: CASTERS, spells: ['mend'] }),
  normal({ id: 'coop-pillar-march', name: 'The Pillar March', blurb: 'Weave the Solarch between the pillars to the far beacon. A Blink saves a hard corner.', personality: 'balanced', board: 'pillars',
    objective: { kind: 'escort', goal: at(6, 3), limit: 11 }, bonus: within(8), solari: RUNNERS, umbral: WALL, spells: ['blink'] }),
  normal({ id: 'coop-hazard-run', name: 'The Hazard Run', blurb: 'Hazard burns the squares on the road east. Plan each step so the Solarch never lingers on one.', personality: 'baiter',
    rules: { cells: cells('hazard', [2, 3], [4, 3], [3, 1], [3, 5]) },
    objective: { kind: 'escort', goal: at(6, 3), limit: 11 }, bonus: within(8), solari: RUNNERS, umbral: SCREEN }),
  normal({ id: 'coop-sanctum-siege', name: 'Sanctum Siege', blurb: 'Silence and Recovery cells ring the middle. Take it and keep it for three turns against a raiding court.', personality: 'baiter', board: 'sanctum',
    objective: { kind: 'hold', at: at(3, 3), turns: 3, limit: 15 }, bonus: lose(2), solari: GUARDS, umbral: RAID }),
  normal({ id: 'coop-silent-watch', name: 'The Silent Watch', blurb: 'Silence smothers the Umbral back line. Survive eight rounds before its casters find their voice.', personality: 'caster',
    rules: { cells: cells('silence', [5, 3], [6, 3], [6, 2], [6, 4]) },
    objective: { kind: 'survive', rounds: 8 }, bonus: lose(3), solari: HOST, umbral: CASTERS }),
  normal({ id: 'coop-two-towers', name: 'Two Towers', blurb: 'Hold the northern gate for three turns while the Duskmother waits behind her wall.', personality: 'turtle',
    objective: { kind: 'hold', at: at(3, 1), turns: 3, limit: 14 }, bonus: within(10), solari: HOST, umbral: WALL }),
  hard({ id: 'coop-pillar-pact', name: 'The Pillar Pact', blurb: 'Hold the centre among the pillars for four turns against an eager Rusher. Weak links break the chain.', personality: 'rusher', board: 'pillars',
    objective: { kind: 'hold', at: at(3, 3), turns: 4, limit: 16 }, bonus: lose(1), solari: HOST,
    umbral: [['leader', 6, 3], ['bruiser', 5, 3], ['charger', 5, 4], ['charger', 5, 2], ['marksman', 6, 2], ['marksman', 6, 4], [F, 5, 1], [F, 5, 5]] }),
  hard({ id: 'coop-last-stand', name: 'The Last Stand', blurb: 'The Eclipse falls at round 8. Last to round twelve with your Solarch alive, together.', personality: 'grabber',
    rules: { eclipseRound: 8, showdown: true },
    objective: { kind: 'survive', rounds: 12 }, bonus: lose(4), solari: HOST, umbral: WALL, spells: ['mend', 'blink'] }),
  hard({ id: 'coop-iron-tide', name: 'The Iron Tide', blurb: 'The whole Umbral court marches. Survive ten rounds and trade the moves well.', personality: 'rusher',
    objective: { kind: 'survive', rounds: 10 }, bonus: lose(4), solari: GUARDS, umbral: FULL_UMBRAL }),
  hard({ id: 'coop-eclipse-gate', name: 'The Eclipse Gate', blurb: 'The Eclipse falls at round 7. Carry the Solarch to the far beacon before it does.', personality: 'grabber',
    rules: { eclipseRound: 7, showdown: true },
    objective: { kind: 'escort', goal: at(6, 3), limit: 9 }, bonus: within(7), solari: RUNNERS, umbral: WALL, spells: ['blink', 'mend'] }),
  hard({ id: 'coop-shield-wall', name: 'The Shield Wall', blurb: 'Hold the ruined centre for four turns against a court of casters. Keep the Seraphs alive.', personality: 'guardian', board: 'ruins',
    objective: { kind: 'hold', at: at(3, 3), turns: 4, limit: 16 }, bonus: lose(2), solari: GUARDS, umbral: CASTERS }),
  hard({ id: 'coop-dusk-vanguard', name: 'The Dusk Vanguard', blurb: 'The Eclipse falls at round 10 and the Umbral court is all in. Last twelve rounds with the Solarch alive.', personality: 'rusher',
    rules: { eclipseRound: 10, showdown: true },
    objective: { kind: 'survive', rounds: 12 }, bonus: taken(5), solari: ARCHERS, umbral: FULL_UMBRAL, spells: ['mend'] }),
  hard({ id: 'coop-grand-finale', name: 'The Grand Finale', blurb: 'The last stand of the Solari court: the Eclipse falls at round 9 and you must outlast it together.', personality: 'caster',
    rules: { eclipseRound: 9, showdown: true },
    objective: { kind: 'survive', rounds: 12 }, bonus: lose(3), solari: HOST, umbral: FULL_UMBRAL, spells: ['mend', 'blink', 'swap'] }),
]

export const coopById = (id: string) => COOP_SCENARIOS.find((s) => s.id === id)

/** Which of the two people at the screen moves: the first on odd rounds, the second on even ones. */
export const coopPlayer = (round: number): 1 | 2 => (round % 2 === 1 ? 1 : 2)

/** The opening position of a co-op scenario. */
export const coopGame = (scenario: Scenario, seed: number): GameState => scenarioGame(scenario, seed)
