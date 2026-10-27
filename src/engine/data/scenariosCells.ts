import type { Scenario } from './scenarios'
import { at, builder, cells, lose, taken, within, type Spec } from './scenarioHelpers'

const F = 'footsoldier'

const GUARD: readonly Spec[] = [['leader', 0, 3], ['bruiser', 1, 3], ['aura', 0, 2], ['marksman', 0, 4], [F, 1, 2], [F, 1, 4]]
const STRIKE: readonly Spec[] = [['leader', 0, 3], ['charger', 1, 3], ['flier', 0, 2], ['flier', 0, 4], ['bruiser', 1, 2], ['marksman', 1, 4], ['marksman', 1, 1]]

/** Showcase scenarios for the special cells, each built around one effect; the cells are authored by hand and need not be symmetric. */
export const CELL_SCENARIOS: readonly Scenario[] = [
  builder('easy')({ id: 'might-ridge', name: 'The Might Ridge', blurb: 'The centre glows with Might. Hold it for three turns and let your Golem strike from it.', personality: 'balanced',
    rules: { cells: cells('might', [3, 3], [2, 3]) },
    objective: { kind: 'hold', at: at(3, 3), turns: 3, limit: 14 }, bonus: lose(1), solari: GUARD,
    umbral: [['leader', 6, 3], ['marksman', 6, 2], [F, 5, 2], [F, 5, 3], [F, 5, 4]] }),
  builder('normal')({ id: 'ember-causeway', name: 'The Ember Causeway', blurb: 'The road east is Hazard: every piece that ends a turn on it bleeds. Get the Solarch across.', personality: 'turtle',
    rules: { cells: cells('hazard', [2, 3], [3, 3], [4, 3], [3, 2], [3, 4]) },
    objective: { kind: 'escort', goal: at(6, 3), limit: 10 }, bonus: within(7), solari: STRIKE,
    umbral: [['leader', 6, 5], ['bruiser', 5, 3], [F, 5, 2], [F, 5, 4], [F, 4, 2], ['marksman', 6, 2], ['aura', 6, 4]] }),
  builder('normal')({ id: 'warded-hill', name: 'The Warded Hill', blurb: 'Ward on the hill softens every blow taken there, for you and for them. Hold it for four turns.', personality: 'rusher',
    rules: { cells: cells('ward', [3, 3], [3, 2], [3, 4]) },
    objective: { kind: 'hold', at: at(3, 3), turns: 4, limit: 16 }, bonus: taken(3), solari: GUARD,
    umbral: [['leader', 6, 3], ['bruiser', 5, 3], ['charger', 5, 2], ['charger', 5, 4], ['marksman', 6, 2], ['marksman', 6, 4], [F, 5, 1], [F, 5, 5]] }),
  builder('hard')({ id: 'silenced-gate', name: 'The Silenced Gate', blurb: 'Silence lies over the gate where the Duskmother waits, and Recovery mends her guards. Reach the north-eastern beacon.', personality: 'caster', board: 'ruins',
    rules: { beacons: [at(0, 3), at(6, 0)], cells: [...cells('silence', [6, 3], [5, 1], [6, 1]), ...cells('recovery', [5, 0], [4, 1])] },
    objective: { kind: 'escort', goal: at(6, 0), limit: 9 }, bonus: within(6), solari: STRIKE, spells: ['blink', 'mend'],
    umbral: [['leader', 6, 3], ['aura', 6, 2], ['marksman', 6, 4], ['marksman', 5, 2], [F, 5, 1], [F, 5, 4], ['bruiser', 4, 1], ['flier', 6, 5]] }),
]
