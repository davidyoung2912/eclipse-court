import { bountiesFor, type Bounty } from './engine/data/bounties'
import type { Summary } from './engine/data/summary'
import { dailySeed } from './engine/data/setups'

/** Which of a day's skirmish bounties are claimed; one day is kept at a time. */
const KEY = 'eclipse-court:bounties'

interface Store {
  day: number
  claimed: string[]
}

function load(): Store {
  try {
    const o = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Partial<Store> | null
    if (o && Number.isInteger(o.day) && Array.isArray(o.claimed)) return { day: o.day!, claimed: o.claimed.filter((x): x is string => typeof x === 'string') }
  } catch {
    // Fall through to an empty store.
  }
  return { day: 0, claimed: [] }
}

let store = load()

/** The ids already claimed on `day`. */
export const claimedOn = (day = dailySeed()): string[] => (store.day === day ? store.claimed : [])

/** Claims every unclaimed bounty of `day` that `summary` meets; returns them so the caller can pay and report. */
export function claimBounties(summary: Summary, day = dailySeed()): Bounty[] {
  const have = claimedOn(day)
  const won = bountiesFor(day).filter((b) => !have.includes(b.id) && b.met(summary))
  if (won.length === 0) return []
  store = { day, claimed: [...have, ...won.map((b) => b.id)] }
  try {
    localStorage.setItem(KEY, JSON.stringify(store))
  } catch {
    // Without storage the claims last for the visit.
  }
  return won
}
