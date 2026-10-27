import { at, move, position, solari, umbral, type Puzzle } from './helpers'

export const BEGINNER: readonly Puzzle[] = [
  {
    id: 'last-beacon',
    name: 'The last beacon',
    text: 'Hold all three beacons at the end of your turn. Two are already yours; fly in for the third.',
    tier: 'beginner',
    limit: 1,
    difficulty: 'easy',
    build: () => position(101, [at(0, 3), at(3, 3), at(3, 5)], [
      solari('leader', 1, 0, 3), solari('footsoldier', 1, 3, 3), solari('flier', 1, 1, 3),
      umbral('leader', 1, 6, 3), umbral('footsoldier', 1, 5, 5),
    ], ['blink']),
    solution: [move('solari-flier-1', 3, 5)],
    hints: ['Count the beacons you already hold. One is missing.', 'Your Sunhawk can reach the empty beacon in a single move.'],
  },
  {
    id: 'blink',
    name: 'Out of reach',
    text: 'Your Solarch is too far from the last beacon to walk there. A spell is not bound by distance.',
    tier: 'beginner',
    limit: 1,
    difficulty: 'easy',
    build: () => position(102, [at(1, 1), at(1, 5), at(3, 3)], [
      solari('leader', 1, 0, 0), solari('footsoldier', 1, 1, 1), solari('footsoldier', 2, 1, 5),
      umbral('leader', 1, 6, 6), umbral('marksman', 1, 6, 0),
    ], ['blink', 'mend']),
    solution: [{ type: 'cast', spell: 'blink', to: at(3, 3) }],
    hints: ['No piece can walk to the third beacon in one turn. Look at your spells.', 'Blink moves your Solarch to any empty square, so send it to the beacon.'],
  },
  {
    id: 'conjure',
    name: 'Out of thin air',
    text: 'Every piece you can spare is far away, and the Solarch must keep its beacon. Summon the third guard instead.',
    tier: 'beginner',
    limit: 1,
    difficulty: 'easy',
    build: () => position(105, [at(1, 2), at(2, 3), at(1, 4)], [
      solari('leader', 1, 2, 3), solari('footsoldier', 1, 1, 2), solari('flier', 1, 0, 0),
      umbral('leader', 1, 6, 6), umbral('footsoldier', 1, 6, 0),
    ], ['conjure', 'blink', 'mend']),
    solution: [{ type: 'cast', spell: 'conjure', to: at(1, 4) }],
    hints: ['Two beacons are held and the third is empty, but nobody can reach it.', 'Conjure puts a new Footsoldier on a square beside your own pieces. Place it on the empty beacon.'],
  },
  {
    id: 'wounded-queen',
    name: 'The wounded Duskmother',
    text: 'Capture the enemy Leader to win. She is hurt, and your Stag can reach her in one jump. Win the duel.',
    tier: 'beginner',
    limit: 1,
    difficulty: 'easy',
    build: () => position(104, [at(0, 3), at(3, 3), at(6, 3)], [
      solari('leader', 1, 0, 3), solari('charger', 1, 4, 2),
      umbral('leader', 1, 6, 3, 2), umbral('aura', 1, 5, 5), umbral('footsoldier', 1, 5, 1),
    ], [], { mode: 'leader' }),
    solution: [{ type: 'move', pieceId: 'solari-charger-1', to: at(6, 3), duel: { attackerHp: 5, defenderHp: 0 } }],
    hints: ['This match is won by capturing a Leader, not by holding beacons.', 'The Stag jumps in an L from its square to the enemy Leader. She is hurt, so the duel favours you.'],
  },
]
