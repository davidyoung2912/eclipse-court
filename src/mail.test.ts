import { describe, expect, it } from 'vitest'
import { matchConfig } from './engine/data/matchConfig'
import { reduce, newGame } from './engine/reducer'
import { legalMoves } from './engine/rules/moves'
import type { Action } from './engine/rules/types'
import type { GameRecord } from './engine/log'
import { decodeRecord, encodeRecord } from './engine/serialize'
import { dropMail, gameId, mailGame, putMail, receive, statusOf, toMove } from './mail'

const initial = newGame(matchConfig({ seed: 11 }))

/** The game after `n` passes, which every turn allows. */
function passes(n: number, from = initial): GameRecord {
  const actions: Action[] = Array.from({ length: n }, () => ({ type: 'pass' }))
  return { initial: from, actions }
}

describe('receive', () => {
  it('takes the court whose turn it is for a game not held', () => {
    expect(receive(null, passes(0))).toEqual({ kind: 'new', me: initial.turn })
    expect(receive(null, passes(1))).toEqual({ kind: 'new', me: initial.turn === 'solari' ? 'umbral' : 'solari' })
  })

  it('accepts a longer record, ignores the same or shorter, and refuses another game', () => {
    const held = passes(2)
    expect(receive(held, passes(3))).toEqual({ kind: 'update' })
    expect(receive(held, passes(2))).toEqual({ kind: 'known' })
    expect(receive(held, passes(1))).toEqual({ kind: 'known' })
    expect(receive(held, passes(1, newGame(matchConfig({ seed: 12 }))))).toEqual({ kind: 'clash' })
  })

  it('refuses a record that departs from the held moves', () => {
    const piece = initial.pieces.find((p) => p.court === initial.turn)!
    const to = legalMoves(initial, piece)[0]
    const moved = reduce(initial, { type: 'move', pieceId: piece.id, to })
    expect(moved).not.toBe(initial)
    const held: GameRecord = { initial, actions: [{ type: 'pass' }] }
    const other: GameRecord = { initial, actions: [{ type: 'move', pieceId: piece.id, to }, { type: 'pass' }] }
    expect(receive(held, other)).toEqual({ kind: 'clash' })
  })
})

describe('status and ids', () => {
  it('says whose move it is', () => {
    expect(statusOf(passes(0), initial.turn)).toBe('yours')
    expect(statusOf(passes(1), initial.turn)).toBe('theirs')
    expect(toMove(passes(1))).not.toBe(initial.turn)
  })

  it('names a game by where it began, not how far it went', () => {
    expect(gameId(passes(0))).toBe(gameId(passes(3)))
    expect(gameId(passes(0))).not.toBe(gameId(passes(0, newGame(matchConfig({ seed: 12 })))))
  })
})

describe('the saved list', () => {
  it('keeps a game as a code that decodes to the same record', () => {
    const record = passes(2)
    const game = putMail(record, 'umbral', 5)
    expect(mailGame(game.id)?.code).toBe(encodeRecord(record))
    expect(decodeRecord(game.code)?.actions).toHaveLength(2)
    putMail(passes(3), 'umbral', 6)
    expect(mailGame(game.id)?.updated).toBe(6)
    dropMail(game.id)
    expect(mailGame(game.id)).toBeUndefined()
  })
})
