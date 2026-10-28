import { describe, expect, it } from 'vitest'
import { chooseAction } from '../../ai/strategy'
import { reduce } from '../reducer'
import { validConfig } from '../serialize'
import { leaderOf, spellTargets } from '../rules/spells'
import type { GameState } from '../rules/types'
import { BOSSES, BOSS_COURT } from './bosses'
import { foeById, ladderConfig, ladderGame, LADDER_BOSSES, LADDER_FOES } from './ladder'

/** A game with the Umbral boss to move. */
const bossTurn = (id: string): GameState => {
  const s = ladderGame(11, foeById(id))
  return { ...s, turn: BOSS_COURT }
}

describe('bosses', () => {
  it('are ladder foes above every ordinary rung, with valid matches', () => {
    expect(LADDER_BOSSES).toHaveLength(BOSSES.length)
    const top = Math.max(...LADDER_FOES.map((f) => f.rating))
    for (const f of LADDER_BOSSES) {
      expect(f.rating, f.name).toBeGreaterThan(top)
      expect(foeById(f.id)).toBe(f)
      expect(validConfig(ladderConfig(3, f)), f.name).toBe(true)
      expect(ladderGame(3, f).pieces.length, f.name).toBeGreaterThan(0)
    }
    expect(new Set(BOSSES.map((b) => b.id)).size).toBe(BOSSES.length)
  })

  it('apply their signature rules to the match', () => {
    expect(ladderConfig(1, foeById('boss-veil-sister')).freeCast).toBe(BOSS_COURT)
    expect(ladderConfig(1, foeById('boss-ash-tyrant')).cells?.some((c) => c.effect === 'hazard')).toBe(true)
    const king = ladderGame(1, foeById('boss-hollow-king'))
    const plain = ladderGame(1)
    const hp = (s: GameState, court: string) => s.pieces.filter((p) => p.court === court).reduce((n, p) => n + p.hp, 0)
    expect(hp(king, 'umbral')).toBeGreaterThan(hp(plain, 'umbral'))
    expect(king.config.eclipseRound).toBe(20)
  })

  it('lets the Veil Sister cast and still move, but only once', () => {
    const s = bossTurn('boss-veil-sister')
    const open = s.spells.umbral.filter((sp) => spellTargets(s, 'umbral', sp).none)
    const first = reduce(s, { type: 'cast', spell: open[0] })
    expect(first).not.toBe(s)
    expect(first.turn).toBe('umbral')
    expect(leaderOf(first, 'umbral')!.moved).toBe(true)
    const aimed = first.spells.umbral.map((sp) => ({ sp, t: spellTargets(first, 'umbral', sp) })).find(({ t }) => t.pieces.length > 0)!
    const second = reduce(first, { type: 'cast', spell: aimed.sp, pieceId: aimed.t.pieces[0] })
    expect(second.turn).toBe('solari')
  })

  it('does not give a plain match a free cast', () => {
    const s = { ...ladderGame(11), turn: BOSS_COURT } as GameState
    const sp = s.spells.umbral.find((x) => spellTargets(s, 'umbral', x).none)!
    expect(reduce(s, { type: 'cast', spell: sp }).turn).toBe('solari')
  })

  it('has the AI act on a free cast turn', () => {
    const s = reduce(bossTurn('boss-veil-sister'), { type: 'cast', spell: 'mend' })
    const a = chooseAction(s.turn === 'umbral' ? s : bossTurn('boss-veil-sister'), 'easy', 1, 'caster')
    expect(['move', 'cast', 'pass']).toContain(a.type)
  })
})
