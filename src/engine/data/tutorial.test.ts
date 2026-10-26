import { describe, expect, it } from 'vitest'
import { reduce } from '../reducer'
import { legalMoves, pieceAt } from '../rules/moves'
import { spellTargets } from '../rules/spells'
import { TUTORIAL_FOE, TUTORIAL_FOE_AT, TUTORIAL_KNIGHT, TUTORIAL_LEADER, TUTORIAL_STEP_TO, tutorialStart } from './tutorial'

describe('tutorial position', () => {
  it('plays through move, duel and spell without ending the game early', () => {
    let s = tutorialStart()
    const knight = s.pieces.find((p) => p.id === TUTORIAL_KNIGHT)!
    expect(legalMoves(s, knight).some((m) => m.x === TUTORIAL_STEP_TO.x && m.y === TUTORIAL_STEP_TO.y)).toBe(true)

    const phase = s.phase
    s = reduce(reduce(s, { type: 'move', pieceId: TUTORIAL_KNIGHT, to: TUTORIAL_STEP_TO }), { type: 'pass' })
    expect(s.turn).toBe('solari')
    expect(s.phase).not.toBe(phase)

    const moved = s.pieces.find((p) => p.id === TUTORIAL_KNIGHT)!
    expect(legalMoves(s, moved).some((m) => m.x === TUTORIAL_FOE_AT.x && m.y === TUTORIAL_FOE_AT.y)).toBe(true)
    s = reduce(s, { type: 'move', pieceId: TUTORIAL_KNIGHT, to: TUTORIAL_FOE_AT, duel: { attackerHp: 0, defenderHp: 2 } })
    s = reduce(s, { type: 'pass' })
    expect(s.winner).toBeNull()
    expect(s.pieces.some((p) => p.id === TUTORIAL_FOE)).toBe(true)

    const targets = spellTargets(s, 'solari', 'blink')
    expect(targets.squares.length).toBeGreaterThan(0)
    const to = targets.squares.find((q) => !pieceAt(s, q))!
    s = reduce(s, { type: 'cast', spell: 'blink', to })
    expect(s.pieces.find((p) => p.id === TUTORIAL_LEADER)!.pos).toEqual(to)
    expect(s.winner).toBeNull()
  })

  it('does not end the game when the Knight wins the duel', () => {
    let s = tutorialStart()
    s = reduce(reduce(s, { type: 'move', pieceId: TUTORIAL_KNIGHT, to: TUTORIAL_STEP_TO }), { type: 'pass' })
    s = reduce(s, { type: 'move', pieceId: TUTORIAL_KNIGHT, to: TUTORIAL_FOE_AT, duel: { attackerHp: 3, defenderHp: 0 } })
    expect(s.winner).toBeNull()
  })
})
