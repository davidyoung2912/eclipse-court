export type PersonalityId = 'balanced' | 'rusher' | 'turtle' | 'grabber' | 'caster'

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
}

export const PERSONALITIES: Record<PersonalityId, Personality> = {
  balanced: { name: 'Balanced', text: 'Plays the position as it comes.', attack: 1, guard: 1, beacon: 1, spells: 0 },
  rusher: { name: 'Rusher', text: 'Hunts your pieces and shrugs off its own losses.', attack: 1.6, guard: 0.7, beacon: 0.6, spells: 0 },
  turtle: { name: 'Turtle', text: 'Guards every piece and gives ground before it gives a trade.', attack: 0.8, guard: 1.7, beacon: 1, spells: -0.5 },
  grabber: { name: 'Grabber', text: 'Races for the beacons and ignores the fight.', attack: 0.8, guard: 1, beacon: 2.2, spells: 0 },
  caster: { name: 'Caster', text: "Spends its Leader's spells early and often.", attack: 1, guard: 1, beacon: 1, spells: 1.5 },
}
