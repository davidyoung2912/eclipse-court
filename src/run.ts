import { GAUNTLET_STAGES, RELICS, RUN_VERSION, type RelicId, type Reward, type Run, type RunPiece } from './engine/data/gauntlet'
import { DRAFT_ROLES, MAX_DRAFTED } from './engine/data/draft'
import { ALL_SPELLS } from './engine/rules/spells'
import type { Court, Perk, Role, Spell } from './engine/rules/types'

const RUN_KEY = 'eclipse-court:run'

const ROLES: readonly Role[] = [...DRAFT_ROLES, 'leader']
const PERKS: readonly Perk[] = ['might', 'ward', 'vigour']

const isInt = (v: unknown, max = 1e9): v is number => typeof v === 'number' && Number.isInteger(v) && v >= 0 && v <= max

function piece(v: unknown): RunPiece | null {
  const o = v as Partial<RunPiece> | null
  if (!o || !ROLES.includes(o.role as Role) || !isInt(o.wins, 99) || !isInt(o.bonus, 9)) return null
  return { role: o.role!, wins: o.wins, bonus: o.bonus, ...(PERKS.includes(o.perk as Perk) ? { perk: o.perk } : {}) }
}

function pieces(v: unknown, max: number): RunPiece[] | null {
  if (!Array.isArray(v) || v.length > max) return null
  const out = v.map(piece)
  return out.every((p) => p !== null) ? (out as RunPiece[]) : null
}

function reward(v: unknown): Reward | null {
  const o = v as Record<string, unknown> | null
  switch (o?.kind) {
    case 'piece': return ROLES.includes(o.role as Role) ? (o as unknown as Reward) : null
    case 'hp': return isInt(o.target, MAX_DRAFTED) ? (o as unknown as Reward) : null
    case 'perk': return isInt(o.target, MAX_DRAFTED) && PERKS.includes(o.perk as Perk) ? (o as unknown as Reward) : null
    case 'spell': return (ALL_SPELLS as string[]).includes(o.spell as string) ? (o as unknown as Reward) : null
    case 'relic': return o.relic as string in RELICS ? (o as unknown as Reward) : null
    case 'revive': return isInt(o.target, MAX_DRAFTED) ? (o as unknown as Reward) : null
    default: return null
  }
}

/** A stored run made safe to use, or null if it is damaged or from another version. */
export function readRun(raw: unknown): Run | null {
  const o = raw as Partial<Run> | null
  if (!o || o.v !== RUN_VERSION) return null
  const army = pieces(o.army, MAX_DRAFTED)
  const fallen = pieces(o.fallen, MAX_DRAFTED)
  const leader = piece(o.leader)
  if (!army || !fallen || !leader || leader.role !== 'leader') return null
  if (!isInt(o.seed, 2 ** 32) || !isInt(o.stage, GAUNTLET_STAGES + 1) || o.stage < 1) return null
  if (o.court !== 'solari' && o.court !== 'umbral') return null
  if (!Array.isArray(o.loadout) || o.loadout.length > 20 || !o.loadout.every((s) => (ALL_SPELLS as string[]).includes(s))) return null
  if (!Array.isArray(o.relics) || !o.relics.every((r) => r in RELICS)) return null
  let offers: Reward[] | null = null
  if (o.offers != null) {
    if (!Array.isArray(o.offers) || o.offers.length > 5) return null
    const read = o.offers.map(reward)
    if (read.some((r) => r === null)) return null
    offers = read as Reward[]
  }
  return {
    v: RUN_VERSION, seed: o.seed, court: o.court as Court, stage: o.stage, leader, army, fallen,
    loadout: o.loadout as Spell[], relics: o.relics as RelicId[], offers,
  }
}

export function saveRun(run: Run) {
  try {
    localStorage.setItem(RUN_KEY, JSON.stringify(run))
  } catch {
    // A run that cannot be saved still plays; it just cannot be resumed.
  }
}

export function clearRun() {
  try {
    localStorage.removeItem(RUN_KEY)
  } catch {
    // Nothing was saved either.
  }
}

/** The run in progress, or null if there is none or it can no longer be read. */
export function loadRun(): Run | null {
  try {
    const raw = localStorage.getItem(RUN_KEY)
    if (!raw) return null
    const run = readRun(JSON.parse(raw))
    if (run) return run
    clearRun()
  } catch {
    // Unreadable runs are treated as absent.
  }
  return null
}
