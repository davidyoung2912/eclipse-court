import type { Opponent } from '../campaign'
import { lineup, type Spec } from '../scenarioHelpers'
import type { Difficulty } from '../difficulty'
import type { PersonalityId } from '../personality'

const F = 'footsoldier'

type Fight = Pick<Opponent, 'id' | 'name' | 'blurb' | 'board' | 'rules'> & {
  difficulty: Difficulty
  personality: PersonalityId
  /** The Solari force the AI plays, in board coordinates. */
  solari: readonly Spec[]
  /** The Umbral force the player has; a piece's id is its court, role and place in this list (`umbral-footsoldier-1` is the first Footsoldier). */
  umbral: readonly Spec[]
}

const fight = ({ solari, umbral, rules, ...rest }: Fight): Opponent => ({
  ...rest, rules: { mode: 'leader', ...rules }, setup: lineup(solari, umbral),
})

/** The fights of Act II, where the player takes the Umbral court against a Solari AI; Leader Capture, with the player's army larger than the AI's. */
export const UMBRAL_FIGHTS: readonly Opponent[] = [
  fight({ id: 'vesper-gate', name: 'The Vesper Gate', blurb: 'Solari raiders reach the Halls\' gate. Capture their Leader.', difficulty: 'easy', personality: 'rusher',
    solari: [['leader', 0, 3], ['charger', 1, 3], [F, 1, 2], [F, 1, 4], ['aura', 0, 2], ['marksman', 0, 4]],
    umbral: [['leader', 6, 3], ['aura', 6, 2], ['flier', 6, 1], [F, 5, 2], [F, 5, 4], ['bruiser', 5, 3], ['marksman', 6, 4]] }),
  fight({ id: 'crypt-stair', name: 'The Crypt Stair', blurb: 'The Solari push among the Pillars toward the crypts. Hold them and take their Leader.', difficulty: 'normal', personality: 'turtle', board: 'pillars',
    solari: [['leader', 0, 3], ['bruiser', 1, 3], ['aura', 0, 2], ['charger', 1, 4], ['marksman', 0, 4], [F, 1, 2]],
    umbral: [['leader', 6, 3], ['aura', 6, 2], ['flier', 6, 1], [F, 5, 2], [F, 5, 4], [F, 5, 5], ['bruiser', 5, 3], ['marksman', 6, 4]] }),
  fight({ id: 'troll-debt', name: 'The Troll Debt', blurb: 'The Mire Trolls come to collect in the ruins. Take the Solari Leader before they take yours.', difficulty: 'normal', personality: 'rusher', board: 'ruins',
    solari: [['leader', 0, 3], ['charger', 1, 3], ['charger', 1, 4], ['aura', 0, 2], ['marksman', 0, 4], [F, 1, 2]],
    umbral: [['leader', 6, 3], ['aura', 6, 2], ['flier', 6, 1], [F, 5, 2], ['bruiser', 5, 3], ['bruiser', 5, 4], ['marksman', 6, 4], [F, 5, 5]] }),
  fight({ id: 'night-crossing', name: 'The Night Crossing', blurb: 'Fliers on both sides over the Flanks. Capture their Leader.', difficulty: 'normal', personality: 'grabber', board: 'flanks',
    solari: [['leader', 0, 3], ['flier', 0, 1], ['flier', 0, 5], ['marksman', 1, 2], ['marksman', 1, 4], ['aura', 0, 2], [F, 1, 3]],
    umbral: [['leader', 6, 3], ['flier', 6, 1], ['flier', 6, 5], ['aura', 6, 2], ['marksman', 6, 4], [F, 5, 2], [F, 5, 4], ['bruiser', 5, 3]] }),
  fight({ id: 'long-dusk', name: 'The Long Dusk', blurb: 'The Solari come in force and the Eclipse falls at round 10. Capture their Leader before then.', difficulty: 'normal', personality: 'caster',
    rules: { eclipseRound: 10, events: true },
    solari: [['leader', 0, 3], ['charger', 1, 3], ['bruiser', 1, 2], ['flier', 0, 5], ['aura', 0, 2], ['marksman', 0, 4], [F, 1, 4]],
    umbral: [['leader', 6, 3], ['aura', 6, 2], ['flier', 6, 1], [F, 5, 2], [F, 5, 4], [F, 5, 5], ['bruiser', 5, 3], ['marksman', 6, 4], ['charger', 5, 1]] }),
]

export const umbralFightById = (id: string) => UMBRAL_FIGHTS.find((f) => f.id === id)
