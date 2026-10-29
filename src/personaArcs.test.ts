import { describe, expect, it } from 'vitest'
import { chooseAction } from './ai/strategy'
import { reduce } from './engine/reducer'
import { COSMETICS } from './engine/data/cosmetics'
import { draftProblem } from './engine/data/draft'
import { ARCS, ARC_FIGHTS, arcGame, arcOf } from './engine/data/personaArcs'
import { PERSONAS } from './engine/data/personas'
import { arcDone, arcOpen, arcSnapshot, markGrudge, parseArcs, recordArcWin, settleGrudge, stepsOf } from './personaArcs'
import { owns } from './shop'

describe('arc data', () => {
  it('has a three-fight arc for every persona with distinct ids and a real prize', () => {
    expect(ARCS).toHaveLength(PERSONAS.length)
    const ids = ARCS.flatMap((a) => a.fights.map((f) => f.id))
    expect(new Set(ids).size).toBe(ids.length)
    for (const a of ARCS) {
      expect(a.fights).toHaveLength(ARC_FIGHTS)
      const prize = COSMETICS.find((c) => c.kind === 'capture' && c.id === a.prize)
      expect(prize?.arc, a.persona).toBe(a.persona)
      expect(prize && owns(prize, { owned: [] }), a.persona).toBe(false)
      for (const f of a.fights) expect(f.personality).toBe(PERSONAS.find((p) => p.id === a.persona)!.personality)
    }
  })

  it('builds a legal opening for every fight and lets the AI play on', () => {
    for (const [i, a] of ARCS.entries()) {
      for (const f of a.fights) {
        if (f.army) expect(draftProblem(f.army), f.id).toBeNull()
        let s = arcGame(f, 40 + i)
        expect(s.turn, f.id).toBe('solari')
        expect(s.config.setup).toBe('arc')
        expect(new Set(s.pieces.map((p) => `${p.pos.x},${p.pos.y}`)).size, f.id).toBe(s.pieces.length)
        for (let n = 0; n < 8 && !s.winner; n++) {
          const a = chooseAction(s, 'easy', n + 1, s.turn === 'umbral' ? f.personality : 'balanced')
          const next = reduce(s, a.type === 'move' && s.pieces.some((p) => p.pos.x === a.to.x && p.pos.y === a.to.y && p.court !== s.turn)
            ? { ...a, duel: { attackerHp: 0, defenderHp: 1 } } : a)
          expect(next, `${f.id} move ${n}`).not.toBe(s)
          s = next
        }
        for (const p of s.pieces) expect(p.hp, f.id).toBeGreaterThan(0)
      }
    }
  })

  it('makes later fights harder than the first', () => {
    for (const a of ARCS) expect(a.fights[0].difficulty).toBe('normal')
    expect(arcOf('cassia').fights[2].difficulty).toBe('hard')
  })
})

describe('arc progress', () => {
  it('repairs damaged data', () => {
    expect(parseArcs(null)).toEqual({ steps: {}, grudges: [] })
    expect(parseArcs({ steps: { cassia: 9, pym: -1, bea: 'x', nobody: 2, mudge: 2 }, grudges: ['pym', 'nobody', 'pym'] }))
      .toEqual({ steps: { cassia: ARC_FIGHTS, mudge: 2 }, grudges: ['pym'] })
  })

  it('opens an arc after one win', () => {
    expect(arcOpen(undefined)).toBe(false)
    expect(arcOpen({ w: 0, d: 1, l: 2, last: 'l' })).toBe(false)
    expect(arcOpen({ w: 1, d: 0, l: 0, last: 'w' })).toBe(true)
  })

  it('counts fights in order, pays once and awards the prize at the end', () => {
    expect(recordArcWin('quill', 1).shards).toBe(0)
    expect(stepsOf('quill')).toBe(0)
    expect(recordArcWin('quill', 0).shards).toBeGreaterThan(0)
    expect(recordArcWin('quill', 0).shards).toBe(0)
    recordArcWin('quill', 1)
    expect(arcDone('quill')).toBe(false)
    const last = recordArcWin('quill', 2)
    expect(arcDone('quill')).toBe(true)
    expect(last.lines.join(' ')).toContain('Iron Coin')
    const prize = COSMETICS.find((c) => c.id === 'ironcoin')!
    expect(owns(prize)).toBe(true)
    expect(recordArcWin('quill', 2).shards).toBe(0)
    expect(arcSnapshot().steps.quill).toBe(ARC_FIGHTS)
  })

  it('pays a grudge once, only after a loss', () => {
    expect(settleGrudge('lowen').shards).toBe(0)
    markGrudge('lowen')
    markGrudge('lowen')
    expect(arcSnapshot().grudges.filter((g) => g === 'lowen')).toHaveLength(1)
    expect(settleGrudge('lowen').shards).toBeGreaterThan(0)
    expect(settleGrudge('lowen').shards).toBe(0)
  })
})
