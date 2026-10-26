import { ROLE_NAMES } from '../../engine/data/roster'
import type { Odds } from '../../engine/reducer'
import { Icon } from '../menus/icons'
import type { Piece } from '../../engine/rules/types'

interface Props {
  attacker: Piece
  defender: Piece
  luminance: number
  odds: Odds
  live: boolean
  onConfirm: () => void
  onCancel: () => void
}

const pct = (n: number) => `${Math.round(n * 100)}%`

export function AttackConfirm({ attacker, defender, luminance, odds, live, onConfirm, onCancel }: Props) {
  const name = (p: Piece) => `${ROLE_NAMES[p.court][p.role]} ${p.hp}/${p.maxHp}`
  return (
    <div className="confirm" role="dialog" aria-label="Confirm attack">
      <p className="confirm-title">{name(attacker)} attacks {name(defender)}</p>
      <div className="odds" aria-label="Win odds">
        <span className={`odds-a ${attacker.court}`} style={{ flexGrow: odds.attacker }} />
        <span className="odds-o" style={{ flexGrow: odds.other }} />
        <span className={`odds-d ${defender.court}`} style={{ flexGrow: odds.defender }} />
      </div>
      <p className="odds-text">
        Attacker {pct(odds.attacker)} · Draw {pct(odds.other)} · Defender {pct(odds.defender)}
        <br />
        Square light {luminance > 0 ? `+${luminance}` : luminance}
      </p>
      <div className="buttons">
        <button onClick={onCancel}><Icon name="close" />Cancel</button>
        <button className="primary" onClick={onConfirm}>{live ? <><Icon name="swords" />Attack</> : <><Icon name="bolt" />Auto-resolve</>}</button>
      </div>
    </div>
  )
}
