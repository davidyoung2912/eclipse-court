import type { Spell } from '../rules/types'
import { hpAll, hpOf, type Opponent } from './campaignHelpers'

const F = 'footsoldier' as const

const spellsOnly = (spells: readonly Spell[]): Opponent['setup'] => (s, foe) => ({ ...s, spells: { ...s.spells, [foe]: [...spells] } })

/** The Grand Court: twelve 9x9 battles, easy to hard, each with the sixteen-piece armies. */
export const GRAND_BATTLES: readonly Opponent[] = [
  {
    id: 'grand-welcome', name: 'The Wide Welcome', size: 9, difficulty: 'easy', personality: 'balanced',
    blurb: 'An open 9x9 board and a balanced court whose Footsoldiers have 1 HP less.',
    setup: hpOf([F], -1),
  },
  {
    id: 'grand-long-walk', name: 'The Long Walk', size: 9, difficulty: 'easy', personality: 'turtle', board: 'grand-pillars',
    blurb: 'A Turtle among the Grand Pillars whose Bruiser has 3 HP less.',
    setup: hpOf(['bruiser'], -3),
  },
  {
    id: 'grand-quiet-shrine', name: 'The Quiet Shrine', size: 9, difficulty: 'easy', personality: 'caster', board: 'grand-shrine',
    blurb: 'A Caster on the Grand Shrine who knows only Blink and Mend.',
    setup: spellsOnly(['blink', 'mend']),
  },
  {
    id: 'grand-far-hill', name: 'The Far Hill', size: 9, difficulty: 'easy', personality: 'grabber',
    blurb: 'A Grabber on the open board. Hold the centre hill to win.',
    rules: { mode: 'hill' },
  },
  {
    id: 'grand-cartographer', name: 'The Cartographer', size: 9, difficulty: 'normal', personality: 'grabber', board: 'grand-pillars',
    blurb: 'A Grabber counting the Grand Pillars beacons. First to 20 points.',
    rules: { mode: 'score' },
  },
  {
    id: 'grand-rampart', name: 'The Rampart', size: 9, difficulty: 'normal', personality: 'turtle',
    blurb: 'A Turtle with Footsoldiers 2 HP stronger, under day events.',
    rules: { events: true },
    setup: hpOf([F], 2),
  },
  {
    id: 'grand-vanguard', name: 'The Vanguard', size: 9, difficulty: 'normal', personality: 'rusher', board: 'grand-shrine',
    blurb: 'A Rusher whose Chargers and Bruiser have 1 HP more, with promotion on the Grand Shrine.',
    rules: { promotion: true },
    setup: hpOf(['charger', 'bruiser'], 1),
  },
  {
    id: 'grand-hollow-crown', name: 'The Hollow Crown', size: 9, difficulty: 'normal', personality: 'balanced', board: 'grand-pillars',
    blurb: 'Capture their Leader, who has 3 HP more, to win.',
    rules: { mode: 'leader' },
    setup: hpOf(['leader'], 3),
  },
  {
    id: 'grand-spell-warden', name: 'The Spell Warden', size: 9, difficulty: 'hard', personality: 'caster', board: 'grand-shrine',
    blurb: 'A Caster who knows Bind, Hold and Hasten, with every piece 1 HP stronger.',
    setup: (s, foe) => hpAll(1)({ ...s, spells: { ...s.spells, [foe]: ['bind', 'hold', 'hasten'] } }, foe),
  },
  {
    id: 'grand-reverse-march', name: 'The Reverse March', size: 9, difficulty: 'hard', personality: 'rusher',
    blurb: 'A Rusher on the open board. The day runs in reverse, with day events and growth.',
    rules: { reverse: true, events: true, growth: true },
  },
  {
    id: 'grand-iron-ring', name: 'The Iron Ring', size: 9, difficulty: 'hard', personality: 'turtle', board: 'grand-pillars',
    blurb: 'A Turtle with 2 extra HP on every piece, and the Eclipse showdown closing in.',
    rules: { showdown: true },
    setup: hpAll(2),
  },
  {
    id: 'grand-eclipse-sovereign', name: 'The Eclipse Sovereign', size: 9, difficulty: 'hard', personality: 'caster', board: 'grand-shrine',
    blurb: 'Every piece has 2 extra HP, and the Grand Shrine is theirs.',
    boss: 'The Eclipse falls at round 24, the showdown follows, and day events strike.',
    rules: { eclipseRound: 24, showdown: true, events: true },
    setup: hpAll(2),
  },
]
