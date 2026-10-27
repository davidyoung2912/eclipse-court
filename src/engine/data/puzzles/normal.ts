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
]
