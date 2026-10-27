import type { Scenario } from './scenarios'
import { at, builder, lose, taken, within, type Spec } from './scenarioHelpers'

const F = 'footsoldier'
const build = builder('normal')

/** Solari's usual Normal force: a Leader, a Golem and a Seraph with a few lesser pieces, outnumbered. */
const GUARD: readonly Spec[] = [['leader', 0, 3], ['bruiser', 1, 3], ['aura', 0, 2], ['marksman', 0, 4], [F, 1, 2], [F, 1, 4]]
const STRIKE: readonly Spec[] = [['leader', 0, 3], ['charger', 1, 3], ['flier', 0, 2], ['flier', 0, 4], ['bruiser', 1, 2], ['marksman', 1, 4], ['marksman', 1, 1]]
const THIN: readonly Spec[] = [['leader', 0, 3], ['bruiser', 1, 3], ['aura', 0, 2], [F, 1, 2], [F, 1, 4]]

/** Umbral forces of seven to ten pieces on the right-hand side. */
const FOES: Record<string, readonly Spec[]> = {
  wall: [['leader', 6, 3], ['aura', 6, 2], ['bruiser', 5, 3], [F, 5, 1], [F, 5, 2], [F, 5, 4], [F, 5, 5], ['marksman', 6, 4]],
  rush: [['leader', 6, 3], ['charger', 5, 3], ['charger', 5, 2], ['charger', 5, 4], ['bruiser', 6, 4], [F, 5, 1], [F, 5, 5], ['aura', 6, 2]],
  guns: [['leader', 6, 3], ['marksman', 6, 1], ['marksman', 6, 2], ['marksman', 6, 4], ['marksman', 6, 5], ['aura', 6, 0], [F, 5, 2], [F, 5, 3], [F, 5, 4]],
  wings: [['leader', 6, 3], ['flier', 6, 1], ['flier', 6, 5], ['flier', 5, 0], ['flier', 5, 6], ['marksman', 6, 2], [F, 5, 2], [F, 5, 4]],
  heavy: [['leader', 6, 3], ['bruiser', 5, 3], ['bruiser', 5, 2], ['bruiser', 5, 4], ['aura', 6, 2], ['aura', 6, 4], [F, 5, 1], [F, 5, 5]],
  mixed: [['leader', 6, 3], ['bruiser', 5, 3], ['charger', 5, 4], ['marksman', 6, 2], ['marksman', 6, 5], ['flier', 6, 1], ['aura', 6, 4], [F, 5, 2], [F, 5, 5]],
}

/** The Normal scenarios: the normal AI, a thinner Solari edge, longer goals and stacked rules. */
export const NORMAL_SCENARIOS: readonly Scenario[] = [
  build({ id: 'iron-vigil', name: 'The Iron Vigil', blurb: 'Eight rounds against a wall of Footsoldiers, a Golem and a Seraph.', personality: 'turtle',
    objective: { kind: 'survive', rounds: 8 }, bonus: taken(2), solari: GUARD, umbral: FOES.wall }),
  build({ id: 'red-road', name: 'The Red Road', blurb: 'Three Chargers wait on the road east. Get the Solarch through.', personality: 'rusher',
    objective: { kind: 'escort', goal: at(6, 3), limit: 10 }, bonus: within(6), solari: STRIKE, umbral: FOES.rush }),
  build({ id: 'crown-hill', name: 'Crown Hill', blurb: 'Hold the centre for three turns while Marksmen cover every approach.', personality: 'balanced',
    objective: { kind: 'hold', at: at(3, 3), turns: 3, limit: 14 }, bonus: lose(2), solari: GUARD, umbral: FOES.guns }),
  build({ id: 'wing-and-prayer', name: 'On a Wing and a Prayer', blurb: 'Four Umbral Fliers circle. Outlast them for nine rounds.', personality: 'grabber',
    objective: { kind: 'survive', rounds: 9 }, bonus: lose(3), solari: GUARD, umbral: FOES.wings }),
  build({ id: 'pillar-gauntlet', name: 'The Pillar Gauntlet', blurb: 'Thread the Solarch between the Pillars past a Caster and her Marksmen.', personality: 'caster', board: 'pillars',
    objective: { kind: 'escort', goal: at(6, 3), limit: 10 }, bonus: within(7), solari: STRIKE, umbral: FOES.guns }),
  build({ id: 'golem-gate', name: 'The Golem Gate', blurb: 'Three Golems hold the road. Hold the centre for three turns anyway.', personality: 'turtle',
    objective: { kind: 'hold', at: at(3, 3), turns: 3, limit: 14 }, bonus: taken(2), solari: GUARD, umbral: FOES.heavy }),
  build({ id: 'ruin-siege', name: 'The Ruin Siege', blurb: 'Survive nine rounds in the fallen walls. Day events strike.', personality: 'rusher', board: 'ruins', rules: { events: true },
    objective: { kind: 'survive', rounds: 9 }, bonus: lose(3), solari: GUARD, umbral: FOES.rush }),
  build({ id: 'flank-run', name: 'The Flank Run', blurb: 'Run the Solarch up the Flanks to the northern beacon, Blink in hand.', personality: 'balanced', board: 'flanks',
    objective: { kind: 'escort', goal: at(3, 1), limit: 9 }, bonus: within(5), solari: STRIKE, umbral: FOES.mixed, spells: ['blink', 'mend'] }),
  build({ id: 'dusk-court', name: 'The Dusk Court', blurb: 'The light runs backwards. Hold the centre for three turns.', personality: 'caster', rules: { reverse: true },
    objective: { kind: 'hold', at: at(3, 3), turns: 3, limit: 14 }, bonus: lose(2), solari: GUARD, umbral: FOES.mixed }),
  build({ id: 'long-watch', name: 'The Long Watch', blurb: 'Ten rounds with a thin guard and a mixed Umbral army.', personality: 'turtle',
    objective: { kind: 'survive', rounds: 10 }, bonus: taken(2), solari: THIN, umbral: FOES.mixed, spells: ['mend'] }),
  build({ id: 'lanterns', name: 'The Lanterns', blurb: 'Reach the north-eastern beacon through the Ruins before the Marksmen close in.', personality: 'caster', board: 'ruins',
    rules: { beacons: [at(0, 3), at(6, 0)] },
    objective: { kind: 'escort', goal: at(6, 0), limit: 9 }, bonus: within(6), solari: STRIKE, umbral: FOES.guns }),
  build({ id: 'grab-and-hold', name: 'Grab and Hold', blurb: 'A Grabber wants the centre as much as you do. Hold it for four turns.', personality: 'grabber',
    objective: { kind: 'hold', at: at(3, 3), turns: 4, limit: 16 }, bonus: lose(2), solari: [...GUARD, ['charger', 1, 1]], umbral: FOES.mixed }),
  build({ id: 'shrinking-world', name: 'The Shrinking World', blurb: 'The Eclipse falls at round 6 and the showdown closes in. Last to round 10.', personality: 'rusher', rules: { eclipseRound: 6, showdown: true },
    objective: { kind: 'survive', rounds: 10 }, bonus: lose(4), solari: [...GUARD, ['charger', 1, 1]], umbral: FOES.rush }),
  build({ id: 'wall-breaker', name: 'The Wall Breaker', blurb: 'Break through a full wall to the far beacon with Fliers and a Charger.', personality: 'turtle',
    objective: { kind: 'escort', goal: at(6, 3), limit: 9 }, bonus: within(6), solari: STRIKE, umbral: FOES.wall }),
  build({ id: 'pillar-crown', name: 'The Pillar Crown', blurb: 'Hold the Pillar board centre for four turns against Golems.', personality: 'balanced', board: 'pillars',
    objective: { kind: 'hold', at: at(3, 3), turns: 4, limit: 16 }, bonus: taken(3), solari: [...GUARD, ['flier', 0, 5]], umbral: FOES.heavy }),
  build({ id: 'sky-siege', name: 'The Sky Siege', blurb: 'Day events and four Fliers. Outlast them for ten rounds on the Flanks.', personality: 'grabber', board: 'flanks', rules: { events: true },
    objective: { kind: 'survive', rounds: 10 }, bonus: lose(3), solari: GUARD, umbral: FOES.wings }),
  build({ id: 'last-mile', name: 'The Last Mile', blurb: 'Promotion is on. Walk the Solarch east before the Footsoldiers become Chargers.', personality: 'rusher', rules: { promotion: true },
    objective: { kind: 'escort', goal: at(6, 3), limit: 9 }, bonus: within(6), solari: STRIKE, umbral: FOES.wall }),
  build({ id: 'quiet-storm', name: 'The Quiet Storm', blurb: 'Hold the centre for three turns with Mend and Bind while a Caster plots.', personality: 'caster',
    objective: { kind: 'hold', at: at(3, 3), turns: 3, limit: 14 }, bonus: lose(1), solari: GUARD, umbral: FOES.guns, spells: ['mend', 'bind'] }),
  build({ id: 'twilight-stand', name: 'Twilight Stand', blurb: 'The Eclipse falls at round 7. Last to round 11 with your Solarch alive.', personality: 'balanced', rules: { eclipseRound: 7 },
    objective: { kind: 'survive', rounds: 11 }, bonus: lose(4), solari: [...GUARD, ['charger', 1, 1]], umbral: FOES.heavy, spells: ['mend', 'blink'] }),
  build({ id: 'borrowed-time', name: 'Borrowed Time', blurb: 'Reversed light and a Turtle wall. Hold the centre for three turns on the Flanks.', personality: 'turtle', board: 'flanks', rules: { reverse: true },
    objective: { kind: 'hold', at: at(3, 3), turns: 3, limit: 14 }, bonus: taken(2), solari: GUARD, umbral: FOES.wall }),
]
