import type { Role, Spell } from '../rules/types'
import { hpAll, hpOf, type Opponent } from './campaignHelpers'

const F: Role = 'footsoldier'

const spellsOnly = (spells: readonly Spell[]): Opponent['setup'] => (s, foe) => ({ ...s, spells: { ...s.spells, [foe]: [...spells] } })

/** The Expert tier between its first two battles and the Eclipse Queen: the hard AI with stacked twists. */
export const EXPERT_BATTLES: readonly Opponent[] = [
  {
    id: 'ember-watch', name: 'The Ember Watch', difficulty: 'hard', personality: 'turtle', board: 'pillars',
    blurb: 'A Turtle among the Pillars with 2 extra HP on every piece.',
    setup: hpAll(2),
  },
  {
    id: 'razor-tide', name: 'The Razor Tide', difficulty: 'hard', personality: 'rusher', board: 'flanks',
    blurb: 'A Rusher with two Chargers and a Bruiser, each 1 HP stronger, on the Flanks.',
    army: [F, F, F, F, 'flier', 'bruiser', 'charger', 'charger'],
    setup: hpOf(['bruiser', 'charger'], 1),
  },
  {
    id: 'dark-ledger', name: 'The Dark Ledger', difficulty: 'hard', personality: 'grabber', board: 'ruins',
    blurb: 'A Grabber with sturdy Fliers on the Ruins, under day events. First to 20 points.',
    rules: { mode: 'score', events: true },
    setup: hpOf(['flier'], 2),
  },
  {
    id: 'hex-weaver', name: 'The Hex Weaver', difficulty: 'hard', personality: 'caster',
    blurb: 'A Caster who knows Bind, Hold and Hasten, with every piece 1 HP stronger.',
    setup: (s, foe) => hpAll(1)({ ...s, spells: { ...s.spells, [foe]: ['bind', 'hold', 'hasten'] } }, foe),
  },
  {
    id: 'grey-marshal', name: 'The Grey Marshal', difficulty: 'hard', personality: 'balanced', board: 'ruins',
    blurb: 'A balanced court with a Leader 3 HP stronger. Capture their Leader to win.',
    rules: { mode: 'leader' },
    setup: hpOf(['leader'], 3),
  },
  {
    id: 'bastion', name: 'The Bastion', difficulty: 'hard', personality: 'turtle',
    blurb: 'Six Footsoldiers with 2 extra HP each. Hold the hill to win.',
    rules: { mode: 'hill' },
    army: [F, F, F, F, F, F, 'marksman', 'aura'],
    setup: hpOf([F], 2),
  },
  {
    id: 'wildfire', name: 'The Wildfire', difficulty: 'hard', personality: 'rusher',
    blurb: 'A Rusher with three Chargers, under day events, with a showdown at the Eclipse.',
    rules: { events: true, showdown: true },
    army: [F, F, F, F, 'charger', 'charger', 'charger', 'aura'],
  },
  {
    id: 'mirror-hall', name: 'The Mirror Hall', difficulty: 'hard', personality: 'caster',
    blurb: 'A Caster with Mirror, Exchange and Swap, in a game where the light runs in reverse.',
    rules: { reverse: true },
    setup: spellsOnly(['mirror', 'exchange', 'swap']),
  },
  {
    id: 'bone-harvest', name: 'The Bone Harvest', difficulty: 'hard', personality: 'grabber', board: 'pillars',
    blurb: 'A Grabber who plays the Pillars as a maze, with duel wins making Veterans. First to 20 points.',
    rules: { mode: 'score', growth: true },
    setup: hpOf(['flier'], 1),
  },
  {
    id: 'cold-sentinel', name: 'The Cold Sentinel', difficulty: 'hard', personality: 'turtle', board: 'flanks',
    blurb: 'A Turtle on the Flanks with 1 extra HP on every piece. The Eclipse falls at round 16.',
    rules: { eclipseRound: 16 },
    setup: hpAll(1),
  },
  {
    id: 'splinter-king', name: 'The Splinter King', difficulty: 'hard', personality: 'balanced',
    blurb: 'A short army of Bruisers and Marksmen, every piece 1 HP stronger. Capture their Leader to win.',
    rules: { mode: 'leader' },
    army: [F, F, F, F, 'marksman', 'marksman', 'bruiser', 'bruiser'],
    setup: hpAll(1),
  },
  {
    id: 'soul-broker', name: 'The Soul Broker', difficulty: 'hard', personality: 'caster',
    blurb: 'A Caster with Revive, Sacrifice and Mend, under day events and a showdown.',
    rules: { events: true, showdown: true },
    setup: spellsOnly(['revive', 'sacrifice', 'mend']),
  },
  {
    id: 'storm-front', name: 'The Storm Front', difficulty: 'hard', personality: 'rusher', board: 'ruins',
    blurb: 'A Rusher on the Ruins with a Bruiser 3 HP stronger. Footsoldiers promote at your home column.',
    rules: { promotion: true },
    setup: hpOf(['bruiser'], 3),
  },
  {
    id: 'amber-court', name: 'The Amber Court', difficulty: 'hard', personality: 'balanced', board: 'flanks',
    blurb: 'A balanced court with Footsoldiers 1 HP stronger. Hold the hill to win, with day events.',
    rules: { mode: 'hill', events: true },
    setup: hpOf([F], 1),
  },
  {
    id: 'last-lantern', name: 'The Last Lantern', difficulty: 'hard', personality: 'grabber', board: 'flanks',
    blurb: 'A Grabber with three Fliers 2 HP stronger, in a reverse day. First to 20 points.',
    rules: { mode: 'score', reverse: true },
    army: [F, F, F, 'flier', 'flier', 'flier', 'marksman', 'charger', 'aura'],
    setup: hpOf(['flier'], 2),
  },
  {
    id: 'void-scribe', name: 'The Void Scribe', difficulty: 'hard', personality: 'caster', board: 'pillars',
    blurb: 'A Caster with Shroud, Blink and Bind among the Pillars, every piece 1 HP stronger.',
    setup: (s, foe) => hpAll(1)({ ...s, spells: { ...s.spells, [foe]: ['shroud', 'blink', 'bind'] } }, foe),
  },
  {
    id: 'oath-breaker', name: 'The Oath Breaker', difficulty: 'hard', personality: 'rusher',
    blurb: 'A Rusher whose pieces are all 1 HP stronger; duel wins make Veterans, and the Eclipse falls at round 18.',
    rules: { growth: true, eclipseRound: 18 },
    setup: hpAll(1),
  },
  {
    id: 'crypt-keeper', name: 'The Crypt Keeper', difficulty: 'hard', personality: 'turtle', board: 'ruins',
    blurb: 'A Turtle on the Ruins with 2 extra HP on every piece. Capture their Leader to win.',
    rules: { mode: 'leader' },
    setup: hpAll(2),
  },
  {
    id: 'pale-regent', name: 'The Pale Regent', difficulty: 'hard', personality: 'balanced',
    blurb: 'A balanced court with 2 extra HP on every piece, under day events with a showdown.',
    rules: { events: true, showdown: true },
    setup: hpAll(2),
  },
  {
    id: 'thousand-cuts', name: 'The Thousand Cuts', difficulty: 'hard', personality: 'rusher', board: 'flanks',
    blurb: 'A Rusher with Marksmen and Chargers, every piece 1 HP stronger. First to 20 points, in a reverse day.',
    rules: { mode: 'score', reverse: true },
    army: [F, F, F, F, 'marksman', 'marksman', 'charger', 'charger', 'aura'],
    setup: hpAll(1),
  },
  {
    id: 'glass-tyrant', name: 'The Glass Tyrant', difficulty: 'hard', personality: 'balanced', board: 'pillars',
    blurb: 'Three Marksmen with 3 extra HP each among the Pillars, behind thin Footsoldiers.',
    army: [F, F, F, F, 'flier', 'marksman', 'marksman', 'marksman', 'aura'],
    setup: hpOf(['marksman'], 3),
  },
  {
    id: 'twilight-throne', name: 'The Twilight Throne', difficulty: 'hard', personality: 'caster',
    blurb: 'A Caster with Turn, Hasten and Conjure, every piece 2 HP stronger, with a showdown and a reverse day.',
    boss: 'The light runs in reverse and the outer squares turn deadly from the Eclipse.',
    rules: { reverse: true, showdown: true },
    setup: (s, foe) => hpAll(2)({ ...s, spells: { ...s.spells, [foe]: ['turn', 'hasten', 'conjure'] } }, foe),
  },
]
