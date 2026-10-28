import { describe, expect, it } from 'vitest'
import { duelTally, emptyTally, goalDone, ROLE_GOALS } from './engine/data/roleGoals'
import { COSMETICS } from './engine/data/cosmetics'
import { newGame } from './engine/reducer'
import { legalMoves } from './engine/rules/moves'
import { reduce } from './engine/reducer'
import type { Action } from './engine/rules/types'
import type { GameRecord } from './engine/log'
import { claimRoleGoals, parseRoleGoals, recordRoleDuels, roleGoalsSnapshot, rewardsFor } from './roleGoals'
import { owns, shopSnapshot } from './shop'

/** Plays the first legal move each turn until the game ends or `max` actions are used. */
function play(max: number): GameRecord {
  const first = newGame(7)
  const actions: Action[] = []
  let s = first
  for (let i = 0; i < max && !s.winner; i++) {
    const m = s.pieces.filter((p) => p.court === s.turn).flatMap((p) => legalMoves(s, p).map((to) => ({ type: 'move', pieceId: p.id, to }) as Action))
    const a = m.find((x) => x.type === 'move' && s.pieces.some((p) => p.pos.x === x.to.x && p.pos.y === x.to.y)) ?? m[0] ?? ({ type: 'pass' } as Action)
    actions.push(a)
    s = reduce(s, a)
  }
  return { initial: first, actions }
}

describe('duelTally', () => {
  it('counts only duels the human side won', () => {
    const record = play(200)
    const mine = duelTally(record, 'solari')!
    const theirs = duelTally(record, 'umbral')!
    const sum = (t: typeof mine) => Object.values(t).reduce((n, r) => n + r.wins, 0)
    expect(sum(mine) + sum(theirs)).toBeGreaterThan(0)
    for (const t of [mine, theirs]) for (const r of Object.values(t)) expect(r.dark + r.light).toBeLessThanOrEqual(r.wins)
  })

  it('is null for an illegal record', () => {
    const record = play(4)
    expect(duelTally({ ...record, actions: [{ type: 'pass' }, { type: 'move', pieceId: 'nope', to: { x: 0, y: 0 } }] }, 'solari')).toBeNull()
  })
})

describe('goals', () => {
  it('have unique ids and targets that fit the cosmetic thresholds', () => {
    expect(new Set(ROLE_GOALS.map((g) => g.id)).size).toBe(ROLE_GOALS.length)
    for (const c of COSMETICS.filter((x) => x.goals)) expect(c.goals).toBeLessThanOrEqual(ROLE_GOALS.length)
    expect(ROLE_GOALS.some((g) => goalDone(g, emptyTally()))).toBe(false)
  })

  it('repair damaged data', () => {
    const s = parseRoleGoals({ tally: { bruiser: { wins: -3, dark: 2.5, light: 4 }, nope: { wins: 9 } }, claimed: ['bruiser-wins-10', 'x', 'bruiser-wins-10'] })
    expect(s.tally.bruiser).toEqual({ wins: 0, dark: 0, light: 4 })
    expect(s.claimed).toEqual(['bruiser-wins-10'])
  })

  it('tally games, pay once and grant the cosmetics reached', () => {
    const record = play(200)
    for (let i = 0; i < 40; i++) recordRoleDuels(record, 'solari')
    const before = shopSnapshot().shards
    const first = claimRoleGoals()
    expect(first.shards).toBeGreaterThan(0)
    expect(shopSnapshot().shards).toBe(before + first.shards)
    expect(claimRoleGoals()).toEqual({ shards: 0, cosmetics: [] })
    const done = ROLE_GOALS.filter((g) => goalDone(g, roleGoalsSnapshot().tally)).length
    for (const c of rewardsFor(done)) expect(owns(c)).toBe(true)
  })
})
