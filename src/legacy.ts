import { RELICS, type RelicId } from './engine/data/gauntlet'
import { MAX_DRAFTED } from './engine/data/draft'
import { legacyPower, type Legacy } from './engine/data/legacy'
import { ALL_SPELLS } from './engine/rules/spells'
import type { Spell } from './engine/rules/types'
import { piece, pieces } from './run'

/** The army the best finished Gauntlet run left behind; kept apart from the run itself and from backups of settings. */
const KEY = 'eclipse-court:legacy'

/** A stored legacy made safe to use, or null if it is damaged. */
export function readLegacy(raw: unknown): Legacy | null {
  const o = raw as Partial<Legacy> | null
  if (!o) return null
  const leader = piece(o.leader)
  const army = pieces(o.army, MAX_DRAFTED)
  if (!leader || leader.role !== 'leader' || !army) return null
  if (!Array.isArray(o.loadout) || o.loadout.length > 20 || !o.loadout.every((s) => (ALL_SPELLS as string[]).includes(s))) return null
  if (!Array.isArray(o.relics) || !o.relics.every((r) => r in RELICS)) return null
  return { leader, army, loadout: o.loadout as Spell[], relics: o.relics as RelicId[] }
}

export function loadLegacy(): Legacy | null {
  try {
    return readLegacy(JSON.parse(localStorage.getItem(KEY) ?? 'null'))
  } catch {
    return null
  }
}

/** Keeps `next` unless the legacy already held is stronger; true when it was kept. */
export function saveLegacy(next: Legacy): boolean {
  const held = loadLegacy()
  if (held && legacyPower(held) > legacyPower(next)) return false
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
    return true
  } catch {
    return false
  }
}
