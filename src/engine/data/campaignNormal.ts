import type { Role, Spell } from '../rules/types'
import { hpAll, hpOf, mapFoe, withHp, type Opponent } from './campaignHelpers'

const F: Role = 'footsoldier'

const spellsOnly = (spells: readonly Spell[]): Opponent['setup'] => (s, foe) => ({ ...s, spells: { ...s.spells, [foe]: [...spells] } })

/** The Normal tier after its first three battles: the normal AI with a harder twist, often two together. */
export const NORMAL_BATTLES: readonly Opponent[] = [
  {
    id: 'gatekeeper', name: 'The Gatekeeper', difficulty: 'normal', personality: 'turtle', board: 'pillars',
    blurb: 'A Turtle among the Pillars with 1 extra HP on every piece.',
    setup: hpAll(1),
  },
  {
    id: 'ash-runner', name: 'The Ash Runner', difficulty: 'normal', personality: 'grabber', board: 'flanks',
    blurb: 'A Grabber with three Fliers, racing for the Flanks beacons. First to 20 points.',
    rules: { mode: 'score' },
    army: [F, F, F, 'flier', 'flier', 'flier', 'marksman', 'charger', 'aura'],
  },
  {
    id: 'storm-caller', name: 'The Storm Caller', difficulty: 'normal', personality: 'caster',
    blurb: 'A Caster who knows Hold, Hasten and Bind, under day events.',
    rules: { events: true },
    setup: spellsOnly(['hold', 'hasten', 'bind']),
  },
  {
    id: 'hill-warden', name: 'The Hill Warden', difficulty: 'normal', personality: 'turtle',
    blurb: 'A Turtle with sturdy Footsoldiers, sitting on the centre. Hold the hill to win.',
    rules: { mode: 'hill' },
    setup: hpOf([F], 2),
  },
  {
    id: 'twin-bruisers', name: 'The Twin Bruisers', difficulty: 'normal', personality: 'rusher',
    blurb: 'Two Bruisers and a Charger lead a short, brutal charge.',
    army: [F, F, F, F, 'marksman', 'bruiser', 'bruiser', 'charger'],
  },
  {
    id: 'glass-cannons', name: 'The Glass Cannons', difficulty: 'normal', personality: 'balanced',
    blurb: 'Three Marksmen with 2 extra HP each, behind thin Footsoldiers.',
    army: [F, F, F, F, 'flier', 'marksman', 'marksman', 'marksman', 'aura'],
    setup: hpOf(['marksman'], 2),
  },
  {
    id: 'dusk-regent', name: 'The Dusk Regent', difficulty: 'normal', personality: 'balanced', board: 'ruins',
    blurb: 'A balanced court on the Ruins. Capture their Leader to win.',
    rules: { mode: 'leader' },
    setup: hpOf(['leader'], 2),
  },
  {
    id: 'swap-merchant', name: 'The Swap Merchant', difficulty: 'normal', personality: 'caster',
    blurb: 'A Caster with Swap, Exchange and Mirror, and Footsoldiers 1 HP weaker.',
    setup: (s, foe) => hpOf([F], -1)({ ...s, spells: { ...s.spells, [foe]: ['swap', 'exchange', 'mirror'] } }, foe),
  },
  {
    id: 'night-market', name: 'The Night Market', difficulty: 'normal', personality: 'grabber', board: 'ruins',
    blurb: 'A Grabber haggling over the Ruins beacons, with day events. First to 20 points.',
    rules: { mode: 'score', events: true },
  },
  {
    id: 'bone-wall', name: 'The Bone Wall', difficulty: 'normal', personality: 'turtle',
    blurb: 'Six Footsoldiers with 1 extra HP each, a Marksman and an Aura.',
    army: [F, F, F, F, F, F, 'marksman', 'aura'],
    setup: hpOf([F], 1),
  },
  {
    id: 'lantern-thief', name: 'The Lantern Thief', difficulty: 'normal', personality: 'rusher',
    blurb: 'A Rusher with extra Fliers, in a game where the Eclipse falls at round 20.',
    rules: { eclipseRound: 20 },
    army: [F, F, F, 'flier', 'flier', 'flier', 'charger', 'charger', 'aura'],
  },
  {
    id: 'long-vigil', name: 'The Long Vigil', difficulty: 'normal', personality: 'turtle', board: 'pillars',
    blurb: 'A Turtle among the Pillars. The Eclipse waits until round 40, then the outer squares turn deadly.',
    rules: { eclipseRound: 40, showdown: true },
    setup: hpOf(['aura'], 2),
  },
  {
    id: 'grave-digger', name: 'The Grave Digger', difficulty: 'normal', personality: 'caster',
    blurb: 'A Caster with Revive, Mend and Sacrifice, and a Bruiser at the front.',
    setup: spellsOnly(['revive', 'mend', 'sacrifice']),
  },
  {
    id: 'moth-queen', name: 'The Moth Queen', difficulty: 'normal', personality: 'grabber', board: 'flanks',
    blurb: 'Three Fliers with 1 extra HP each, on the Flanks. Footsoldiers promote at your home column.',
    rules: { promotion: true },
    army: [F, F, F, F, 'flier', 'flier', 'flier', 'marksman', 'aura'],
    setup: hpOf(['flier'], 1),
  },
  {
    id: 'iron-vow', name: 'The Iron Vow', difficulty: 'normal', personality: 'balanced',
    blurb: 'A balanced court with 1 extra HP on every piece; duel wins make Veterans for both courts.',
    rules: { growth: true },
    setup: hpAll(1),
  },
  {
    id: 'false-dawn', name: 'The False Dawn', difficulty: 'normal', personality: 'rusher',
    blurb: 'A Rusher in a game where the light runs in reverse.',
    rules: { reverse: true },
    setup: hpOf(['charger'], 1),
  },
  {
    id: 'crown-breaker', name: 'The Crown Breaker', difficulty: 'normal', personality: 'rusher', board: 'flanks',
    blurb: 'A Rusher with two Chargers and a Bruiser. Capture their Leader to win, on the Flanks.',
    rules: { mode: 'leader' },
    army: [F, F, F, F, 'flier', 'bruiser', 'charger', 'charger'],
  },
  {
    id: 'sun-eater', name: 'The Sun Eater', difficulty: 'normal', personality: 'caster',
    blurb: 'A Caster with Shroud, Turn and Blink. From the Eclipse on, the outer squares turn deadly.',
    rules: { showdown: true },
    setup: spellsOnly(['shroud', 'turn', 'blink']),
  },
  {
    id: 'salt-road', name: 'The Salt Road', difficulty: 'normal', personality: 'grabber', board: 'pillars',
    blurb: 'A Grabber who plays the Pillars as a maze. First to 20 points, under day events.',
    rules: { mode: 'score', events: true },
    setup: hpOf(['flier'], 1),
  },
  {
    id: 'obsidian-guard', name: 'The Obsidian Guard', difficulty: 'normal', personality: 'turtle', board: 'ruins',
    blurb: 'A Turtle on the Ruins with every piece 1 HP stronger. Hold the hill to win.',
    rules: { mode: 'hill' },
    setup: hpAll(1),
  },
  {
    id: 'quiet-shore', name: 'The Quiet Shore', difficulty: 'normal', personality: 'balanced', board: 'flanks',
    blurb: 'A balanced court on the Flanks, with a Bruiser 2 HP stronger and a Charger 1 HP weaker.',
    setup: (s, foe) => hpOf(['charger'], -1)(hpOf(['bruiser'], 2)(s, foe), foe),
  },
  {
    id: 'second-sun', name: 'The Second Sun', difficulty: 'normal', personality: 'balanced',
    blurb: 'The last before the Experts. A full army with 1 extra HP and a showdown at the Eclipse.',
    boss: 'Day events and a showdown at the Eclipse, with the light running in reverse.',
    rules: { reverse: true, events: true, showdown: true },
    setup: (s, foe) => mapFoe(s, foe, (p) => withHp(p, 1)),
  },
]
