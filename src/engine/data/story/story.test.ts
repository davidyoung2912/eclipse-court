import { describe, expect, it } from 'vitest'
import { BONDS, actLabel, afterVictory, battleCourt, CHAPTERS, CHARACTERS, chapterById, scenarioOf, storyBattleGame } from '.'

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
        expect(game.pieces.find((p) => p.id === piece)?.court).toBe(battleCourt(c.battle))
      }
      expect(c.battle.won.length).toBeGreaterThan(0)
      expect(c.battle.lost.length).toBeGreaterThan(0)
    }
  })

  it('starts the wounded one HP short and leaves the fallen out', () => {
    const battle = CHAPTERS.find((c) => c.battle && !c.battle.court)!.battle!
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

  it('takes a doomed character in a win however the fight went', () => {
    const battle = { ...CHAPTERS.find((c) => c.battle)!.battle!, doomed: ['wren'] as const }
    const game = storyBattleGame(battle, {}, 1)!
    expect(afterVictory(battle, game, {})).toEqual({ wren: 'fallen', voss: 'ready' })
  })

  it('ends Act I with Tam\'s death and never binds a doomed character in a later chapter', () => {
    const act1 = CHAPTERS.filter((c) => c.act === 1)
    expect(act1.length).toBeGreaterThanOrEqual(5)
    expect(act1[act1.length - 1].battle?.doomed).toEqual(['tam'])
    CHAPTERS.forEach((c, i) => {
      for (const who of c.battle?.doomed ?? [])
        for (const later of CHAPTERS.slice(i + 1)) {
          if (later.battle?.raised?.includes(who)) break
          expect(later.battle?.bind[who]).toBeUndefined()
        }
    })
  })

  it('plays Act II as Umbral, with Tam raised as a Gloom Ghoul and no other fallen character bound', () => {
    const act2 = CHAPTERS.filter((c) => c.act === 2)
    expect(act2.length).toBeGreaterThanOrEqual(5)
    expect(act2.every((c) => c.battle?.court === 'umbral')).toBe(true)
    expect(act2[0].battle?.raised).toEqual(['tam'])
    for (const c of act2) {
      const standing = storyBattleGame(c.battle!, {}, 1)!
      expect(standing.config.mode).toBe('leader')
      expect(standing.pieces.find((p) => p.id === c.battle!.bind.tam)?.role).toBe('footsoldier')
      expect(standing.pieces.filter((p) => p.court === 'umbral').length).toBeGreaterThan(standing.pieces.filter((p) => p.court === 'solari').length)
    }
  })

  it('stands a raised character up from fallen and leaves a ready or wounded one in a win', () => {
    const battle = CHAPTERS.find((c) => c.battle?.raised)!.battle!
    const game = storyBattleGame(battle, { tam: 'fallen' }, 1)!
    expect(afterVictory(battle, game, { tam: 'fallen' }).tam).toBe('ready')
    const final = { ...game, pieces: game.pieces.filter((p) => p.id !== battle.bind.tam) }
    expect(afterVictory(battle, final, { tam: 'fallen' }).tam).toBe('wounded')
  })

  it('keeps a fallen character out of a battle that does not raise them', () => {
    const battle = CHAPTERS.filter((c) => c.act === 2)[1].battle!
    expect(storyBattleGame(battle, { tam: 'fallen' }, 1)!.pieces.some((p) => p.id === battle.bind.tam)).toBe(false)
  })

  it('plays Act III as Solari with a real campaign finale and four endings, the shared one earned by a clean victory', () => {
    const act3 = CHAPTERS.filter((c) => c.act === 3)
    expect(act3.length).toBeGreaterThanOrEqual(3)
    for (const c of act3) {
      const game = storyBattleGame(c.battle!, {}, 1)!
      expect(battleCourt(c.battle!)).toBe('solari')
      for (const piece of Object.values(c.battle!.bind)) expect(game.pieces.some((p) => p.id === piece)).toBe(true)
    }
    const last = act3[act3.length - 1]
    expect(last.battle!.scenario).toBe('eclipse-queen')
    expect(CHAPTERS.filter((c) => c.ending)).toEqual([last])
    expect(last.ending!.options.map((o) => o.id).sort()).toEqual(['duskmother', 'free', 'shared', 'solarch'])
    expect(last.ending!.options.find((o) => o.id === 'shared')!.requires).toBe('clean')
    for (const o of last.ending!.options) {
      expect(o.beats.length).toBeGreaterThan(0)
      for (const b of o.beats) if (b.kind === 'say') expect(CHARACTERS[b.who]).toBeDefined()
    }
  })

  it('answers every condition with a character in the cast and a chapter that exists', () => {
    for (const c of CHAPTERS)
      for (const b of [...c.beats, ...(c.battle?.won ?? []), ...(c.battle?.lost ?? []), ...(c.ending?.options.flatMap((o) => o.beats) ?? [])]) {
        if (!b.when) continue
        if ('character' in b.when) expect(CHARACTERS[b.when.character]).toBeDefined()
        else expect(chapterById(b.when.lostBefore)?.battle).toBeDefined()
      }
  })

  it('gives every bond two distinct cast members, a real chapter to follow and a unique id', () => {
    expect(new Set(BONDS.map((b) => b.id)).size).toBe(BONDS.length)
    for (const b of BONDS) {
      expect(b.between[0]).not.toBe(b.between[1])
      for (const id of b.between) expect(CHARACTERS[id]).toBeDefined()
      expect(chapterById(b.after)).toBeDefined()
      expect(b.beats.length).toBeGreaterThan(0)
      for (const beat of b.beats) {
        expect(beat.text.trim().length).toBeGreaterThan(0)
        if (beat.kind === 'say') expect(b.between).toContain(beat.who)
      }
    }
  })
})
