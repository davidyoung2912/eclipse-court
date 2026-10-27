import { at, move, position, solari, umbral, type Puzzle } from './helpers'

export const NORMAL: readonly Puzzle[] = [
  {
    id: 'two-moves',
    name: 'Two moves, two roles',
    text: 'Two beacons still need a piece, and you have two turns. A Stag jumps like a chess knight; an Archer shoots over two squares.',
    tier: 'normal',
    limit: 2,
    difficulty: 'normal',
    build: () => position(103, [at(2, 1), at(2, 5), at(4, 3)], [
      solari('leader', 1, 2, 1), solari('charger', 1, 0, 4), solari('marksman', 1, 4, 1),
      umbral('leader', 1, 6, 6), umbral('footsoldier', 1, 6, 0),
    ], []),
    solution: [move('solari-charger-1', 2, 5), move('solari-marksman-1', 4, 3)],
    hints: ['Two beacons are empty and two turns are yours. Match each piece to a beacon.', 'The Stag jumps in an L and the Archer steps two squares. Each can reach a different beacon.'],
  },
  {
    id: 'wounded-queen',
    name: 'The wounded Duskmother',
    text: 'Capture the enemy Leader to win. She is hurt, and your Stag can reach her in one jump. Win the duel.',
    tier: 'normal',
    limit: 1,
    difficulty: 'normal',
    build: () => position(104, [at(0, 3), at(3, 3), at(6, 3)], [
      solari('leader', 1, 0, 3), solari('charger', 1, 4, 2),
      umbral('leader', 1, 6, 3, 2), umbral('aura', 1, 5, 5), umbral('footsoldier', 1, 5, 1),
    ], [], { mode: 'leader' }),
    solution: [{ type: 'move', pieceId: 'solari-charger-1', to: at(6, 3), duel: { attackerHp: 5, defenderHp: 0 } }],
    hints: ['This match is won by capturing a Leader, not by holding beacons.', 'The Stag jumps in an L from its square to the enemy Leader. She is hurt, so the duel favours you.'],
  },
]
