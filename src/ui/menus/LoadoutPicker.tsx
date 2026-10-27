import { LOADOUT_SIZE, SPELL_INFO, spellPool } from '../../engine/rules/spells'
import type { Court, Spell } from '../../engine/rules/types'

interface Props {
  court: Court
  spells: readonly Spell[]
  onChange: (spells: Spell[]) => void
}

/** Choose the spells your Leader carries; each court also has two signature spells of its own. */
export function LoadoutPicker({ court, spells, onChange }: Props) {
  const full = spells.length >= LOADOUT_SIZE
  return (
    <div className="draft">
      <div className="draft-head">
        <span>Choose {LOADOUT_SIZE} spells</span>
        <span>{spells.length} / {LOADOUT_SIZE}</span>
      </div>
      {spellPool(court).map((sp) => {
        const on = spells.includes(sp)
        const own = SPELL_INFO[sp].courts.length === 1
        return (
          <div key={sp} className="draft-row">
            <span className="name">{SPELL_INFO[sp].name}{own ? ' ★' : ''}<small>{SPELL_INFO[sp].text}</small></span>
            <button aria-pressed={on} disabled={!on && full}
              onClick={() => onChange(on ? spells.filter((s) => s !== sp) : [...spells, sp])}>
              {on ? '✓' : '+'}
            </button>
          </div>
        )
      })}
    </div>
  )
}
