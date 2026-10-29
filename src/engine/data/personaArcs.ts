import type { Role } from '../rules/types'
import { campaignGame, type Opponent } from './campaign'
import { hpAll, hpOf } from './campaignHelpers'
import { personaById, PERSONAS, type PersonaId } from './personas'

/** Fights in one arc. */
export const ARC_FIGHTS = 3
/** An arc opens once the player has beaten its persona this many times. */
export const ARC_UNLOCK_WINS = 1
/** Shards for each arc fight won, and for the last one on top of that. */
export const SHARDS_ARC_FIGHT = 15
export const SHARDS_ARC_DONE = 100
/** Shards for winning a Grudge match, once per loss. */
export const SHARDS_GRUDGE = 20

/** A short run of three fights against one persona, each with an army or rule of its own. */
export interface Arc {
  persona: PersonaId
  title: string
  fights: readonly Opponent[]
  /** The capture effect the last fight earns (a `capture` cosmetic with `arc` set to this persona). */
  prize: string
}

type Fight = Omit<Opponent, 'personality'>

const army = (...roles: [Role, number][]): Role[] => roles.flatMap(([role, n]) => Array<Role>(n).fill(role))

const FIGHTS: Record<PersonaId, { title: string; prize: string; fights: readonly [Fight, Fight, Fight] }> = {
  cassia: {
    title: 'The Long Dawn', prize: 'dawnfire',
    fights: [
      { id: 'cassia-1', name: 'First Light', blurb: 'Cassia sends a wall of Chargers and Fliers at your door.', difficulty: 'normal',
        army: army(['footsoldier', 3], ['charger', 3], ['flier', 2], ['bruiser', 1], ['aura', 1]) },
      { id: 'cassia-2', name: 'High Noon', blurb: 'Day events strike and her Chargers are sturdier by 2 HP.', difficulty: 'hard',
        rules: { events: true }, setup: hpOf(['charger'], 2) },
      { id: 'cassia-3', name: 'The Last Charge', blurb: 'Every piece she has is 1 HP stronger, and the Eclipse comes at round 16.', difficulty: 'hard',
        rules: { eclipseRound: 16, showdown: true }, setup: hpAll(1) },
    ],
  },
  pym: {
    title: 'The Meridian Records', prize: 'inkbloom',
    fights: [
      { id: 'pym-1', name: 'Marginalia', blurb: 'Pym fights from the Ruins, her Leader armed with every spell.', difficulty: 'normal', board: 'ruins' },
      { id: 'pym-2', name: 'Cross-Reference', blurb: 'The Crossroads, its hazard cells lit. Her first spell each turn is free.', difficulty: 'hard',
        board: 'crossroads', rules: { freeCast: 'umbral' } },
      { id: 'pym-3', name: 'The Final Index', blurb: 'Free spells, the light running backwards and 1 extra HP on her Leader and Auras.', difficulty: 'hard',
        rules: { freeCast: 'umbral', reverse: true }, setup: hpOf(['leader', 'aura'], 1) },
    ],
  },
  bea: {
    title: "The Leader's Door", prize: 'doorlight',
    fights: [
      { id: 'bea-1', name: 'Knock First', blurb: 'Bea holds the Pillars with Bruisers in front.', difficulty: 'normal', board: 'pillars',
        army: army(['footsoldier', 3], ['bruiser', 2], ['marksman', 2], ['aura', 1], ['flier', 1]) },
      { id: 'bea-2', name: 'Barred and Bolted', blurb: 'Her Bruisers and Footsoldiers have 2 extra HP. Capture the Leader to win.', difficulty: 'hard',
        rules: { mode: 'leader' }, setup: hpOf(['bruiser', 'footsoldier'], 2) },
      { id: 'bea-3', name: 'No Entry', blurb: 'Every piece has 2 extra HP and the outer squares turn deadly late.', difficulty: 'hard',
        rules: { edge: { court: 'umbral', hp: 2 }, eclipseRound: 20, showdown: true } },
    ],
  },
  mudge: {
    title: 'The Mire Debt', prize: 'miregleam',
    fights: [
      { id: 'mudge-1', name: 'Interest', blurb: 'Mudge sits behind a wall of Footsoldiers with 1 extra HP.', difficulty: 'normal',
        setup: hpOf(['footsoldier'], 1) },
      { id: 'mudge-2', name: 'Principal', blurb: 'The Shrine board, held by Bruisers. Hold the centre to win.', difficulty: 'hard', board: 'shrine', rules: { mode: 'hill' },
        army: army(['footsoldier', 3], ['bruiser', 2], ['aura', 2], ['marksman', 2], ['charger', 1]) },
      { id: 'mudge-3', name: 'Paid in Full', blurb: 'Every piece has 1 extra HP, and the day runs backwards.', difficulty: 'hard',
        rules: { reverse: true, showdown: true }, setup: hpAll(1) },
    ],
  },
  lowen: {
    title: 'Nine Lives', prize: 'ravenwing',
    fights: [
      { id: 'lowen-1', name: 'First Life', blurb: 'Lowen baits you with Fliers and Chargers on the Flanks.', difficulty: 'normal', board: 'flanks',
        army: army(['footsoldier', 2], ['flier', 3], ['charger', 2], ['marksman', 2], ['aura', 1]) },
      { id: 'lowen-2', name: 'Fifth Life', blurb: 'Duel wins make Veterans for both courts, and day events strike.', difficulty: 'hard',
        rules: { growth: true, events: true } },
      { id: 'lowen-3', name: 'Ninth Life', blurb: 'His Leader has 3 extra HP. Capture it, or he does not fall.', difficulty: 'hard',
        rules: { mode: 'leader' }, setup: hpOf(['leader'], 3) },
    ],
  },
  digby: {
    title: 'Volunteer!', prize: 'ghoulglow',
    fights: [
      { id: 'digby-1', name: 'Hands Up', blurb: 'A swarm of Footsoldiers and Fliers, nothing else but a Leader.', difficulty: 'normal',
        army: army(['footsoldier', 6], ['flier', 3], ['aura', 1]) },
      { id: 'digby-2', name: 'Everyone Volunteers', blurb: 'A swarm of Chargers with day events.', difficulty: 'hard',
        rules: { events: true }, army: army(['footsoldier', 5], ['charger', 3], ['flier', 2]) },
      { id: 'digby-3', name: 'Last Volunteer', blurb: 'The swarm comes back sturdier: 1 extra HP each, with a race to 20 points.', difficulty: 'hard',
        rules: { mode: 'score' }, setup: hpAll(1) },
    ],
  },
  quill: {
    title: 'The Iron Ledger', prize: 'ironcoin',
    fights: [
      { id: 'quill-1', name: 'Opening Balance', blurb: 'Quill races you for the beacons on the Flanks. First to 20 points.', difficulty: 'normal',
        board: 'flanks', rules: { mode: 'score' } },
      { id: 'quill-2', name: 'Audit', blurb: 'The Crossroads, a score race and 1 extra HP on every piece.', difficulty: 'hard',
        board: 'crossroads', rules: { mode: 'score' }, setup: hpAll(1) },
      { id: 'quill-3', name: 'Closing the Books', blurb: 'Hold the centre against his Marksmen while the Eclipse falls at round 18.', difficulty: 'hard',
        rules: { mode: 'hill', eclipseRound: 18 }, army: army(['footsoldier', 4], ['marksman', 3], ['bruiser', 1], ['aura', 2]) },
    ],
  },
  regent: {
    title: 'The Pale Echo', prize: 'paleecho',
    fights: [
      { id: 'regent-1', name: 'An Echo of the Hour', blurb: 'The Regent plays with the light running backwards.', difficulty: 'normal', rules: { reverse: true } },
      { id: 'regent-2', name: 'A Failed Claim', blurb: 'Day events strike, duel wins make Veterans and the showdown closes in.', difficulty: 'hard',
        rules: { events: true, growth: true, showdown: true } },
      { id: 'regent-3', name: 'The Hour Itself', blurb: 'Free spells, 2 extra HP on every piece and the Eclipse at round 14.', difficulty: 'hard',
        rules: { freeCast: 'umbral', eclipseRound: 14, showdown: true }, setup: hpAll(2) },
    ],
  },
}

export const ARCS: readonly Arc[] = PERSONAS.map((p) => {
  const { title, prize, fights } = FIGHTS[p.id]
  return { persona: p.id, title, prize, fights: fights.map((f) => ({ ...f, personality: p.personality })) }
})

export const arcOf = (id: PersonaId): Arc => ARCS.find((a) => a.persona === id)!

/** The fight that is `step` into an arc (0 to 2), or undefined past the end. */
export const arcFight = (id: PersonaId, step: number): Opponent | undefined => personaById(id) ? arcOf(id).fights[step] : undefined

/** The opening position of an arc fight: the player is Solari, as in the campaign. */
export const arcGame = (fight: Opponent, seed: number) => campaignGame(fight, seed, 'arc')
