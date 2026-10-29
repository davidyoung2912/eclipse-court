import { describe, expect, it } from 'vitest'
import { chooseAction } from '../../ai/strategy'
import { reduce } from '../reducer'
import { PERSONAS } from './personas'
import {
  CUP_SIZE, NONE, bracketSize, champion, cleanNames, cupField, cupGame, cupOpponent, newBracket, nextMatch, report, roundName, roundCount, shuffled, sidesOf, simulate,
} from './tournament'

const names = (n: number) => Array.from({ length: n }, (_, i) => `P${i}`)

describe('newBracket', () => {
  it('fills a power-of-two size with byes spread so no two meet', () => {
    for (let n = 4; n <= 8; n++) {
      const b = newBracket(names(n), 7)
      expect(b.slots).toHaveLength(bracketSize(n))
      expect(b.slots.filter((s) => s === NONE)).toHaveLength(bracketSize(n) - n)
      expect([...b.slots].filter((s) => s !== NONE).sort()).toEqual(Array.from({ length: n }, (_, i) => i))
      for (let m = 0; m < b.slots.length / 2; m++) expect(b.slots[2 * m]).not.toBe(NONE)
      expect(b.results.map((r) => r.length)).toEqual(Array.from({ length: roundCount(n) }, (_, r) => bracketSize(n) / 2 ** (r + 1)))
    }
  })

  it('advances byes at once and is the same for the same seed', () => {
    const b = newBracket(names(5), 3)
    expect(b.results[0].filter((w) => w !== NONE)).toHaveLength(3)
    expect(newBracket(names(5), 3)).toEqual(b)
    expect(shuffled(8, 1)).not.toEqual(shuffled(8, 2))
  })
})

describe('playing a bracket', () => {
  it('plays every match to one champion, whatever the size', () => {
    for (let n = 4; n <= 8; n++) {
      let b = newBracket(names(n), n)
      let played = 0
      for (let ref = nextMatch(b); ref; ref = nextMatch(b)) {
        b = report(b, ref, sidesOf(b, ref)[played % 2])
        played++
      }
      expect(played).toBe(n - 1)
      expect(champion(b)).not.toBeNull()
    }
  })

  it('ignores a winner who is not in the match or a match already decided', () => {
    const b = newBracket(names(4), 1)
    const ref = nextMatch(b)!
    const [a, c] = sidesOf(b, ref)
    const other = [0, 1, 2, 3].find((i) => i !== a && i !== c)!
    expect(report(b, ref, other)).toBe(b)
    expect(report(b, ref, NONE)).toBe(b)
    const done = report(b, ref, a)
    expect(report(done, ref, c)).toBe(done)
  })

  it('names the rounds from the end', () => {
    expect([0, 1, 2].map((r) => roundName(r, 3))).toEqual(['Quarterfinal', 'Semifinal', 'Final'])
    expect(roundName(0, 4)).toBe('Round 1')
  })
})

describe('cleanNames', () => {
  it('trims, fills blanks and keeps names distinct', () => {
    expect(cleanNames(['  Ann ', '', 'ann', 'A very long name indeed'])).toEqual(['Ann', 'Player 2', 'ann 2', 'A very long'])
  })
})

describe('the Persona Cup', () => {
  it('draws seven distinct personas', () => {
    for (let seed = 1; seed < 20; seed++) {
      const field = cupField(seed)
      expect(field).toHaveLength(CUP_SIZE - 1)
      expect(new Set(field).size).toBe(field.length)
    }
  })

  it('simulates the other matches and stops at the player', () => {
    const b = simulate(newBracket(['You', ...PERSONAS.slice(0, 7).map((p) => p.name)], 5), 5, 0)
    const ref = nextMatch(b)!
    expect(sidesOf(b, ref)).toContain(0)
    expect(b.results[0].filter((w) => w === NONE)).toHaveLength(1)
    expect(simulate(b, 5, 0)).toEqual(b)
  })

  it('crowns a persona once the player is out', () => {
    let b = simulate(newBracket(['You', ...PERSONAS.slice(0, 7).map((p) => p.name)], 9), 9, 0)
    const ref = nextMatch(b)!
    b = simulate(report(b, ref, sidesOf(b, ref).find((s) => s !== 0)!), 9, 0)
    expect(champion(b)).not.toBeNull()
    expect(champion(b)).not.toBe(0)
  })

  it('makes later rounds harder and builds a legal opening that the AI plays on', () => {
    expect(cupOpponent('cassia', 0).difficulty).toBe('normal')
    expect(cupOpponent('cassia', 2).difficulty).toBe('hard')
    for (const [i, p] of PERSONAS.entries()) {
      const fight = cupOpponent(p.id, i % 3)
      let s = cupGame(fight, 20 + i)
      expect(s.turn).toBe('solari')
      for (let n = 0; n < 6 && !s.winner; n++) {
        const a = chooseAction(s, 'easy', n + 1, s.turn === 'umbral' ? fight.personality : 'balanced')
        const next = reduce(s, a.type === 'move' && s.pieces.some((p) => p.pos.x === a.to.x && p.pos.y === a.to.y && p.court !== s.turn)
          ? { ...a, duel: { attackerHp: 0, defenderHp: 1 } } : a)
        expect(next).not.toBe(s)
        s = next
      }
    }
  })
})
