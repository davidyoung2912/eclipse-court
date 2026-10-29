import { beforeEach, describe, expect, it } from 'vitest'
import { encodeChallenge } from './engine/challenge'
import { blankDesign, designChallenge, type Design } from './engine/data/editor'
import { decodePack, encodePack, MAX_PACK, packId, validPuzzle } from './engine/data/pack'
import { addToDraft, clearDraft, clearPacks, deletePack, keepPack, markPackSolved, packSnapshot, parsePacks, removeFromDraft } from './packs'
import { parseShared } from './share'

const puzzleDesign = (goal: Design['goal'], extra: Partial<Design> = {}): Design => ({
  ...blankDesign(), goal, rounds: 8, turns: 2, target: { x: 2, y: 3 }, ...extra,
})
const make = (seed: number, goal: Design['goal'] = 'survive') => designChallenge(puzzleDesign(goal), seed)!

beforeEach(() => clearPacks())

describe('pack codes', () => {
  const pack = { name: 'Three Holds', puzzles: [make(1), make(2, 'escort'), make(3, 'hold')] }

  it('round-trip and open from a link, a pair or a bare code', () => {
    const code = encodePack(pack)
    expect(decodePack(code)).toEqual(pack)
    expect(parseShared(`https://x.test/#p=${code}`)).toEqual({ kind: 'pack', pack })
    expect(parseShared(`p=${code}`)?.kind).toBe('pack')
    expect(parseShared(code)?.kind).toBe('pack')
    expect(parseShared(`c=${code}`)).toBeNull()
  })

  it('refuse a pack that is empty, too long, unnamed, or holds a match that is not a puzzle', () => {
    expect(decodePack(encodePack({ name: 'Empty', puzzles: [] }))).toBeNull()
    expect(decodePack(encodePack({ name: 'Long', puzzles: Array.from({ length: MAX_PACK + 1 }, (_, i) => make(i)) }))).toBeNull()
    expect(decodePack(encodePack({ name: '  ', puzzles: [make(1)] }))).toBeNull()
    const plain = designChallenge(blankDesign(), 1)!
    expect(validPuzzle(plain)).toBe(false)
    expect(decodePack(encodePack({ name: 'Plain', puzzles: [make(1), plain] }))).toBeNull()
    expect(decodePack('not-a-code')).toBeNull()
  })

  it('refuse a puzzle the editor would report a problem with', () => {
    const broken = { config: { ...make(1).config, objective: { kind: 'escort' as const, goal: { x: 0, y: 0 }, limit: 8 } }, side: 'solari' as const }
    expect(validPuzzle(broken)).toBe(false)
    expect(validPuzzle({ ...make(1), side: 'umbral' })).toBe(false)
  })

  it('are not read as a challenge, and a challenge is not read as a pack', () => {
    expect(parseShared(encodePack(pack))?.kind).not.toBe('challenge')
    expect(parseShared(encodeChallenge(make(1)))?.kind).toBe('challenge')
  })
})

describe('kept packs', () => {
  const pack = { name: 'Mine', puzzles: [make(1), make(2)] }

  it('keep a pack once, with progress that survives opening it again', () => {
    expect(keepPack(pack)).toBe(true)
    const id = packId(pack)
    markPackSolved(id, 1)
    markPackSolved(id, 1)
    markPackSolved(id, 9)
    expect(keepPack(pack)).toBe(true)
    expect(packSnapshot().packs).toHaveLength(1)
    expect(packSnapshot().packs[0].solved).toEqual([1])
    deletePack(id)
    expect(packSnapshot().packs).toEqual([])
  })

  it('refuse an empty pack and a nameless one', () => {
    expect(keepPack({ name: 'x', puzzles: [] })).toBe(false)
    expect(keepPack({ name: ' ', puzzles: [make(1)] })).toBe(false)
  })

  it('collect a draft of puzzles only, up to the limit', () => {
    expect(addToDraft(designChallenge(blankDesign(), 1)!)).toBe(false)
    for (let i = 0; i < MAX_PACK; i++) expect(addToDraft(make(i))).toBe(true)
    expect(addToDraft(make(99))).toBe(false)
    removeFromDraft(0)
    expect(packSnapshot().draft).toHaveLength(MAX_PACK - 1)
    clearDraft()
    expect(packSnapshot().draft).toEqual([])
  })
})

describe('parsePacks', () => {
  it('repairs damaged data', () => {
    expect(parsePacks(null)).toEqual({ packs: [], draft: [] })
    expect(parsePacks({ packs: 'x', draft: 4 })).toEqual({ packs: [], draft: [] })
    const good = make(1)
    const read = parsePacks({
      packs: [{ name: 'A', puzzles: [good, { config: {}, side: 'solari' }], solved: [0, 0, 5, -1, 'x'] }, { name: '', puzzles: [good] }, { name: 'B', puzzles: [] }],
      draft: [good, 7],
    })
    expect(read.packs).toHaveLength(1)
    expect(read.packs[0].puzzles).toEqual([good])
    expect(read.packs[0].solved).toEqual([0])
    expect(read.draft).toEqual([good])
  })

  it('round-trips through its saved text', () => {
    keepPack({ name: 'Kept', puzzles: [make(4)] })
    addToDraft(make(5))
    expect(parsePacks(JSON.parse(JSON.stringify(packSnapshot())))).toEqual(packSnapshot())
  })
})
