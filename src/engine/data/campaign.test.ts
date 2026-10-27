import { describe, expect, it } from 'vitest'
import { PERSONALITIES } from '../../ai/personality'
import { chooseAction } from '../../ai/strategy'
import { reduce } from '../reducer'
import { CAMPAIGN, battlesIn, campaignGame } from './campaign'
import { boardById } from './boards'
import { draftProblem } from './draft'

describe('campaign', () => {
  it('has distinct ids and a full tier of 25 in each of Beginner, Normal and Expert', () => {
    expect(new Set(CAMPAIGN.map((o) => o.id)).size).toBe(CAMPAIGN.length)
    expect(battlesIn('easy')).toHaveLength(25)
    expect(battlesIn('normal')).toHaveLength(25)
    expect(battlesIn('hard')).toHaveLength(25)
  })

  it('gives every battle a legal draft and a spread of personalities', () => {
    for (const tier of [battlesIn('easy'), battlesIn('normal'), battlesIn('hard')]) {
      for (const o of tier) if (o.army) expect(draftProblem(o.army), o.name).toBeNull()
      expect(new Set(tier.map((o) => o.personality)).size).toBe(5)
      for (const o of tier) {
        for (const p of campaignGame(o, 5).pieces) expect(p.hp, o.name).toBeGreaterThan(0)
      }
    }
  })

  it('has distinct opponents with known boards and personalities', () => {
    expect(new Set(CAMPAIGN.map((o) => o.name)).size).toBe(CAMPAIGN.length)
    for (const o of CAMPAIGN) {
      expect(PERSONALITIES[o.personality], o.name).toBeDefined()
      if (o.board) expect(boardById(o.board).id).toBe(o.board)
    }
    expect(new Set(CAMPAIGN.map((o) => o.personality)).size).toBeGreaterThanOrEqual(4)
    expect(CAMPAIGN.filter((o) => o.boss).length).toBeGreaterThanOrEqual(1)
  })

  it('opens every battle with the player as Solari and a legal AI army', () => {
    for (const [i, o] of CAMPAIGN.entries()) {
      const s = campaignGame(o, 50 + i)
      expect(s.turn, o.name).toBe('solari')
      expect(s.pieces.filter((p) => p.court === 'umbral' && p.role === 'leader'), o.name).toHaveLength(1)
      expect(s.config.board).toBe(boardById(o.board).id)
      const squares = new Set(s.pieces.map((p) => `${p.pos.x},${p.pos.y}`))
      expect(squares.size).toBe(s.pieces.length)
      for (const b of s.config.blocked ?? []) expect(squares.has(`${b.x},${b.y}`), o.name).toBe(false)
    }
  })

  it('applies each opponent\'s rules to the match', () => {
    const by = (name: string) => campaignGame(CAMPAIGN.find((o) => o.name === name)!, 7)
    expect(by('The Troll Court').config.mode).toBe('leader')
    expect(by('The Backwards Hour').dir).toBe(-1)
    expect(by('The Eclipse Queen').config.eclipseRound).toBe(20)
    expect(by('The Archerless').pieces.some((p) => p.court === 'umbral' && p.role === 'marksman')).toBe(false)
  })

  it('lets every personality play legal moves in every battle', () => {
    for (const [i, o] of CAMPAIGN.entries()) {
      let s = campaignGame(o, 90 + i)
      for (let n = 0; n < 8 && !s.winner; n++) {
        const a = chooseAction(s, 'easy', n + 1, s.turn === 'umbral' ? o.personality : 'balanced')
        const next = reduce(s, a.type === 'move' && s.pieces.some((p) => p.pos.x === a.to.x && p.pos.y === a.to.y && p.court !== s.turn)
          ? { ...a, duel: { attackerHp: 0, defenderHp: 1 } } : a)
        expect(next, `${o.name} move ${n}`).not.toBe(s)
        s = next
      }
    }
  })

  it('makes personalities choose differently somewhere', () => {
    const s = campaignGame(CAMPAIGN[0], 3)
    const picks = new Set(Object.keys(PERSONALITIES).map((id) => JSON.stringify(chooseAction(s, 'hard', 5, id as keyof typeof PERSONALITIES))))
    expect(picks.size).toBeGreaterThan(1)
  })
})
