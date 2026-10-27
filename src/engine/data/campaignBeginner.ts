import type { Role, Spell } from '../rules/types'
import { hpAll, hpOf, mapFoe, withHp, type Opponent } from './campaignHelpers'

const F: Role = 'footsoldier'

const spellsOnly = (spells: readonly Spell[]): Opponent['setup'] => (s, foe) => ({ ...s, spells: { ...s.spells, [foe]: [...spells] } })

/** The Beginner tier after its first two battles: the easy AI with one gentle twist each. */
export const BEGINNER_BATTLES: readonly Opponent[] = [
  {
    id: 'sleepy-sentry', name: 'The Sleepy Sentry', difficulty: 'easy', personality: 'turtle', board: 'pillars',
    blurb: 'A Turtle among the Pillars whose Footsoldiers have 1 HP less.',
    setup: hpOf([F], -1),
  },
  {
    id: 'lone-archer', name: 'The Lone Archer', difficulty: 'easy', personality: 'balanced',
    blurb: 'One Marksman and a thin line of Footsoldiers.',
    army: [F, F, F, F, 'flier', 'marksman', 'aura'],
  },
  {
    id: 'open-gate', name: 'The Open Gate', difficulty: 'easy', personality: 'rusher', board: 'ruins',
    blurb: 'A Rusher whose Bruiser has 3 HP less, on the Ruins board.',
    setup: hpOf(['bruiser'], -3),
  },
  {
    id: 'coin-counter', name: 'The Coin Counter', difficulty: 'easy', personality: 'grabber', board: 'flanks',
    blurb: 'A Grabber who counts beacons on the Flanks. First to 20 points.',
    rules: { mode: 'score' },
  },
  {
    id: 'hill-squatter', name: 'The Hill Squatter', difficulty: 'easy', personality: 'turtle',
    blurb: 'A Turtle sitting on the centre. Hold the hill to win.',
    rules: { mode: 'hill' },
  },
  {
    id: 'bookworm', name: 'The Bookworm', difficulty: 'easy', personality: 'caster',
    blurb: 'A Caster whose Leader knows only Blink and Mend.',
    setup: spellsOnly(['blink', 'mend']),
  },
  {
    id: 'dusty-duelist', name: 'The Dusty Duelist', difficulty: 'easy', personality: 'balanced',
    blurb: 'A balanced court whose Chargers have 2 HP less.',
    setup: hpOf(['charger'], -2),
  },
  {
    id: 'paper-wall', name: 'The Paper Wall', difficulty: 'easy', personality: 'turtle',
    blurb: 'A wall of six Footsoldiers, each with 1 HP less.',
    army: [F, F, F, F, F, F, 'marksman', 'aura'],
    setup: hpOf([F], -1),
  },
  {
    id: 'rookie-rush', name: 'The Rookie Rush', difficulty: 'easy', personality: 'rusher',
    blurb: 'A Rusher with Chargers and Footsoldiers only.',
    army: [F, F, F, F, 'charger', 'charger', 'charger'],
  },
  {
    id: 'thin-air', name: 'The Thin Air', difficulty: 'easy', personality: 'grabber', board: 'flanks',
    blurb: 'Three Fliers, no Bruiser, and a race for the Flanks beacons.',
    army: [F, F, 'flier', 'flier', 'flier', 'marksman', 'aura'],
  },
  {
    id: 'apprentice', name: 'The Apprentice', difficulty: 'easy', personality: 'caster',
    blurb: 'A Caster with Blink, Mend and Swap, and 1 HP less on every piece.',
    setup: (s, foe) => hpAll(-1)({ ...s, spells: { ...s.spells, [foe]: ['blink', 'mend', 'swap'] } }, foe),
  },
  {
    id: 'stone-circle', name: 'The Stone Circle', difficulty: 'easy', personality: 'balanced', board: 'pillars',
    blurb: 'A balanced court among the Pillars, with a Leader that is 2 HP weaker.',
    setup: hpOf(['leader'], -2),
  },
  {
    id: 'quick-fox', name: 'The Quick Fox', difficulty: 'easy', personality: 'rusher',
    blurb: 'A Rusher with extra Fliers and a short game: the Eclipse falls at round 15.',
    rules: { eclipseRound: 15 },
    army: [F, F, F, 'flier', 'flier', 'flier', 'charger', 'aura'],
  },
  {
    id: 'slow-tide', name: 'The Slow Tide', difficulty: 'easy', personality: 'turtle',
    blurb: 'A Turtle in no hurry: the Eclipse waits until round 40.',
    rules: { eclipseRound: 40 },
  },
  {
    id: 'bone-picker', name: 'The Bone Picker', difficulty: 'easy', personality: 'balanced',
    blurb: 'A balanced court with a lone Mire Troll. Capture their Leader to win.',
    rules: { mode: 'leader' },
    army: [F, F, F, F, 'flier', 'marksman', 'marksman', 'bruiser'],
  },
  {
    id: 'dim-lantern', name: 'The Dim Lantern', difficulty: 'easy', personality: 'caster',
    blurb: 'A Caster who has lost the Wraith, with their Marksmen 1 HP weaker.',
    army: [F, F, F, F, 'flier', 'flier', 'marksman', 'marksman', 'bruiser', 'charger'],
    setup: hpOf(['marksman'], -1),
  },
  {
    id: 'courier', name: 'The Courier', difficulty: 'easy', personality: 'grabber', board: 'ruins',
    blurb: 'A Grabber who sprints for beacons across the Ruins. First to 20 points.',
    rules: { mode: 'score' },
    setup: hpOf(['flier'], -1),
  },
  {
    id: 'brittle-brute', name: 'The Brittle Brute', difficulty: 'easy', personality: 'rusher',
    blurb: 'Two Bruisers, each with 4 HP less, charging out of the dark.',
    army: [F, F, F, F, 'marksman', 'bruiser', 'bruiser'],
    setup: hpOf(['bruiser'], -4),
  },
  {
    id: 'pilgrim', name: 'The Pilgrim', difficulty: 'easy', personality: 'balanced',
    blurb: 'A balanced court whose Footsoldiers promote when they cross your home column.',
    rules: { promotion: true },
  },
  {
    id: 'hollow-bell', name: 'The Hollow Bell', difficulty: 'easy', personality: 'turtle', board: 'ruins',
    blurb: 'A Turtle on the Ruins board. Hold the hill to win.',
    rules: { mode: 'hill' },
    setup: hpOf(['aura'], -2),
  },
  {
    id: 'ember-witch', name: 'The Ember Witch', difficulty: 'easy', personality: 'caster',
    blurb: 'A Caster with Mend, Turn and Bind, and no Marksmen.',
    army: [F, F, F, F, 'flier', 'flier', 'bruiser', 'charger', 'aura'],
    setup: spellsOnly(['mend', 'turn', 'bind']),
  },
  {
    id: 'harvest-moon', name: 'The Harvest Moon', difficulty: 'easy', personality: 'grabber',
    blurb: 'A Grabber with Footsoldiers 1 HP weaker; duel wins make Veterans for both courts.',
    rules: { growth: true },
    setup: hpOf([F], -1),
  },
  {
    id: 'grey-regent', name: 'The Grey Regent', difficulty: 'easy', personality: 'rusher',
    blurb: 'The last of the Beginners. A Rusher with a full army, 1 HP less on every piece.',
    boss: 'The light runs in reverse for the whole battle.',
    rules: { reverse: true },
    setup: (s, foe) => mapFoe(s, foe, (p) => withHp(p, -1)),
  },
]
