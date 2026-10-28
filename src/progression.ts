import { dayIndex } from './engine/data/setups'
import type { Rarity } from './engine/data/cosmetics'

/** Court ranks, climbed by the mastery levels summed over every track. */
export const COURT_RANKS: readonly { name: string; levels: number }[] = [
  { name: 'Squire', levels: 0 },
  { name: 'Knight', levels: 4 },
  { name: 'Warden', levels: 10 },
  { name: 'Captain', levels: 18 },
  { name: 'Marshal', levels: 28 },
  { name: 'Archon', levels: 40 },
]

export interface CourtRank {
  /** 0 for the lowest rank. */
  tier: number
  name: string
  /** Levels still needed for the next rank, or null at the top. */
  toNext: number | null
  /** How far through this rank, 0 to 1. */
  fraction: number
}

export function courtRank(totalLevels: number): CourtRank {
  const tier = COURT_RANKS.filter((r) => totalLevels >= r.levels).length - 1
  const next = COURT_RANKS[tier + 1]
  const from = COURT_RANKS[tier].levels
  return {
    tier, name: COURT_RANKS[tier].name,
    toNext: next ? next.levels - totalLevels : null,
    fraction: next ? (totalLevels - from) / (next.levels - from) : 1,
  }
}

/** The glint a cosmetic carries: none for Common, then quicker and brighter with rarity. */
export function glintOf(rarity: Rarity): { period: number; strength: number } | null {
  switch (rarity) {
    case 'common': return null
    case 'uncommon': return { period: 7000, strength: 0.12 }
    case 'rare': return { period: 6000, strength: 0.2 }
    case 'epic': return { period: 5000, strength: 0.28 }
    case 'legend': return { period: 4000, strength: 0.38 }
  }
}

export interface StampDay {
  date: number
  /** Whether the daily streak covers this day. */
  stamped: boolean
  today: boolean
}

/** The seven days ending `today`, each stamped if the live streak (ending at `lastDate`) covers it. */
export function stampWeek(today: number, lastDate: number | null, streak: number): StampDay[] {
  const end = dayIndex(today)
  const last = lastDate === null ? null : dayIndex(lastDate)
  return Array.from({ length: 7 }, (_, i) => {
    const idx = end - 6 + i
    const d = new Date(idx * 86400000)
    const date = d.getUTCFullYear() * 10000 + (d.getUTCMonth() + 1) * 100 + d.getUTCDate()
    return { date, stamped: last !== null && idx <= last && idx > last - streak, today: i === 6 }
  })
}
