import type { Difficulty } from '../../ai/profile'
import { newGame } from '../reducer'
import { dailySeed } from './setups'
import { ROLE_STATS } from './roster'
import type { Action, Court, GameState, MatchConfig, Piece, Pos, Role, Spell } from '../rules/types'

/** An authored position with a goal: win within `limit` of your own turns, playing Solari. */
export interface Puzzle {
  id: string
  name: string
  /** The goal and the idea, in a sentence or two. */
  text: string
  /** Turns you have; a win on the last one still counts. */
  limit: number
  /** How well the Umbral side plays its replies and its duels. */
  difficulty: Difficulty
  build: () => GameState
  /** One way to win, as the player's actions; a capture carries the duel result it needs. */
  solution: readonly Action[]
}

const piece = (court: Court, role: Role, n: number, x: number, y: number, hp = ROLE_STATS[role].hp): Piece => ({
  id: `${court}-${role}-${n}`, court, role, hp, maxHp: ROLE_STATS[role].hp, pos: { x, y }, rest: 0, moved: false, bound: false,
})
const solari = (role: Role, n: number, x: number, y: number, hp?: number) => piece('solari', role, n, x, y, hp)
const umbral = (role: Role, n: number, x: number, y: number, hp?: number) => piece('umbral', role, n, x, y, hp)

/** A puzzle position: only the listed pieces, with the beacons and rules a puzzle needs. */
function position(
  seed: number, beacons: readonly Pos[], pieces: Piece[], spells: readonly Spell[], rules: Partial<MatchConfig> = {},
): GameState {
  return {
    ...newGame({ seed, beacons, setup: 'puzzle', ...rules }),
    pieces,
    spells: { solari: [...spells], umbral: [] },
  }
}

const at = (x: number, y: number): Pos => ({ x, y })
const move = (pieceId: string, x: number, y: number): Action => ({ type: 'move', pieceId, to: at(x, y) })

export const PUZZLES: readonly Puzzle[] = [
  {
    id: 'last-beacon',
    name: 'The last beacon',
    text: 'Hold all three beacons at the end of your turn. Two are already yours; fly in for the third.',
    limit: 1,
    difficulty: 'easy',
    build: () => position(101, [at(0, 3), at(3, 3), at(3, 5)], [
      solari('leader', 1, 0, 3), solari('footsoldier', 1, 3, 3), solari('flier', 1, 1, 3),
      umbral('leader', 1, 6, 3), umbral('footsoldier', 1, 5, 5),
    ], ['blink']),
    solution: [move('solari-flier-1', 3, 5)],
  },
  {
    id: 'blink',
    name: 'Out of reach',
    text: 'Your Solarch is too far from the last beacon to walk there. A spell is not bound by distance.',
    limit: 1,
    difficulty: 'easy',
    build: () => position(102, [at(1, 1), at(1, 5), at(3, 3)], [
      solari('leader', 1, 0, 0), solari('footsoldier', 1, 1, 1), solari('footsoldier', 2, 1, 5),
      umbral('leader', 1, 6, 6), umbral('marksman', 1, 6, 0),
    ], ['blink', 'mend']),
    solution: [{ type: 'cast', spell: 'blink', to: at(3, 3) }],
  },
  {
    id: 'two-moves',
    name: 'Two moves, two roles',
    text: 'Two beacons still need a piece, and you have two turns. A Stag jumps like a chess knight; an Archer shoots over two squares.',
    limit: 2,
    difficulty: 'normal',
    build: () => position(103, [at(2, 1), at(2, 5), at(4, 3)], [
      solari('leader', 1, 2, 1), solari('charger', 1, 0, 4), solari('marksman', 1, 4, 1),
      umbral('leader', 1, 6, 6), umbral('footsoldier', 1, 6, 0),
    ], []),
    solution: [move('solari-charger-1', 2, 5), move('solari-marksman-1', 4, 3)],
  },
  {
    id: 'wounded-queen',
    name: 'The wounded Duskmother',
    text: 'Capture the enemy Leader to win. She is hurt, and your Stag can reach her in one jump. Win the duel.',
    limit: 1,
    difficulty: 'normal',
    build: () => position(104, [at(0, 3), at(3, 3), at(6, 3)], [
      solari('leader', 1, 0, 3), solari('charger', 1, 4, 2),
      umbral('leader', 1, 6, 3, 2), umbral('aura', 1, 5, 5), umbral('footsoldier', 1, 5, 1),
    ], [], { mode: 'leader' }),
    solution: [{ type: 'move', pieceId: 'solari-charger-1', to: at(6, 3), duel: { attackerHp: 5, defenderHp: 0 } }],
  },
  {
    id: 'conjure',
    name: 'Out of thin air',
    text: 'Every piece you can spare is far away, and the Solarch must keep its beacon. Summon the third guard instead.',
    limit: 1,
    difficulty: 'easy',
    build: () => position(105, [at(1, 2), at(2, 3), at(1, 4)], [
      solari('leader', 1, 2, 3), solari('footsoldier', 1, 1, 2), solari('flier', 1, 0, 0),
      umbral('leader', 1, 6, 6), umbral('footsoldier', 1, 6, 0),
    ], ['conjure', 'blink', 'mend']),
    solution: [{ type: 'cast', spell: 'conjure', to: at(1, 4) }],
  },
]

export const puzzleById = (id: string) => PUZZLES.find((p) => p.id === id)

/** Today's puzzle: the same for everyone on the same date, rotating through the pack. */
export const dailyPuzzleIndex = (date = new Date()) => dailySeed(date) % PUZZLES.length
