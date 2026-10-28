export type PersonalityId = 'balanced' | 'rusher' | 'turtle' | 'grabber' | 'caster' | 'baiter' | 'guardian'

/** How an AI weighs the same position: skill is set by the difficulty, taste by the personality. */
export interface Personality {
  name: string
  text: string
  /** Weight on the enemy's material; above 1 it trades eagerly. */
  attack: number
  /** Weight on its own material; above 1 it guards its pieces and retreats the wounded. */
  guard: number
  /** Weight on beacons held and on closing in on those it lacks. */
  beacon: number
  /** Score added to casting a spell, so high values cast early and often. */
  spells: number
  /** Score for a healthy piece left in light that favours it where the foe can reach it, a lure. */
  bait: number
  /** Weight on keeping friendly pieces close around its own Leader. */
  screen: number
}

export const PERSONALITIES: Record<PersonalityId, Personality> = {
  balanced: { name: 'Balanced', text: 'Plays the position as it comes.', attack: 1, guard: 1, beacon: 1, spells: 0, bait: 0, screen: 0 },
  rusher: { name: 'Rusher', text: 'Hunts your pieces and shrugs off its own losses.', attack: 1.6, guard: 0.7, beacon: 0.6, spells: 0, bait: 0, screen: 0 },
  turtle: { name: 'Turtle', text: 'Guards every piece and gives ground before it gives a trade.', attack: 0.8, guard: 1.7, beacon: 1, spells: -0.5, bait: 0, screen: 0 },
  grabber: { name: 'Grabber', text: 'Races for the beacons and ignores the fight.', attack: 0.8, guard: 1, beacon: 2.2, spells: 0, bait: 0, screen: 0 },
  caster: { name: 'Caster', text: "Spends its Leader's spells early and often.", attack: 1, guard: 1, beacon: 1, spells: 1.5, bait: 0, screen: 0 },
  baiter: { name: 'Baiter', text: 'Leaves healthy pieces in good light within your reach and punishes the trade.', attack: 1.1, guard: 1.2, beacon: 0.9, spells: 0, bait: 1.5, screen: 0 },
  guardian: { name: 'Guardian', text: 'Keeps a ring of pieces around its Leader and wins from behind it.', attack: 0.9, guard: 1.2, beacon: 1, spells: 0, bait: 0, screen: 1 },
}

/** A master's style, pulled part of the way back to Balanced: it plays what the position asks for. */
export function temper(w: Personality, by: number): Personality {
  const b = PERSONALITIES.balanced
  const mix = (x: number, y: number) => x + (y - x) * by
  return { ...w, attack: mix(w.attack, b.attack), guard: mix(w.guard, b.guard), beacon: mix(w.beacon, b.beacon) }
}
