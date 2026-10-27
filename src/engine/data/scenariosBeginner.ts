import type { Scenario } from './scenarios'
import type { Pos } from '../rules/types'
import { at, lineup, type Spec } from './scenarioHelpers'

const F = 'footsoldier'

/** Solari's usual Beginner force: a Leader with escorts and a lead of two or three pieces. */
const GUARD: readonly Spec[] = [['leader', 0, 3], ['bruiser', 1, 3], ['aura', 0, 2], ['marksman', 0, 4], [F, 1, 2], [F, 1, 4]]
const STRIKE: readonly Spec[] = [['leader', 0, 3], ['charger', 1, 3], ['flier', 0, 2], ['flier', 0, 4], ['bruiser', 1, 2], ['marksman', 1, 4]]

/** A small Umbral force set out on the right-hand side. */
const FOES: Record<string, readonly Spec[]> = {
  pair: [['leader', 6, 3], [F, 5, 3], [F, 5, 2]],
  line: [['leader', 6, 3], ['marksman', 6, 2], [F, 5, 2], [F, 5, 3], [F, 5, 4]],
  wall: [['leader', 6, 3], ['aura', 6, 2], [F, 5, 1], [F, 5, 2], [F, 5, 3], [F, 5, 4], [F, 5, 5]],
  rush: [['leader', 6, 3], ['charger', 5, 3], ['charger', 5, 4], [F, 5, 2], [F, 6, 4]],
  guns: [['leader', 6, 3], ['marksman', 6, 1], ['marksman', 6, 5], ['aura', 6, 2], [F, 5, 3]],
  wings: [['leader', 6, 3], ['flier', 6, 1], ['flier', 6, 5], [F, 5, 2], [F, 5, 4]],
  heavy: [['leader', 6, 3], ['bruiser', 5, 3], ['bruiser', 5, 4], [F, 5, 2], ['aura', 6, 4]],
  mixed: [['leader', 6, 3], ['bruiser', 5, 3], ['marksman', 6, 2], ['flier', 6, 5], [F, 5, 2], [F, 5, 4]],
}

type Spec1 = Omit<Scenario, 'difficulty' | 'setup' | 'bonus'> & { bonus: readonly [string, Scenario['bonus']['met']]; solari: readonly Spec[]; umbral: readonly Spec[]; spells?: Parameters<typeof lineup>[2] }

/** An escort goal is kept free: whatever the foe has parked on it starts in the corner instead. */
const clear = (foes: readonly Spec[], goal: Pos | null): readonly Spec[] =>
  foes.map((f): Spec => (goal && f[1] === goal.x && f[2] === goal.y ? [f[0], 6, 6, f[3]] : f))

const build = ({ bonus, solari, umbral, spells, ...rest }: Spec1): Scenario => ({
  ...rest, difficulty: 'easy', bonus: { text: bonus[0], met: bonus[1] },
  setup: lineup(solari, clear(umbral, rest.objective.kind === 'escort' ? rest.objective.goal : null), spells),
})

const taken = (n: number) => [`Take ${n} enemy piece${n === 1 ? '' : 's'}`, (s: { taken: number }) => s.taken >= n] as const
const within = (n: number) => [`Win within ${n} rounds`, (s: { turns: number }) => s.turns <= n] as const
const lose = (n: number) => [n === 0 ? 'Win without losing a piece' : `Lose no more than ${n} piece${n === 1 ? '' : 's'}`, (s: { lost: number }) => s.lost <= n] as const

/** The Beginner scenarios: the easy AI, a clear Solari edge, and short goals. */
export const BEGINNER_SCENARIOS: readonly Scenario[] = [
  build({ id: 'first-light', name: 'First Light', blurb: 'The easy way in: a small Umbral guard and four rounds to wait out.', personality: 'turtle',
    objective: { kind: 'survive', rounds: 4 }, bonus: taken(1), solari: GUARD, umbral: FOES.pair }),
  build({ id: 'short-walk', name: 'The Short Walk', blurb: 'Walk the Solarch to the far beacon. A thin line stands in the way.', personality: 'balanced',
    objective: { kind: 'escort', goal: at(6, 3), limit: 10 }, bonus: within(5), solari: STRIKE, umbral: FOES.line }),
  build({ id: 'hilltop-nap', name: 'The Hilltop Nap', blurb: 'Take the centre and keep it for two turns while the Umbral court dozes.', personality: 'turtle',
    objective: { kind: 'hold', at: at(3, 3), turns: 2, limit: 12 }, bonus: lose(1), solari: GUARD, umbral: FOES.pair }),
  build({ id: 'quiet-vigil', name: 'The Quiet Vigil', blurb: 'Five rounds against a few Footsoldiers and a Marksman.', personality: 'grabber',
    objective: { kind: 'survive', rounds: 5 }, bonus: lose(1), solari: GUARD, umbral: FOES.line }),
  build({ id: 'pillar-path', name: 'The Pillar Path', blurb: 'Slip the Solarch between the Pillars to the far beacon.', personality: 'rusher', board: 'pillars',
    objective: { kind: 'escort', goal: at(6, 3), limit: 10 }, bonus: within(6), solari: STRIKE, umbral: FOES.rush }),
  build({ id: 'green-hill', name: 'The Green Hill', blurb: 'Hold the centre for three turns against a Rusher with few pieces.', personality: 'rusher',
    objective: { kind: 'hold', at: at(3, 3), turns: 3, limit: 14 }, bonus: taken(2), solari: GUARD, umbral: FOES.rush }),
  build({ id: 'two-hold', name: 'Two Hold Out', blurb: 'The Solarch and a Golem outlast a small Umbral band for five rounds.', personality: 'balanced',
    objective: { kind: 'survive', rounds: 5 }, bonus: taken(1), solari: [['leader', 0, 3], ['bruiser', 1, 3], ['aura', 0, 2]], umbral: FOES.pair }),
  build({ id: 'ruin-dash', name: 'The Ruin Dash', blurb: 'Run the Solarch through the fallen walls to the north-eastern beacon.', personality: 'caster', board: 'ruins',
    rules: { beacons: [at(0, 3), at(6, 0)] },
    objective: { kind: 'escort', goal: at(6, 0), limit: 10 }, bonus: within(6), solari: STRIKE, umbral: [['leader', 6, 3], ['aura', 6, 2], [F, 5, 1], [F, 5, 3]] }),
  build({ id: 'flank-camp', name: 'The Flank Camp', blurb: 'Hold the centre of the Flanks board for two turns.', personality: 'grabber', board: 'flanks',
    objective: { kind: 'hold', at: at(3, 3), turns: 2, limit: 12 }, bonus: lose(2), solari: GUARD, umbral: FOES.line }),
  build({ id: 'warm-welcome', name: 'A Warm Welcome', blurb: 'Mend and Blink in hand, outlast a Caster for six rounds.', personality: 'caster',
    objective: { kind: 'survive', rounds: 6 }, bonus: lose(2), solari: GUARD, umbral: FOES.guns, spells: ['mend', 'blink'] }),
  build({ id: 'sunrise-run', name: 'The Sunrise Run', blurb: 'Fliers and a Charger give the Solarch a quick road east.', personality: 'turtle',
    objective: { kind: 'escort', goal: at(6, 3), limit: 8 }, bonus: within(4), solari: STRIKE, umbral: FOES.wall }),
  build({ id: 'ridge-sitter', name: 'The Ridge Sitter', blurb: 'Hold the Ruins centre for two turns. Few can reach you.', personality: 'turtle', board: 'ruins',
    objective: { kind: 'hold', at: at(3, 3), turns: 2, limit: 12 }, bonus: lose(1), solari: GUARD, umbral: FOES.heavy }),
  build({ id: 'sky-watch', name: 'The Sky Watch', blurb: 'Six rounds with two Umbral Fliers circling.', personality: 'grabber',
    objective: { kind: 'survive', rounds: 6 }, bonus: taken(2), solari: GUARD, umbral: FOES.wings }),
  build({ id: 'beacon-walk', name: 'The Beacon Walk', blurb: 'Take the Solarch to the northern Flanks beacon.', personality: 'balanced', board: 'flanks',
    objective: { kind: 'escort', goal: at(3, 1), limit: 8 }, bonus: within(4), solari: STRIKE, umbral: [['leader', 6, 3], ['marksman', 6, 2], [F, 5, 3], [F, 5, 4]] }),
  build({ id: 'steady-hands', name: 'Steady Hands', blurb: 'Hold the centre for three turns against two Golems.', personality: 'balanced',
    objective: { kind: 'hold', at: at(3, 3), turns: 3, limit: 14 }, bonus: lose(2), solari: GUARD, umbral: FOES.heavy }),
  build({ id: 'pillar-vigil', name: 'The Pillar Vigil', blurb: 'Seven rounds among the Pillars against a Marksman battery.', personality: 'caster', board: 'pillars',
    objective: { kind: 'survive', rounds: 7 }, bonus: lose(2), solari: GUARD, umbral: FOES.guns }),
  build({ id: 'gentle-march', name: 'The Gentle March', blurb: 'A long walk east against a wall of Footsoldiers, with Blink to help.', personality: 'turtle',
    objective: { kind: 'escort', goal: at(6, 3), limit: 10 }, bonus: within(6), solari: STRIKE, umbral: FOES.wall, spells: ['blink', 'mend'] }),
  build({ id: 'day-break', name: 'Daybreak', blurb: 'Day events strike. Hold the centre for two turns.', personality: 'rusher', rules: { events: true },
    objective: { kind: 'hold', at: at(3, 3), turns: 2, limit: 14 }, bonus: taken(2), solari: GUARD, umbral: FOES.rush }),
  build({ id: 'last-ember', name: 'The Last Ember', blurb: 'Seven rounds against a mixed band. Beacons shelter you.', personality: 'balanced',
    objective: { kind: 'survive', rounds: 7 }, bonus: taken(2), solari: GUARD, umbral: FOES.mixed }),
  build({ id: 'ruin-guard', name: 'The Ruin Guard', blurb: 'Escort the Solarch across the Ruins with a Charger and Fliers.', personality: 'rusher', board: 'ruins',
    objective: { kind: 'escort', goal: at(6, 3), limit: 10 }, bonus: within(6), solari: STRIKE, umbral: FOES.rush }),
  build({ id: 'flank-stand', name: 'The Flank Stand', blurb: 'Hold the centre on the Flanks board for three turns.', personality: 'grabber', board: 'flanks',
    objective: { kind: 'hold', at: at(3, 3), turns: 3, limit: 14 }, bonus: lose(2), solari: GUARD, umbral: FOES.wings }),
  build({ id: 'hollow-night', name: 'The Hollow Night', blurb: 'The light runs backwards. Outlast a Turtle for six rounds.', personality: 'turtle', rules: { reverse: true },
    objective: { kind: 'survive', rounds: 6 }, bonus: lose(1), solari: GUARD, umbral: FOES.wall }),
  build({ id: 'eagle-road', name: 'The Eagle Road', blurb: 'Fliers escort the Solarch past an Umbral Marksman line.', personality: 'caster',
    objective: { kind: 'escort', goal: at(6, 3), limit: 8 }, bonus: within(5), solari: STRIKE, umbral: FOES.guns }),
  build({ id: 'sunlit-court', name: 'The Sunlit Court', blurb: 'Hold the centre for four turns with a strong army against a small one.', personality: 'balanced',
    objective: { kind: 'hold', at: at(3, 3), turns: 4, limit: 16 }, bonus: lose(2), solari: [...GUARD, ['charger', 1, 1], ['flier', 0, 5]], umbral: FOES.mixed }),
  build({ id: 'beginners-dawn', name: "Beginner's Dawn", blurb: 'The Eclipse falls at round 6. Last to round 8 with your Solarch alive.', personality: 'grabber', rules: { eclipseRound: 6 },
    objective: { kind: 'survive', rounds: 8 }, bonus: lose(3), solari: [...GUARD, ['charger', 1, 1]], umbral: FOES.mixed }),
]
