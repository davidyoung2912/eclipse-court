import { LOADOUT_SIZE, SPELL_INFO, spellPool } from '../../engine/rules/spells'
import { spellStars, spellUnlocked } from '../../engine/data/unlocks'
import type { Court, Spell } from '../../engine/rules/types'

interface Props {
  court: Court
  spells: readonly Spell[]
  onChange: (spells: Spell[]) => void
  /** Campaign stars earned, which open further spells. */
  stars: number
}

/** Choose the spells your Leader carries; each court also has two signature spells of its own. */
export function LoadoutPicker({ court, spells, onChange, stars }: Props) {
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
        const open = spellUnlocked(stars, sp)
        return (
          <div key={sp} className="draft-row">
            <span className="name">{SPELL_INFO[sp].name}{own ? ' ★' : ''}<small>{open ? SPELL_INFO[sp].text : `Earn ${spellStars(sp)} campaign stars to unlock.`}</small></span>
            <button aria-pressed={on} disabled={!open || (!on && full)}
              onClick={() => onChange(on ? spells.filter((s) => s !== sp) : [...spells, sp])}>
              {on ? '✓' : '+'}
            </button>
          </div>
        )
      })}
    </div>
  )
}
