import { describe, expect, it } from 'vitest'
import { decodeChallenge, encodeChallenge } from '../challenge'
import { newGame } from '../reducer'
import { legalMoves } from '../rules/moves'
import {
  applyTool, blankDesign, canPlace, clearBoard, designChallenge, designConfig, designFromConfig, isCustom, parseDesign, problems, resize,
  setMirror, sideOf, umbralPieces, type Design,
} from './editor'

const at = (x: number, y: number) => ({ x, y })

describe('editor', () => {
  it('starts as a valid classic board', () => {
    const d = blankDesign()
    expect(problems(d)).toEqual([])
    expect(umbralPieces(d)).toHaveLength(12)
    expect(umbralPieces(d).find((p) => p.role === 'leader')).toMatchObject({ x: 6, y: 3 })
    expect(problems(blankDesign(9))).toEqual([])
  })

  it('toggles walls, beacons and cells, and a wall clears what stood there', () => {
    let d = blankDesign()
    d = applyTool(d, { kind: 'wall' }, at(3, 3))
    expect(d.blocked).toEqual([at(3, 3)])
    expect(d.beacons.some((b) => b.x === 3 && b.y === 3)).toBe(false)
    expect(applyTool(d, { kind: 'beacon' }, at(3, 3))).toBe(d)
    d = applyTool(d, { kind: 'wall' }, at(3, 3))
    expect(d.blocked).toEqual([])
    d = applyTool(d, { kind: 'cell', effect: 'might' }, at(2, 2))
    d = applyTool(d, { kind: 'cell', effect: 'ward' }, at(2, 2))
    expect(d.cells).toEqual([{ pos: at(2, 2), effect: 'ward' }])
    d = applyTool(d, { kind: 'cell', effect: 'ward' }, at(2, 2))
    expect(d.cells).toEqual([])
    d = applyTool(blankDesign(), { kind: 'wall' }, at(0, 3))
    expect(d.solari.some((p) => p.role === 'leader')).toBe(false)
  })

  it('places and removes pieces, keeping a mirrored army on its own side', () => {
    let d = blankDesign()
    expect(canPlace(d, 'solari', at(3, 0))).toBe(false)
    expect(canPlace(d, 'umbral', at(1, 0))).toBe(false)
    d = applyTool(d, { kind: 'piece', court: 'solari', role: 'bruiser' }, at(2, 3))
    expect(d.solari.find((p) => p.x === 2 && p.y === 3)?.role).toBe('bruiser')
    d = applyTool(d, { kind: 'piece', court: 'solari', role: 'flier' }, at(2, 3))
    expect(d.solari.filter((p) => p.x === 2 && p.y === 3).map((p) => p.role)).toEqual(['flier'])
    d = applyTool(d, { kind: 'piece', court: 'solari', role: 'flier' }, at(2, 3))
    expect(d.solari.some((p) => p.x === 2 && p.y === 3)).toBe(false)
    const free = setMirror(d, false)
    expect(free.umbral).toHaveLength(12)
    const placed = applyTool(free, { kind: 'piece', court: 'umbral', role: 'bruiser' }, at(3, 3))
    expect(placed.umbral.some((p) => p.x === 3 && p.y === 3)).toBe(true)
    expect(setMirror(placed, true).umbral).toEqual([])
  })

  it('reports what blocks a design', () => {
    const d = blankDesign()
    expect(problems({ ...d, solari: d.solari.filter((p) => p.role !== 'leader') })).toContain('Solari needs a Leader.')
    expect(problems({ ...d, solari: [...d.solari, { role: 'leader', x: 2, y: 0 }] })[0]).toMatch(/2 Leaders/)
    expect(problems({ ...d, beacons: [] })).toContain('Holding the beacons needs at least one beacon.')
    expect(problems({ ...d, blocked: [at(0, 3)] })).toContain('A piece stands on a wall.')
    expect(problems({ ...d, goal: 'escort' })).toContain('Place the goal square for the escort.')
    expect(problems({ ...d, goal: 'escort', target: at(0, 3) })).toContain('The goal square must start empty.')
    expect(problems({ ...d, goal: 'hold', target: at(3, 3), turns: 5, rounds: 3 })).toContain('The round limit is shorter than the turns to hold.')
    expect(problems(clearBoard(d))).toContain('Solari needs a Leader.')
    const free = setMirror(d, false)
    expect(problems({ ...free, umbral: [...free.umbral, { role: 'flier', x: 6, y: 3 }] })).toContain('Two pieces share a square.')
  })

  it('resizes by dropping what falls off the board', () => {
    const d = resize(applyTool(blankDesign(9), { kind: 'wall' }, at(8, 8)), 7)
    expect(d.size).toBe(7)
    expect(d.blocked).toEqual([])
    expect(d.solari.every((p) => p.x < 7 && p.y < 7)).toBe(true)
  })

  it('moves a 7x7 layout to the middle of the 9x9 board when it grows', () => {
    const d = resize(blankDesign(7), 9)
    expect(d.size).toBe(9)
    expect(d.beacons).toEqual(expect.arrayContaining([at(0, 4), at(8, 4), at(4, 4), at(4, 1), at(4, 7)]))
    expect(d.solari.find((p) => p.role === 'leader')).toMatchObject({ x: 0, y: 4 })
    expect(umbralPieces(d).find((p) => p.role === 'leader')).toMatchObject({ x: 8, y: 4 })
    expect(problems(d)).toEqual([])
  })

  it('builds a match that plays, with the walls, cells and armies as drawn', () => {
    let d = setMirror(blankDesign(), false)
    d = applyTool(d, { kind: 'wall' }, at(3, 2))
    d = applyTool(d, { kind: 'cell', effect: 'hazard' }, at(3, 4))
    d = applyTool(d, { kind: 'piece', court: 'umbral', role: 'bruiser' }, at(4, 3))
    const config = designConfig(d, 7)
    expect(isCustom(config)).toBe(true)
    const state = newGame(config)
    expect(state.pieces.filter((p) => p.court === 'umbral')).toHaveLength(13)
    expect(state.pieces.find((p) => p.court === 'umbral' && p.pos.x === 4 && p.pos.y === 3)?.role).toBe('bruiser')
    expect(state.config.blocked).toEqual([at(3, 2)])
    expect(state.config.cells).toEqual([{ pos: at(3, 4), effect: 'hazard' }])
    expect(state.pieces.some((p) => legalMoves(state, p).some((m) => m.x === 3 && m.y === 2))).toBe(false)
  })

  it('makes puzzle objectives Solari goals', () => {
    const d: Design = { ...blankDesign(), goal: 'hold', target: at(3, 3), turns: 2, rounds: 9, side: 'umbral' }
    expect(sideOf(d)).toBe('solari')
    expect(designConfig(d, 1).objective).toEqual({ kind: 'hold', at: at(3, 3), turns: 2, limit: 9 })
    expect(designConfig({ ...d, goal: 'survive', rounds: 6 }, 1).objective).toEqual({ kind: 'survive', rounds: 6 })
    expect(designConfig({ ...d, goal: 'hill' }, 1).mode).toBe('hill')
    expect(sideOf({ ...blankDesign(), side: 'umbral' })).toBe('umbral')
  })

  it('refuses a challenge from an invalid design and round-trips a valid one through a code', () => {
    expect(designChallenge(clearBoard(blankDesign()), 1)).toBeNull()
    let d = setMirror(blankDesign(9), false)
    d = applyTool(d, { kind: 'cell', effect: 'silence' }, at(4, 4))
    d = { ...d, goal: 'escort', target: at(7, 4), rounds: 12 }
    expect(designChallenge(d, 3)).toBeNull()
    d = { ...d, target: at(5, 4) }
    const challenge = designChallenge(d, 3)!
    const decoded = decodeChallenge(encodeChallenge(challenge))
    expect(decoded).toEqual(challenge)
    expect(designFromConfig(decoded!.config, decoded!.side)).toEqual(d)
  })

  it('opens a mirrored board back into the editor', () => {
    const d = { ...blankDesign(), goal: 'leader' as const }
    expect(designFromConfig(designConfig(d, 1))).toEqual(d)
  })

  it('reads a saved draft safely', () => {
    const d = applyTool(blankDesign(), { kind: 'cell', effect: 'might' }, at(3, 3))
    expect(parseDesign(JSON.parse(JSON.stringify(d)))).toEqual(d)
    expect(parseDesign(null)).toEqual(blankDesign())
    expect(parseDesign({ size: 9, solari: 'x' })).toEqual(blankDesign(9))
    const junk = parseDesign({ ...d, blocked: [at(99, 0), 'x', at(1, 1)], cells: [{ pos: at(0, 0), effect: 'nope' }], goal: 'bogus', rounds: -4 })
    expect(junk.blocked).toEqual([at(1, 1)])
    expect(junk.cells).toEqual([])
    expect(junk.goal).toBe('beacons')
    expect(junk.rounds).toBe(10)
  })
})
