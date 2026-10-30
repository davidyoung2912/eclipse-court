import { ROLE_NAMES } from '../../engine/data/roster'
import type { Odds } from '../../engine/reducer'
import { useEffect } from 'react'
import { Icon } from '../menus/icons'
import type { CellEffect, Piece } from '../../engine/rules/types'
import { CELL_INFO } from '../../engine/rules/cells'
import { adviceFor } from './attackAdvice'
import { useDialog } from '../../hooks/useDialog'
import { t } from '../../i18n'

interface Props {
  attacker: Piece
  defender: Piece
  luminance: number
  odds: Odds
  /** The cell effects under each fighter, already counted in the odds. */
  cells?: { attacker: CellEffect | null; defender: CellEffect | null }
  /** Extra breakdown shown when the Odds detail setting is on. */
  detail?: { next: Odds; nextLuminance: number }
  live: boolean
  onConfirm: () => void
  onCancel: () => void
}

const pct = (n: number) => `${Math.round(n * 100)}%`

export function AttackConfirm({ attacker, defender, luminance, odds, live, cells, detail, onConfirm, onCancel }: Props) {
  const advice = adviceFor(odds, defender)
  const box = useDialog<HTMLDivElement>(onCancel)
  // On a phone the page can be scrolled so the tray's lower edge is off screen; bring the whole summary, buttons included, into view.
  useEffect(() => { box.current?.scrollIntoView({ block: 'nearest' }) }, [box])
  const name = (p: Piece) => `${ROLE_NAMES[p.court][p.role]} ${p.hp}/${p.maxHp}`
  return (
    <div ref={box} className="confirm" role="dialog" aria-label={t('tray.confirmAttack')}>
      <p className="confirm-title">{t('tray.attacks', { attacker: name(attacker), defender: name(defender) })}</p>
      <div className="odds" aria-label={t('tray.winOdds')}>
        <span className={`odds-a ${attacker.court}`} style={{ flexGrow: odds.attacker }} />
        <span className="odds-o" style={{ flexGrow: odds.other }} />
        <span className={`odds-d ${defender.court}`} style={{ flexGrow: odds.defender }} />
      </div>
      <p className="odds-text">
        {t('tray.oddsLine', { attacker: pct(odds.attacker), draw: pct(odds.other), defender: pct(odds.defender) })}
        <br />
        {t('tray.squareLight', { light: luminance > 0 ? `+${luminance}` : luminance })}
        {cells?.attacker && <><br />{t('tray.attackerOn', { cell: CELL_INFO[cells.attacker].name })}</>}
        {cells?.defender && <><br />{t('tray.defenderOn', { cell: CELL_INFO[cells.defender].name })}</>}
      </p>
      {detail && (
        <ul className="odds-detail" aria-label={t('tray.oddsDetail')}>
          {[attacker, defender].map((p, i) => (
            <li key={p.id}>{i === 0 ? t('tray.attacker') : t('tray.defender')}: {t('tray.hpOf', { hp: p.hp, max: p.maxHp })}{p.perk ? `, ${p.perk}` : ''}{p.wins ? `, ${t('tray.winsN', { count: p.wins })}` : ''}{p.bound ? `, ${t('tray.boundLower')}` : ''}{p.shrouded ? `, ${t('tray.shroudedLower')}` : ''}</li>
          ))}
          <li>{t('tray.nextRound', { light: detail.nextLuminance > 0 ? `+${detail.nextLuminance}` : detail.nextLuminance, attacker: pct(detail.next.attacker), draw: pct(detail.next.other), defender: pct(detail.next.defender) })}</li>
        </ul>
      )}
      <p className={`confirm-advice ${advice.tone}`}>{advice.text}</p>
      <div className="buttons">
        <button onClick={onCancel}><Icon name="close" />{t('tray.withdraw')}</button>
        <button className="primary" onClick={onConfirm}>{live ? <><Icon name="swords" />{t('tray.attack')}</> : <><Icon name="bolt" />{t('tray.autoResolve')}</>}</button>
      </div>
    </div>
  )
}
