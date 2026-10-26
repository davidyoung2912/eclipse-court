import { canCast, leaderOf, SPELL_INFO, SPELLS } from '../../engine/rules/spells'
import type { GameState, Spell } from '../../engine/rules/types'
import { Icon, type IconName } from '../menus/icons'

const SPELL_ICON: Record<Spell, IconName> = {
  blink: 'sparkle', mend: 'plus', turn: 'cycle', swap: 'swap', conjure: 'star', revive: 'rise', bind: 'chain',
}

interface Props {
  state: GameState
  active: Spell | null
  onPick: (spell: Spell | null) => void
}

export function SpellBar({ state, active, onPick }: Props) {
  const court = state.turn
  const leader = leaderOf(state, court)
  const off = state.eclipse ? 'Spells are silent in the Eclipse' : !leader ? 'No Leader' : leader.hp < 2 ? 'Leader too weak to cast' : ''
  return (
    <div className="spells">
      <div className="spell-row">
        {SPELLS.map((sp) => {
          const left = state.spells[court].includes(sp)
          const ok = !off && left && canCast(state, court, sp)
          return (
            <button key={sp} className={`spell${active === sp ? ' active' : ''}`} disabled={!ok}
              title={SPELL_INFO[sp].text} onClick={() => onPick(active === sp ? null : sp)}>
              <Icon name={SPELL_ICON[sp]} />{SPELL_INFO[sp].name}
            </button>
          )
        })}
      </div>
      <p className="spell-hint">
        {active ? `${SPELL_INFO[active].text} Costs 1 HP and your turn.` : off || 'Cast a spell (1 HP, ends your turn)'}
      </p>
    </div>
  )
}
