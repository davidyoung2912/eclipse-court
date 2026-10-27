import { describe, expect, it } from 'vitest'
import { actLabel, afterVictory, CHAPTERS, CHARACTERS, chapterById, scenarioOf, storyBattleGame } from '.'

describe('story data', () => {
  it('gives every chapter a unique id, title, blurb and some beats', () => {
    expect(new Set(CHAPTERS.map((c) => c.id)).size).toBe(CHAPTERS.length)
    for (const c of CHAPTERS) {
      expect(c.title.length).toBeGreaterThan(0)
      expect(c.blurb.length).toBeGreaterThan(0)
      expect(c.beats.length).toBeGreaterThan(0)
      expect(chapterById(c.id)).toBe(c)
    }
  })

  it('has only speakers from the cast and no empty lines', () => {
    for (const c of CHAPTERS)
      for (const b of c.beats) {
        expect(b.text.trim().length).toBeGreaterThan(0)
        if (b.kind === 'say') expect(CHARACTERS[b.who]).toBeDefined()
      }
  })

  it('keys each character by its own id', () => {
    for (const [id, c] of Object.entries(CHARACTERS)) expect(c.id).toBe(id)
  })

  it('labels acts', () => {
    expect(actLabel('prologue')).toBe('Prologue')
    expect(actLabel(2)).toBe('Act 2')
  })

  it('builds every battle from a real scenario with every bound piece in the opening position', () => {
    for (const c of CHAPTERS) {
      if (!c.battle) continue
      expect(scenarioOf(c.battle)).toBeDefined()
      const game = storyBattleGame(c.battle, {}, 1)!
      for (const [who, piece] of Object.entries(c.battle.bind)) {
        expect(CHARACTERS[who as keyof typeof CHARACTERS]).toBeDefined()
        expect(game.pieces.find((p) => p.id === piece)?.court).toBe('solari')
      }
      expect(c.battle.won.length).toBeGreaterThan(0)
      expect(c.battle.lost.length).toBeGreaterThan(0)
    }
  })

  it('starts the wounded one HP short and leaves the fallen out', () => {
    const battle = CHAPTERS.find((c) => c.battle)!.battle!
    const [a, b] = Object.keys(battle.bind) as (keyof typeof CHARACTERS)[]
    const base = storyBattleGame(battle, {}, 1)!
    const game = storyBattleGame(battle, { [a]: 'wounded', [b]: 'fallen' }, 1)!
    const pa = battle.bind[a]!
    expect(game.pieces.find((p) => p.id === pa)!.hp).toBe(base.pieces.find((p) => p.id === pa)!.hp - 1)
    expect(game.pieces.some((p) => p.id === battle.bind[b])).toBe(false)
  })

  it('wounds a character whose piece fell, kills a mortal one and heals the survivors', () => {
    const battle = { ...CHAPTERS.find((c) => c.battle)!.battle!, mortal: ['voss'] as const }
    const game = storyBattleGame(battle, {}, 1)!
    const final = { ...game, pieces: game.pieces.filter((p) => p.id !== battle.bind.wren && p.id !== battle.bind.voss) }
    expect(afterVictory(battle, final, {})).toEqual({ wren: 'wounded', voss: 'fallen' })
    expect(afterVictory(battle, game, { wren: 'wounded', voss: 'fallen' })).toEqual({ wren: 'ready', voss: 'fallen' })
  })
})
