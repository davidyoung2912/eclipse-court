import { canCast, leaderOf, loadoutOf, SPELL_INFO } from '../../engine/rules/spells'
import type { GameState, Spell } from '../../engine/rules/types'
import { Icon, type IconName } from '../menus/icons'
import { t } from '../../i18n'

const SPELL_ICON: Record<Spell, IconName> = {
  blink: 'sparkle', mend: 'plus', turn: 'cycle', swap: 'swap', conjure: 'star', revive: 'rise', bind: 'chain',
  hold: 'hourglass', hasten: 'skip', shroud: 'shield', exchange: 'swap', mirror: 'moon', sacrifice: 'flame',
}

interface Props {
  state: GameState
  active: Spell | null
  onPick: (spell: Spell | null) => void
  /** Set once the first of Exchange's two allies is chosen. */
  exchanging?: boolean
}

export function SpellBar({ state, active, onPick, exchanging }: Props) {
  const court = state.turn
  const leader = leaderOf(state, court)
  const off = state.eclipse ? t('tray.spellsSilent') : !leader ? t('tray.noLeader') : leader.hp < 2 ? t('tray.leaderWeak') : ''
  return (
    <div className="spells">
      <div className="spell-row">
        {loadoutOf(state.config, court).map((sp) => {
          const left = state.spells[court].includes(sp)
          const back = state.recharging[court].find((r) => r.spell === sp)
          const ok = !off && left && canCast(state, court, sp)
          return (
            <button key={sp} className={`spell${active === sp ? ' active' : ''}`} disabled={!ok}
              title={back ? t('tray.returnsAt', { round: back.ready }) : SPELL_INFO[sp].text} onClick={() => onPick(active === sp ? null : sp)}>
              <Icon name={SPELL_ICON[sp]} />{SPELL_INFO[sp].name}
            </button>
          )
        })}
      </div>
      <p className="spell-hint">
        {active ? t('tray.spellHint', { text: exchanging ? t('tray.secondAlly') : SPELL_INFO[active].text, cost: SPELL_INFO[active].cost }) : off || t('tray.castHint')}
      </p>
    </div>
  )
}
