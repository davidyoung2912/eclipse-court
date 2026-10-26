import { newGame } from '../reducer'
import { ROLE_STATS } from './roster'
import type { GameState, Piece, Pos, Role } from '../rules/types'

export type TutorialKind = 'move' | 'light' | 'duel' | 'spell' | 'end'

export interface TutorialStep {
  kind: TutorialKind
  title: string
  text: string
}

export const TUTORIAL_STEPS: readonly TutorialStep[] = [
  {
    kind: 'move',
    title: '1. Move',
    text: 'Tap your gold Lumen Knight, then the glowing square ahead of it. Knights step one square in any direction.',
  },
  {
    kind: 'light',
    title: '2. The light shifts',
    text: 'Once both courts have moved, the day advances. The dial shows the centre ring now and the next three steps. Squares near the middle brighten and darken in a ripple, while the outer columns stay Solari-bright on the left and Umbral-dark on the right. Gold favours Solari in duels, violet favours Umbral.',
  },
  {
    kind: 'duel',
    title: '3. Duel',
    text: 'Every capture is a 20 second duel. Tap your Knight, then the enemy beside it, and confirm. Drag on the left to move, hold the right button to attack. The odds bar shows who is favoured before you commit.',
  },
  {
    kind: 'spell',
    title: '4. Cast a spell',
    text: 'Your Solarch can cast each of seven spells once per game. A cast costs 1 HP and your whole turn. Choose Blink, then tap any empty square to jump the Solarch there.',
  },
  {
    kind: 'end',
    title: 'Ready',
    text: 'Hold all five beacons (the dashed rings) at the end of your turn, or defeat every enemy, to win. At round 30 the Eclipse falls: light freezes, spells fall silent and anyone off a beacon bleeds. Good luck.',
  },
]

export const TUTORIAL_KNIGHT = 'solari-footsoldier-1'
export const TUTORIAL_LEADER = 'solari-leader-1'
export const TUTORIAL_FOE = 'umbral-footsoldier-1'
/** Where the Knight must step to start the lesson, and where the foe waits for it. */
export const TUTORIAL_STEP_TO: Pos = { x: 2, y: 3 }
export const TUTORIAL_FOE_AT: Pos = { x: 3, y: 3 }

const piece = (court: 'solari' | 'umbral', role: Role, n: number, pos: Pos, hp = ROLE_STATS[role].hp): Piece => ({
  id: `${court}-${role}-${n}`, court, role, hp, maxHp: ROLE_STATS[role].hp, pos, rest: 0, moved: false, bound: false,
})

/** A small hand-built position: one Knight and a Solarch against a frail Ghoul and the Duskmother. */
export function tutorialStart(): GameState {
  return {
    ...newGame(7),
    pieces: [
      piece('solari', 'footsoldier', 1, { x: 1, y: 3 }),
      piece('solari', 'leader', 1, { x: 0, y: 3 }),
      piece('umbral', 'footsoldier', 1, TUTORIAL_FOE_AT, 2),
      piece('umbral', 'leader', 1, { x: 6, y: 3 }),
    ],
    spells: { solari: ['blink'], umbral: [] },
  }
}
