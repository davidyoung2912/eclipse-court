import { describe, expect, it } from 'vitest'
import { fallenOf, materialLead } from './fallen'
import type { Court, Piece, Role } from './engine/rules/types'

const piece = (id: string, court: Court, role: Role): Piece =>
  ({ id, court, role, hp: 0, maxHp: 4, pos: { x: 0, y: 0 }, rest: 0, moved: false, bound: false })

describe('fallen pieces', () => {
  const captured = [piece('a', 'solari', 'footsoldier'), piece('b', 'umbral', 'bruiser'), piece('c', 'umbral', 'flier')]

  it('splits the capture list by court, keeping order', () => {
    expect(fallenOf({ captured }, 'umbral').map((p) => p.id)).toEqual(['b', 'c'])
    expect(fallenOf({ captured }, 'solari').map((p) => p.id)).toEqual(['a'])
  })

  it('gives the lead to the court that has taken more', () => {
    expect(materialLead({ captured })).toEqual({ solari: 10, umbral: 0 })
    expect(materialLead({ captured: [captured[0]] })).toEqual({ solari: 0, umbral: 3 })
  })

  it('is level when nothing has fallen', () => {
    expect(materialLead({ captured: [] })).toEqual({ solari: 0, umbral: 0 })
  })
})
