/** Skirmish rule combinations the player has named and kept. */
const KEY = 'eclipse-court:presets'
export const MAX_SAVED_PRESETS = 12
export const MAX_NAME = 24

export interface SavedPreset {
  id: string
  name: string
  /** The setup screen's own choices (rules, army, board, twists), as `lastChoices` stores them. */
  choices: Record<string, unknown>
}

export function loadPresets(storage: Pick<Storage, 'getItem'> = localStorage): SavedPreset[] {
  try {
    const raw = JSON.parse(storage.getItem(KEY) ?? '[]')
    if (!Array.isArray(raw)) return []
    return raw
      .filter((p): p is SavedPreset => !!p && typeof p.id === 'string' && typeof p.name === 'string'
        && !!p.choices && typeof p.choices === 'object' && !Array.isArray(p.choices))
      .slice(0, MAX_SAVED_PRESETS)
  } catch {
    return []
  }
}

function store(list: SavedPreset[], storage: Pick<Storage, 'setItem'>): void {
  try {
    storage.setItem(KEY, JSON.stringify(list))
  } catch {
    // Storage may be full or blocked; the preset is just not kept.
  }
}

/** Saves `choices` under `name`; a name already used is overwritten. Returns the new list. */
export function savePreset(name: string, choices: Record<string, unknown>, storage: Pick<Storage, 'getItem' | 'setItem'> = localStorage): SavedPreset[] {
  const clean = name.trim().slice(0, MAX_NAME)
  const list = loadPresets(storage)
  if (!clean) return list
  const same = list.find((p) => p.name.toLowerCase() === clean.toLowerCase())
  let next: SavedPreset[]
  if (same) next = list.map((p) => (p === same ? { ...p, choices } : p))
  else if (list.length >= MAX_SAVED_PRESETS) return list
  else next = [...list, { id: `p${Date.now().toString(36)}${list.length}`, name: clean, choices }]
  store(next, storage)
  return next
}

export function deletePreset(id: string, storage: Pick<Storage, 'getItem' | 'setItem'> = localStorage): SavedPreset[] {
  const next = loadPresets(storage).filter((p) => p.id !== id)
  store(next, storage)
  return next
}
