import { describe, expect, it } from 'vitest'
import { MAX_GOALS, openGoals, PER_SOURCE, type GoalInputs } from './goals'
import { emptyTally } from './engine/data/roleGoals'
import { parseMastery } from './mastery'
import { emptyProgress } from './progress'
import { parseRoleGoals } from './roleGoals'

const inputs = (over: Partial<GoalInputs> = {}): GoalInputs => ({
  progress: emptyProgress(), mastery: parseMastery(null), roles: parseRoleGoals(null), bounties: [], day: 20000, ...over,
})

describe('open goals', () => {
  it('stay within the cap and the per-source limit', () => {
    const goals = openGoals(inputs())
    expect(goals.length).toBeGreaterThan(0)
    expect(goals.length).toBeLessThanOrEqual(MAX_GOALS)
    for (const source of new Set(goals.map((g) => g.source))) expect(goals.filter((g) => g.source === source).length).toBeLessThanOrEqual(PER_SOURCE)
  })

  it('put what is ready to claim first', () => {
    const tally = emptyTally()
    tally.leader.wins = 5
    const goals = openGoals(inputs({ roles: { tally, claimed: [] } }))
    expect(goals[0]).toMatchObject({ source: 'piece', claimable: true, target: 'stats' })
  })

  it('order the rest by how near they are', () => {
    const tally = emptyTally()
    tally.flier.wins = 9
    tally.marksman.wins = 2
    const piece = openGoals(inputs({ roles: { tally, claimed: [] } })).filter((g) => g.source === 'piece')
    expect(piece[0].fraction).toBeGreaterThanOrEqual(piece[1].fraction)
    expect(piece[0].title).toMatch(/Flier/)
  })

  it('drop claimed piece goals and claimed bounties', () => {
    const all = openGoals(inputs())
    const bounty = all.find((g) => g.source === 'bounty')!
    const id = bounty.id.replace('bounty-', '')
    expect(openGoals(inputs({ bounties: [id] })).some((g) => g.id === bounty.id)).toBe(false)
  })

  it('show every goal fraction between 0 and 1', () => {
    for (const g of openGoals(inputs())) {
      expect(g.fraction).toBeGreaterThanOrEqual(0)
      expect(g.fraction).toBeLessThanOrEqual(1)
    }
  })
})
