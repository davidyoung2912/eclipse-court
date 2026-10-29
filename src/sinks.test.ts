import { describe, expect, it } from 'vitest'
import { solutionLine } from './ai/hint'
import { CLASSIC_ROLES } from './engine/data/draft'
import { canReroll, MAX_REROLLS, rerollOffers, runReward, startRun, type Run } from './engine/data/gauntlet'
import { COSMETICS } from './engine/data/cosmetics'
import { PUZZLES } from './engine/data/puzzles'
import { emptyProgress, freezeSaves, liveStreak, recordDaily } from './progress'
import { readRun } from './run'
import { buy, earnShards, shopSnapshot, spend } from './shop'
import { buyFreeze, buyHintPack, buyPrestige, canPrestige, consumeFreeze, consumePackHint, HINT_PACK, MAX_FREEZES, MAX_PRESTIGE, parseSinks, prestigeCost, prestigeOf, PRICE_FREEZE, sinksSnapshot } from './sinks'

describe('parseSinks', () => {
  it('repairs damaged data', () => {
    expect(parseSinks(null)).toEqual({ freezes: 0, hints: 0, prestige: {} })
    expect(parseSinks({ freezes: 99, hints: -3, prestige: { 'pieces:gilded': 2, 'x': 5, 'pieces:jade': 9, 'a:b': 'no' } }))
      .toEqual({ freezes: MAX_FREEZES, hints: 0, prestige: { 'pieces:gilded': 2, 'pieces:jade': MAX_PRESTIGE } })
  })
})

describe('shards spending', () => {
  it('takes nothing it cannot cover', () => {
    const before = shopSnapshot().shards
    expect(spend(before + 1)).toBe(false)
    expect(shopSnapshot().shards).toBe(before)
  })

  it('buys freezes and hint packs up to their limits and uses them up', () => {
    earnShards(1000)
    expect(buyFreeze()).toBe(true)
    expect(buyFreeze()).toBe(true)
    expect(buyFreeze()).toBe(false)
    expect(sinksSnapshot().freezes).toBe(MAX_FREEZES)
    expect(consumeFreeze()).toBe(true)
    expect(sinksSnapshot().freezes).toBe(MAX_FREEZES - 1)
    const shards = shopSnapshot().shards
    expect(buyHintPack()).toBe(true)
    expect(shopSnapshot().shards).toBe(shards - 40)
    expect(sinksSnapshot().hints).toBe(HINT_PACK)
    expect(consumePackHint()).toBe(true)
    expect(sinksSnapshot().hints).toBe(HINT_PACK - 1)
  })

  it('raises prestige one tier at a time and only for owned cosmetics', () => {
    earnShards(5000)
    const paid = COSMETICS.find((c) => c.cost > 0 && !c.goals && c.kind !== 'theme')!
    expect(buyPrestige(paid)).toBe(false)
    const free = COSMETICS.find((c) => c.cost === 0 && !c.goals)!
    expect(canPrestige(free)).toBe(false)
    expect(prestigeCost(paid, 2)).toBe(paid.cost * 2)
    expect(buy(paid)).toBe(true)
    const shards = shopSnapshot().shards
    for (let tier = 1; tier <= MAX_PRESTIGE; tier++) {
      expect(buyPrestige(paid)).toBe(true)
      expect(prestigeOf(paid)).toBe(tier)
    }
    expect(shopSnapshot().shards).toBe(shards - paid.cost * 6)
    expect(buyPrestige(paid)).toBe(false)
  })
})

describe('streak freeze', () => {
  const play = (p: ReturnType<typeof emptyProgress>, date: number, freezes = 0) => recordDaily(p, { date, won: true, turns: 9, lost: 1 }, freezes)

  it('covers exactly one missed day', () => {
    const p = play(play(emptyProgress(), 20261024).progress, 20261025).progress
    expect(liveStreak(p, 20261027)).toBe(0)
    expect(liveStreak(p, 20261027, 1)).toBe(2)
    expect(liveStreak(p, 20261028, 2)).toBe(0)
    expect(freezeSaves(p, 20261027, 1)).toBe(true)
    expect(freezeSaves(p, 20261026, 1)).toBe(false)
  })

  it('keeps the streak going when a freeze is held and breaks it otherwise', () => {
    const p = play(play(emptyProgress(), 20261024).progress, 20261025).progress
    const frozen = play(p, 20261027, 1)
    expect(frozen.froze).toBe(true)
    expect(frozen.progress.daily.streak).toBe(3)
    const bare = play(p, 20261027)
    expect(bare.froze).toBe(false)
    expect(bare.progress.daily.streak).toBe(1)
    expect(play(p, 20261026, 1).froze).toBe(false)
  })
})

describe('gauntlet reroll', () => {
  const base = startRun('solari', CLASSIC_ROLES, 12345)
  const run: Run = { ...base, stage: 2, path: [0], offers: runReward({ ...base, stage: 2 }, 7) }

  it('draws new offers up to the limit and then stops', () => {
    let r = run
    for (let i = 0; i < MAX_REROLLS; i++) {
      expect(canReroll(r)).toBe(true)
      r = rerollOffers(r)
      expect(r.rerolls).toBe(i + 1)
      expect(r.offers?.length).toBeGreaterThan(0)
    }
    expect(canReroll(r)).toBe(false)
    expect(rerollOffers(r)).toBe(r)
  })

  it('is the same on a replay and only possible while offers are on the table', () => {
    expect(rerollOffers(run)).toEqual(rerollOffers(run))
    expect(canReroll({ ...run, offers: null })).toBe(false)
  })

  it('survives a save and reads old runs as unrerolled', () => {
    const r = rerollOffers(run)
    expect(readRun(JSON.parse(JSON.stringify(r)))?.rerolls).toBe(1)
    const { rerolls: _gone, ...old } = r
    expect(readRun(old)?.rerolls).toBe(0)
    expect(readRun({ ...r, rerolls: 99 })?.rerolls).toBe(0)
  })
})

describe('solutionLine', () => {
  it('numbers every step of a puzzle line', () => {
    const p = PUZZLES[0]
    const line = solutionLine(p.build(), p.solution)
    expect(line.startsWith('1. ')).toBe(true)
    expect(line.match(/\d+\. /g)).toHaveLength(p.solution.length)
  })
})

describe('prices', () => {
  it('can be reached in a few weeks of play', () => {
    expect(PRICE_FREEZE).toBeLessThanOrEqual(80)
    expect(prestigeCost(COSMETICS.find((c) => c.cost > 0)!, MAX_PRESTIGE)).toBeLessThanOrEqual(2200)
    expect(prestigeOf(COSMETICS[0], { freezes: 0, hints: 0, prestige: {} })).toBe(0)
  })
})
