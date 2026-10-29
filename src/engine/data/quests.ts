import type { Summary } from './summary'

/** Something the player did that a quest can count. */
export type QuestEvent = { kind: 'game'; summary: Summary } | { kind: 'puzzle' } | { kind: 'stage' }

export type QuestPeriod = 'daily' | 'weekly'

export interface Quest {
  id: string
  period: QuestPeriod
  text: string
  target: number
  shards: number
  /** How far one event moves the quest. */
  gain: (e: QuestEvent) => number
}

const game = (f: (s: Summary) => number) => (e: QuestEvent) => (e.kind === 'game' ? f(e.summary) : 0)
const puzzle = (e: QuestEvent) => (e.kind === 'puzzle' ? 1 : 0)
const stage = (e: QuestEvent) => (e.kind === 'stage' ? 1 : 0)

export const QUESTS: readonly Quest[] = [
  { id: 'd-play', period: 'daily', text: 'Finish 2 games', target: 2, shards: 10, gain: game(() => 1) },
  { id: 'd-win', period: 'daily', text: 'Win a game', target: 1, shards: 12, gain: game((s) => (s.won ? 1 : 0)) },
  { id: 'd-swift', period: 'daily', text: 'Win before the Eclipse', target: 1, shards: 15, gain: game((s) => (s.won && s.swift ? 1 : 0)) },
  { id: 'd-take', period: 'daily', text: 'Take 6 enemy pieces', target: 6, shards: 12, gain: game((s) => s.taken) },
  { id: 'd-cast', period: 'daily', text: 'Cast 3 spells', target: 3, shards: 10, gain: game((s) => s.spellsCast) },
  { id: 'd-clean', period: 'daily', text: 'Win losing no more than two pieces', target: 1, shards: 15, gain: game((s) => (s.won && s.lost <= 2 ? 1 : 0)) },
  { id: 'd-puzzle', period: 'daily', text: 'Solve 3 puzzles', target: 3, shards: 12, gain: puzzle },
  { id: 'd-stage', period: 'daily', text: 'Clear a Gauntlet stage', target: 1, shards: 15, gain: stage },
  { id: 'd-hard', period: 'daily', text: 'Win at Hard', target: 1, shards: 18, gain: game((s) => (s.won && s.difficulty === 'hard' ? 1 : 0)) },
  { id: 'w-win', period: 'weekly', text: 'Win 5 games', target: 5, shards: 50, gain: game((s) => (s.won ? 1 : 0)) },
  { id: 'w-take', period: 'weekly', text: 'Take 30 enemy pieces', target: 30, shards: 45, gain: game((s) => s.taken) },
  { id: 'w-cast', period: 'weekly', text: 'Cast 12 spells', target: 12, shards: 40, gain: game((s) => s.spellsCast) },
  { id: 'w-puzzle', period: 'weekly', text: 'Solve 10 puzzles', target: 10, shards: 50, gain: puzzle },
  { id: 'w-stage', period: 'weekly', text: 'Clear 5 Gauntlet stages', target: 5, shards: 55, gain: stage },
  { id: 'w-swift', period: 'weekly', text: 'Win 3 games before the Eclipse', target: 3, shards: 45, gain: game((s) => (s.won && s.swift ? 1 : 0)) },
  { id: 'w-clean', period: 'weekly', text: 'Win 2 games without losing a piece', target: 2, shards: 55, gain: game((s) => (s.won && s.lost === 0 ? 1 : 0)) },
]

export const QUESTS_PER_PERIOD = 3

export const questById = (id: string) => QUESTS.find((q) => q.id === id)
