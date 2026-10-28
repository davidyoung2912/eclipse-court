import { newGame } from '../reducer'
import { ROLE_STATS } from './roster'
import type { GameState, Piece, Pos, Role } from '../rules/types'

/** `info` steps only read, then continue with "Got it"; the others wait for the player to act on the board. */
export type TutorialKind = 'move' | 'info' | 'duel' | 'spell' | 'end'

export interface TutorialStep {
  kind: TutorialKind
  title: string
  text: string
}

export const TUTORIAL_STEPS: readonly TutorialStep[] = [
  {
    kind: 'move',
    title: '1. Move',
    text: 'Each turn you take one action: move one piece, cast a spell, or press End turn. Tap your gold Lumen Knight, then the glowing square ahead of it. Knights step one square in any direction.',
  },
  {
    kind: 'info',
    title: '2. Your Pieces',
    text: 'Every piece type moves and fights differently. Tap any piece to read its card: how it moves, how it fights in a duel and its HP. Sunhawks and Seraphs fly up to 3 squares, Stags jump like chess knights and the Solarch teleports up to 4.',
  },
  {
    kind: 'info',
    title: '3. The Light Shifts',
    text: 'Once both courts have moved, the day advances. The dial shows the centre ring now and the next three steps, from +2 (full light) to -2 (deep dark). Squares near the middle brighten and darken in a ripple outward from the centre.',
  },
  {
    kind: 'info',
    title: '4. Reading the Colours',
    text: 'A square\'s colour tells you who the light favours. Pale cream is Solari ground, deep indigo is Umbral ground, and the in-between shade is dusk, which favours nobody. The outer rows never change: the Solari half at the bottom is always bright, the Umbral half at the top always dark.',
  },
  {
    kind: 'info',
    title: '5. Light in Combat',
    text: 'In a duel, the court the square favours deals 15% more damage and takes 10% less for each step of brightness, up to +30% and -20% at full light or dark. The other court gets no bonus. So attack on your own ground, or wait for the light to turn. The odds card already counts it.',
  },
  {
    kind: 'info',
    title: '6. How a Duel Plays',
    text: 'Moving onto an enemy starts a 20 second duel in real time. Drag on the left to move, hold the right button to attack and release to strike: holding longer hits harder but slows you. The green bar over each fighter is its HP. After 12 seconds the arena shrinks to force a finish. Umbral fighters slowly regenerate.',
  },
  {
    kind: 'duel',
    title: '7. Your First Duel',
    text: 'Tap your Knight, then the enemy beside it. Your attacker glows gold and the target red while you read the odds: your win chance, a draw, and the defender\'s, plus the square\'s light. Cancel to think again, or Attack to fight.',
  },
  {
    kind: 'info',
    title: '8. Hit Points',
    text: 'The dots under each piece are its HP. A duel ends when one fighter reaches 0 HP (it is captured and the winner takes its square) or time runs out: then the fighter with the larger share of HP left wins. A tie leaves both standing and the defender holds. Survivors keep their wounds.',
  },
  {
    kind: 'info',
    title: '9. Healing',
    text: 'Wounds mend at the end of each round: +1 HP for every two rounds a piece stands still, +1 for sitting on a beacon, and +1 next to your Seraph or Wraith. Each court has a gift too: Umbral pieces heal an extra 1 on dark squares, and Solari Fliers reach one square further in full light. No piece heals above its maximum, so retreat and rest wounded pieces before the next fight.',
  },
  {
    kind: 'spell',
    title: '10. Cast a Spell',
    text: 'Your Solarch can cast each of seven spells once per game, if it has at least 2 HP. A cast costs 1 HP and your whole turn, and pieces on beacons cannot be targeted. Choose Blink, then tap any empty square to jump the Solarch there. (In Skirmish you can pick a loadout of four from a larger pool, with two signature spells for each court.)',
  },
  {
    kind: 'info',
    title: '11. How to Win',
    text: 'In the classic game, hold all five beacons (the dashed rings) at the end of your turn, or defeat every enemy piece. Beacons also heal whoever stands on them. Skirmish adds other goals (capture the Leader, a beacon score race, hold the centre); the line under the round counter shows yours.',
  },
  {
    kind: 'info',
    title: '12. Special Squares',
    text: 'Some boards have coloured squares with effects: Might adds damage, Ward cuts damage taken, Recovery heals, Hazard hurts, Silence blocks a Leader\'s spells and Invincibility protects on odd rounds. A legend under the board names each colour, and tapping an empty square describes it. Use them: a duel on a Ward square is far safer.',
  },
  {
    kind: 'info',
    title: '13. Veterans and Promotion',
    text: 'In some games a piece that wins duels grows. It becomes a Veteran with +1 max HP, then an Elite that picks a perk. A Footsoldier that reaches the enemy home column is promoted to a Charger or a Marksman. You are asked to choose just before your move is played.',
  },
  {
    kind: 'info',
    title: '14. Goal Line, Hints and Undo',
    text: 'The white line above every board states the goal of that battle, whether it is a campaign opponent, a scenario, a puzzle or a story chapter. Stuck? The Hint button suggests a move for free (puzzles give the setter\'s own hints), and Undo takes your last move back in games against the AI. Neither is available online.',
  },
  {
    kind: 'info',
    title: '15. Ways to Play',
    text: 'Skirmish builds a match to your liking, including the 9x9 Grand board. The Campaign is a ladder of battles and hand-built scenarios that earn stars, the Gauntlet is a run with one army, Puzzles give you a fixed position, the Daily is the same for everyone, and Story tells the tale of the two courts. You can also play a friend on one device or online.',
  },
  {
    kind: 'end',
    title: 'The Eclipse',
    text: 'At round 30 the Eclipse falls: the shifting light freezes at dusk, spells fall silent and any piece off a beacon loses 1 HP every round. With the showdown rule, red squares hurt 3 HP a round and the safe zone shrinks to the centre. Otherwise, if nobody has won by round 50, the court holding more beacons (then more total HP) wins. Good luck.',
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
