import type { Scenario } from './scenarios'
import { FULL_UMBRAL, at, builder, lose, taken, within, type Spec } from './scenarioHelpers'

const F = 'footsoldier'
const build = builder('hard')

/** Solari's Expert forces: a Leader with a few escorts, badly outnumbered. */
const GUARD: readonly Spec[] = [['leader', 0, 3], ['bruiser', 1, 3], ['aura', 0, 2], ['marksman', 0, 4], [F, 1, 2], [F, 1, 4]]
const STRIKE: readonly Spec[] = [['leader', 0, 3], ['charger', 1, 3], ['flier', 0, 2], ['flier', 0, 4], ['bruiser', 1, 2], ['marksman', 1, 4], ['marksman', 1, 1]]
const THIN: readonly Spec[] = [['leader', 0, 3], ['bruiser', 1, 3], ['aura', 0, 2], [F, 1, 2]]
const BAND: readonly Spec[] = [...GUARD, ['charger', 1, 1], ['flier', 0, 5]]

/** Umbral forces of eight to twelve pieces on the right-hand side. */
const FOES: Record<string, readonly Spec[]> = {
  wall: [['leader', 6, 3], ['aura', 6, 2], ['aura', 6, 4], ['bruiser', 5, 3], [F, 5, 1], [F, 5, 2], [F, 5, 4], [F, 5, 5], ['marksman', 6, 1], ['marksman', 6, 5]],
  rush: [['leader', 6, 3], ['charger', 5, 3], ['charger', 5, 2], ['charger', 5, 4], ['bruiser', 6, 4], ['bruiser', 6, 2], [F, 5, 1], [F, 5, 5], ['flier', 6, 0], ['flier', 5, 6]],
  guns: [['leader', 6, 3], ['marksman', 6, 1], ['marksman', 6, 2], ['marksman', 6, 4], ['marksman', 6, 5], ['aura', 6, 0], ['aura', 5, 6], [F, 5, 2], [F, 5, 3], [F, 5, 4]],
  wings: [['leader', 6, 3], ['flier', 6, 1], ['flier', 6, 5], ['flier', 5, 0], ['flier', 5, 6], ['flier', 5, 3], ['marksman', 6, 2], ['marksman', 6, 4], [F, 5, 2], [F, 5, 4]],
  heavy: [['leader', 6, 3], ['bruiser', 5, 3], ['bruiser', 5, 2], ['bruiser', 5, 4], ['bruiser', 6, 1], ['aura', 6, 2], ['aura', 6, 4], [F, 5, 1], [F, 5, 5]],
  mixed: [['leader', 6, 3], ['bruiser', 5, 3], ['charger', 5, 4], ['charger', 5, 2], ['marksman', 6, 2], ['marksman', 6, 5], ['flier', 6, 1], ['aura', 6, 4], [F, 5, 1], [F, 5, 5]],
  full: [...FULL_UMBRAL.filter((f) => !(f[1] === 6 && f[2] === 6)), ['flier', 4, 3]],
}

/** The Expert scenarios: the hard AI, a thin Solari force against a full Umbral one, long goals and stacked rules. */
export const EXPERT_SCENARIOS: readonly Scenario[] = [
  build({ id: 'iron-night', name: 'The Iron Night', blurb: 'Ten rounds against the full Umbral army with a Golem and a Seraph.', personality: 'turtle',
    objective: { kind: 'survive', rounds: 10 }, bonus: taken(2), solari: GUARD, umbral: FOES.full }),
  build({ id: 'blood-road', name: 'The Blood Road', blurb: 'Three Chargers and two Golems hold the road east. Get the Solarch through.', personality: 'rusher',
    objective: { kind: 'escort', goal: at(6, 3), limit: 10 }, bonus: within(7), solari: STRIKE, umbral: FOES.rush }),
  build({ id: 'throne-hill', name: 'Throne Hill', blurb: 'Hold the centre for four turns under four Marksmen and two Seraphs.', personality: 'caster',
    objective: { kind: 'hold', at: at(3, 3), turns: 4, limit: 16 }, bonus: lose(3), solari: GUARD, umbral: FOES.guns }),
  build({ id: 'storm-wings', name: 'Storm Wings', blurb: 'Five Umbral Fliers and two Marksmen. Outlast them for ten rounds.', personality: 'grabber',
    objective: { kind: 'survive', rounds: 10 }, bonus: lose(4), solari: GUARD, umbral: FOES.wings }),
  build({ id: 'pillar-run', name: 'The Pillar Run', blurb: 'Thread the Solarch between the Pillars past a Caster and her guns.', personality: 'caster', board: 'pillars',
    objective: { kind: 'escort', goal: at(6, 3), limit: 10 }, bonus: within(7), solari: STRIKE, umbral: FOES.guns }),
  build({ id: 'four-golems', name: 'Four Golems', blurb: 'Four Golems guard the road. Hold the centre for three turns anyway.', personality: 'turtle',
    objective: { kind: 'hold', at: at(3, 3), turns: 3, limit: 16 }, bonus: taken(3), solari: BAND, umbral: FOES.heavy }),
  build({ id: 'ruin-night', name: 'The Ruin Night', blurb: 'Eleven rounds in the fallen walls. Day events strike.', personality: 'rusher', board: 'ruins', rules: { events: true },
    objective: { kind: 'survive', rounds: 11 }, bonus: lose(4), solari: BAND, umbral: FOES.rush }),
  build({ id: 'flank-breakout', name: 'The Flank Breakout', blurb: 'Run the Solarch up the Flanks to the northern beacon with Blink in hand.', personality: 'balanced', board: 'flanks',
    objective: { kind: 'escort', goal: at(3, 1), limit: 9 }, bonus: within(5), solari: STRIKE, umbral: FOES.mixed, spells: ['blink', 'mend'] }),
  build({ id: 'dark-mirror', name: 'The Dark Mirror', blurb: 'The light runs backwards. Hold the centre for four turns.', personality: 'balanced', rules: { reverse: true },
    objective: { kind: 'hold', at: at(3, 3), turns: 4, limit: 16 }, bonus: lose(3), solari: BAND, umbral: FOES.mixed }),
  build({ id: 'hollow-guard', name: 'The Hollow Guard', blurb: 'A Leader, a Golem, a Seraph and one Footsoldier against the court for twelve rounds.', personality: 'turtle',
    objective: { kind: 'survive', rounds: 12 }, bonus: taken(1), solari: THIN, umbral: FOES.wall, spells: ['mend'] }),
  build({ id: 'ember-lanterns', name: 'The Ember Lanterns', blurb: 'Reach the north-eastern beacon through the Ruins before the guns close in.', personality: 'caster', board: 'ruins',
    rules: { beacons: [at(0, 3), at(6, 0)] },
    objective: { kind: 'escort', goal: at(6, 0), limit: 9 }, bonus: within(6), solari: STRIKE, umbral: FOES.guns }),
  build({ id: 'grabbers-crown', name: "The Grabber's Crown", blurb: 'A Grabber wants the centre too. Hold it for five turns.', personality: 'grabber',
    objective: { kind: 'hold', at: at(3, 3), turns: 5, limit: 18 }, bonus: lose(3), solari: BAND, umbral: FOES.mixed }),
  build({ id: 'closing-ring', name: 'The Closing Ring', blurb: 'The Eclipse falls at round 6 and the showdown closes in. Last to round 12.', personality: 'rusher', rules: { eclipseRound: 6, showdown: true },
    objective: { kind: 'survive', rounds: 12 }, bonus: lose(5), solari: BAND, umbral: FOES.rush }),
  build({ id: 'wall-of-night', name: 'The Wall of Night', blurb: 'Break through a deep wall to the far beacon with Fliers and a Charger.', personality: 'turtle',
    objective: { kind: 'escort', goal: at(6, 3), limit: 9 }, bonus: within(6), solari: STRIKE, umbral: FOES.wall }),
  build({ id: 'pillar-throne', name: 'The Pillar Throne', blurb: 'Hold the Pillar board centre for four turns against four Golems.', personality: 'balanced', board: 'pillars',
    objective: { kind: 'hold', at: at(3, 3), turns: 4, limit: 18 }, bonus: taken(3), solari: BAND, umbral: FOES.heavy }),
  build({ id: 'sky-fall', name: 'Sky Fall', blurb: 'Day events and five Fliers on the Flanks. Outlast them for eleven rounds.', personality: 'grabber', board: 'flanks', rules: { events: true },
    objective: { kind: 'survive', rounds: 11 }, bonus: lose(4), solari: BAND, umbral: FOES.wings }),
  build({ id: 'burning-bridge', name: 'The Burning Bridge', blurb: 'Promotion is on. Cross east before the Footsoldiers become Chargers.', personality: 'rusher', rules: { promotion: true },
    objective: { kind: 'escort', goal: at(6, 3), limit: 9 }, bonus: within(6), solari: STRIKE, umbral: FOES.wall }),
  build({ id: 'silent-court', name: 'The Silent Court', blurb: 'Hold the centre for three turns with Mend and Bind against a Caster.', personality: 'caster',
    objective: { kind: 'hold', at: at(3, 3), turns: 3, limit: 16 }, bonus: lose(2), solari: GUARD, umbral: FOES.guns, spells: ['mend', 'bind'] }),
  build({ id: 'last-twilight', name: 'The Last Twilight', blurb: 'The Eclipse falls at round 7. Last to round 12 against Golems.', personality: 'balanced', rules: { eclipseRound: 7 },
    objective: { kind: 'survive', rounds: 12 }, bonus: lose(5), solari: BAND, umbral: FOES.heavy, spells: ['mend', 'blink'] }),
  build({ id: 'stolen-hours', name: 'Stolen Hours', blurb: 'Reversed light and a Turtle wall. Hold the Flanks centre for three turns.', personality: 'turtle', board: 'flanks', rules: { reverse: true },
    objective: { kind: 'hold', at: at(3, 3), turns: 3, limit: 16 }, bonus: taken(3), solari: BAND, umbral: FOES.wall }),
  build({ id: 'queens-road', name: "The Queen's Road", blurb: 'Eight rounds to bring the Solarch past the full court with Blink.', personality: 'balanced',
    objective: { kind: 'escort', goal: at(6, 3), limit: 8 }, bonus: within(5), solari: STRIKE, umbral: FOES.full, spells: ['blink'] }),
  build({ id: 'eclipse-vigil', name: 'The Eclipse Vigil', blurb: 'Eclipse at round 5, showdown and reversed light. Last to round 10.', personality: 'rusher', rules: { eclipseRound: 5, showdown: true, reverse: true },
    objective: { kind: 'survive', rounds: 10 }, bonus: lose(5), solari: BAND, umbral: FOES.mixed, spells: ['mend'] }),
  build({ id: 'final-stand', name: 'The Final Stand', blurb: 'Hold the centre for five turns against the whole Umbral court.', personality: 'balanced',
    objective: { kind: 'hold', at: at(3, 3), turns: 5, limit: 20 }, bonus: lose(4), solari: [...BAND, ['bruiser', 1, 5]], umbral: FOES.full, spells: ['mend', 'bind'] }),
]
