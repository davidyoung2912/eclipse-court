import { describe, expect, it } from 'vitest'
import { QUESTS, QUESTS_PER_PERIOD } from './engine/data/quests'
import type { Summary } from './engine/data/summary'
import { shopSnapshot } from './shop'
import { applyEvent, canRerollQuest, claimQuest, drawQuests, forDate, parseQuests, questDone, questsSnapshot, recordQuestEvent, refreshQuests, rerollSlot } from './quests'

const won: Summary = { won: true, draw: false, lost: 0, taken: 7, turns: 9, swift: true, spellsCast: 3, difficulty: 'normal', campaignIndex: null, daily: false }

describe('quest draws', () => {
  it('give the same distinct quests for a date', () => {
    const a = drawQuests('daily', 20261028, QUESTS_PER_PERIOD).map((q) => q.id)
    expect(drawQuests('daily', 20261028, QUESTS_PER_PERIOD).map((q) => q.id)).toEqual(a)
    expect(new Set(a).size).toBe(QUESTS_PER_PERIOD)
    expect(drawQuests('weekly', 20261026, QUESTS_PER_PERIOD).every((q) => q.period === 'weekly')).toBe(true)
  })

  it('differ across days', () => {
    const days = new Set(Array.from({ length: 20 }, (_, i) => drawQuests('daily', 20261000 + i, QUESTS_PER_PERIOD).map((q) => q.id).join()))
    expect(days.size).toBeGreaterThan(5)
  })

  it('has a pool big enough for a reroll in each period', () => {
    for (const p of ['daily', 'weekly'] as const) expect(QUESTS.filter((q) => q.period === p).length).toBeGreaterThan(QUESTS_PER_PERIOD)
  })
})

describe('quest progress', () => {
  it('counts games, puzzles and stages towards the right quests and caps at the target', () => {
    let s = forDate(parseQuests(null), 20261028, 20261026)
    for (let i = 0; i < 12; i++) s = applyEvent(applyEvent(applyEvent(s, { kind: 'game', summary: won }), { kind: 'puzzle' }), { kind: 'stage' })
    for (const slot of [...s.daily, ...s.weekly]) {
      const q = QUESTS.find((x) => x.id === slot.id)!
      expect(slot.n).toBeLessThanOrEqual(q.target)
    }
    const all = [...s.daily, ...s.weekly]
    expect(all.some(questDone)).toBe(true)
  })

  it('deals new quests on a new day and keeps the week', () => {
    const a = forDate(parseQuests(null), 20261028, 20261026)
    const b = forDate(a, 20261029, 20261026)
    expect(b.weekly).toBe(a.weekly)
    expect(b.day).toBe(20261029)
    expect(forDate(a, 20261028, 20261026)).toBe(a)
  })

  it('rerolls one quest once a day and resets its progress', () => {
    const a = forDate(parseQuests(null), 20261028, 20261026)
    const r = rerollSlot(a, 'daily', 1, 20261028)!
    expect(r.daily[1].id).not.toBe(a.daily[1].id)
    expect(new Set(r.daily.map((x) => x.id)).size).toBe(QUESTS_PER_PERIOD)
    expect(canRerollQuest(r, 20261028)).toBe(false)
    expect(rerollSlot(r, 'weekly', 0, 20261028)).toBeNull()
    expect(canRerollQuest(r, 20261029)).toBe(true)
  })

  it('repairs damaged data', () => {
    const s = parseQuests({ day: 'x', daily: [{ id: 'nope', n: 3 }, { id: 'd-win', n: 99, claimed: true }, { id: 'w-win', n: 1 }], weekly: 5 })
    expect(s.daily).toEqual([{ id: 'd-win', n: 1, claimed: true }])
    expect(s.weekly).toEqual([])
  })
})

describe('quest store', () => {
  it('pays a finished quest once', () => {
    refreshQuests()
    for (let i = 0; i < 12; i++) {
      recordQuestEvent({ kind: 'game', summary: won })
      recordQuestEvent({ kind: 'puzzle' })
      recordQuestEvent({ kind: 'stage' })
    }
    const before = shopSnapshot().shards
    const s = questsSnapshot()
    const index = s.daily.findIndex(questDone)
    if (index >= 0) {
      const paid = claimQuest('daily', index)
      expect(paid).toBeGreaterThan(0)
      expect(shopSnapshot().shards).toBe(before + paid)
      expect(claimQuest('daily', index)).toBe(0)
    }
    expect(claimQuest('daily', 9)).toBe(0)
  })
})
