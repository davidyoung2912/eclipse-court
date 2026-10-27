import { describe, expect, it } from 'vitest'
import { aiDraft, aiLoadout } from './aiDraft'
import { DIFFICULTY_LIST } from './difficulty'
import { newGame } from '../reducer'
import { isBlocked } from '../rules/board'
import { legalMoves } from '../rules/moves'
import { applySpell, loadoutProblem, spellTargets } from '../rules/spells'
import type { Role } from '../rules/types'
import { BOARDS } from './boards'
import { arrange, CLASSIC_ROLES, DRAFT_BUDGET, draftCost, draftProblem, MAX_DRAFTED, randomDraft } from './draft'
import { DEFAULT_LAYOUT } from './roster'
import { decodeRecord, encodeRecord } from '../serialize'
import { dailySeed, skirmishConfig } from './setups'

describe('draft rules', () => {
  it('accepts the classic army, which fits the budget', () => {
    expect(draftCost(CLASSIC_ROLES)).toBeLessThanOrEqual(DRAFT_BUDGET)
    expect(draftProblem(CLASSIC_ROLES)).toBeNull()
  })

  it('refuses drafts that are over budget, over a role limit, too big, too small or add a Leader', () => {
    expect(draftProblem([...CLASSIC_ROLES, 'footsoldier'])).toMatch(/budget/)
    expect(draftProblem(Array(7).fill('footsoldier'))).toMatch(/limit/)
    expect(draftProblem(['footsoldier'])).toMatch(/at least/)
    expect(draftProblem([...CLASSIC_ROLES, 'leader'])).not.toBeNull()
    expect(draftProblem(Array(MAX_DRAFTED + 1).fill('footsoldier'))).not.toBeNull()
  })

  it('only ever produces legal drafts, random or AI', () => {
    for (let seed = 1; seed <= 200; seed++) {
      expect(draftProblem(randomDraft(seed))).toBeNull()
      for (const d of DIFFICULTY_LIST) expect(draftProblem(aiDraft(seed, d))).toBeNull()
    }
  })

  it('arranges any draft on distinct home squares around one Leader', () => {
    for (let seed = 1; seed <= 100; seed++) {
      const roles = randomDraft(seed)
      const layout = arrange(roles)
      expect(layout).toHaveLength(roles.length + 1)
      expect(layout.filter((p) => p.role === 'leader')).toEqual([{ role: 'leader', x: 0, y: 3 }])
      expect(new Set(layout.map((p) => `${p.x},${p.y}`)).size).toBe(layout.length)
      for (const p of layout) {
        expect(p.x).toBeLessThanOrEqual(1)
        expect(p.y).toBeGreaterThanOrEqual(0)
        expect(p.y).toBeLessThanOrEqual(6)
      }
    }
  })

  it('arranges the classic army with the classic roles', () => {
    expect(arrange(CLASSIC_ROLES).map((p) => p.role).sort()).toEqual(DEFAULT_LAYOUT.map((p) => p.role).sort())
  })
})

describe('setups', () => {
  it('classic setup is the default game', () => {
    const config = skirmishConfig({ mode: 'classic', board: 'classic' }, 'solari', 5)
    expect(newGame(config).pieces).toEqual(newGame(5).pieces)
  })

  it('random setups give both courts the same army, mirrored', () => {
    for (let seed = 1; seed <= 30; seed++) {
      const g = newGame(skirmishConfig({ mode: 'random', board: 'classic' }, 'solari', seed))
      const roles = (court: string) => g.pieces.filter((p) => p.court === court).map((p) => p.role).sort()
      expect(roles('solari')).toEqual(roles('umbral'))
      for (const p of g.pieces.filter((q) => q.court === 'solari'))
        expect(g.pieces.some((q) => q.court === 'umbral' && q.role === p.role && q.pos.x === 6 - p.pos.x && q.pos.y === p.pos.y)).toBe(true)
    }
  })

  it('draft setups give each court its own army whichever side the human takes', () => {
    const mine: Role[] = ['flier', 'flier', 'flier', 'charger', 'charger', 'charger', 'footsoldier']
    const theirs = CLASSIC_ROLES
    for (const human of ['solari', 'umbral'] as const) {
      const g = newGame(skirmishConfig({ mode: 'draft', board: 'classic', roles: mine }, human, 3, { roles: theirs }))
      const count = (court: string) => g.pieces.filter((p) => p.court === court).length
      expect(count(human)).toBe(mine.length + 1)
      expect(count(human === 'solari' ? 'umbral' : 'solari')).toBe(theirs.length + 1)
    }
  })

  it('daily setups repeat within a day and keep armies off blocked squares on every board', () => {
    const a = skirmishConfig({ mode: 'daily', board: 'classic' }, 'solari', 1)
    expect(skirmishConfig({ mode: 'daily', board: 'classic' }, 'solari', 99)).toEqual(a)
    expect(a.seed).toBe(dailySeed())
    for (const board of BOARDS)
      for (let seed = 1; seed <= 30; seed++) {
        const g = newGame(skirmishConfig({ mode: 'random', board: board.id }, 'solari', seed))
        expect(g.pieces.some((p) => isBlocked(g.config, p.pos))).toBe(false)
        for (const b of board.beacons) expect(isBlocked(g.config, b)).toBe(false)
      }
  })
})

describe('blocked squares', () => {
  const blockedGame = () => newGame({ blocked: [{ x: 2, y: 3 }, { x: 1, y: 0 }] })

  it('stop ground pieces and charger jumps from landing', () => {
    const g = blockedGame()
    const soldier = g.pieces.find((p) => p.id === 'solari-footsoldier-2')! // (1,2)
    const to = legalMoves(g, { ...soldier, pos: { x: 2, y: 4 } })
    expect(to.some((p) => p.x === 2 && p.y === 3)).toBe(false)
    const charger = g.pieces.find((p) => p.id === 'solari-charger-1')! // (1,3)
    expect(legalMoves(g, { ...charger, pos: { x: 0, y: 1 } }).some((p) => p.x === 1 && p.y === 0)).toBe(false)
  })

  it('are flown over but never landed on, and block shots', () => {
    const g = newGame({ blocked: [{ x: 2, y: 3 }, { x: 3, y: 3 }] })
    const flier = { ...g.pieces.find((p) => p.role === 'flier')!, pos: { x: 1, y: 3 } }
    const open = { ...g, pieces: g.pieces.filter((p) => !(p.pos.x === 1 && p.pos.y === 3)) }
    const moves = legalMoves(open, flier)
    expect(moves.some((p) => p.x === 2 && p.y === 3)).toBe(false)
    expect(moves.some((p) => p.x === 4 && p.y === 3)).toBe(true)
    const marksman = { ...g.pieces.find((p) => p.role === 'marksman')!, pos: { x: 1, y: 3 } }
    expect(legalMoves(open, marksman).some((p) => p.x === 3 && p.y === 3)).toBe(false)
  })

  it('are not valid squares for the Leader or for spells', () => {
    const g = newGame({ blocked: [{ x: 1, y: 3 }, { x: 0, y: 4 }] })
    const leader = g.pieces.find((p) => p.id === 'solari-leader-1')!
    expect(legalMoves(g, leader).some((p) => (p.x === 1 && p.y === 3) || (p.x === 0 && p.y === 4))).toBe(false)
    const blink = spellTargets(g, 'solari', 'blink').squares
    expect(blink.some((p) => p.x === 1 && p.y === 3)).toBe(false)
    expect(applySpell(g, 'solari', 'blink', undefined, { x: 1, y: 3 })).toBeNull()
    const conjure = spellTargets(g, 'solari', 'conjure').squares
    expect(conjure.some((p) => p.x === 0 && p.y === 4)).toBe(false)
  })
})

describe('saving drafted matches', () => {
  it('round-trips a drafted army on a walled board', () => {
    const config = skirmishConfig({ mode: 'draft', board: 'pillars', roles: randomDraft(4) }, 'umbral', 9, { roles: randomDraft(5) })
    const initial = newGame(config)
    const decoded = decodeRecord(encodeRecord({ initial, actions: [] }))
    expect(decoded?.initial).toEqual(initial)
    expect(decoded?.initial.config.blocked).toHaveLength(4)
  })
})

describe('skirmish spells', () => {
  it('uses the classic seven unless a loadout is chosen', () => {
    expect(newGame(skirmishConfig({ mode: 'classic', board: 'classic' }, 'solari', 5)).spells.solari).toHaveLength(7)
  })

  it('gives the human their loadout and the AI its own', () => {
    const mine = ['hold', 'mend', 'blink', 'turn'] as const
    const theirs = ['shroud', 'bind', 'swap', 'revive'] as const
    const g = newGame(skirmishConfig({ mode: 'classic', board: 'classic', loadout: mine, recharge: 8 }, 'solari', 5, { loadout: theirs }))
    expect(g.spells.solari).toEqual(mine)
    expect(g.spells.umbral).toEqual(theirs)
    expect(g.config.recharge).toBe(8)
    const flipped = newGame(skirmishConfig({ mode: 'classic', board: 'classic', loadout: ['shroud', 'bind', 'swap', 'revive'] }, 'umbral', 5, { loadout: mine }))
    expect(flipped.spells.solari).toEqual(mine)
  })

  it('has the AI pick four legal spells it can cast, with some support', () => {
    for (const court of ['solari', 'umbral'] as const)
      for (let seed = 1; seed <= 40; seed++) {
        const picks = aiLoadout(seed, court)
        expect(loadoutProblem(court, picks)).toBeNull()
        expect(picks).not.toContain('exchange')
        expect(picks.some((s) => ['mend', 'revive', 'sacrifice'].includes(s))).toBe(true)
      }
  })
})
