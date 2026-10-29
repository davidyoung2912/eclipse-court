import { useEffect } from 'react'
import { PieceArt } from '../../art/PieceArt'
import { ROLE_NAMES } from '../../engine/data/roster'
import type { DuelOutcome, Piece } from '../../engine/rules/types'
import { Icon } from '../menus/icons'
import { useDialog } from '../../hooks/useDialog'
import { t } from '../../i18n'

interface Props {
  attacker: Piece
  defender: Piece
  outcome: DuelOutcome
  onContinue: () => void
}

/** How long the summary stays up before play carries on by itself. */
const SHOWN_MS = 3000

type Verdict = 'attacker' | 'defender' | 'both' | 'draw'

function verdictOf({ attackerHp, defenderHp }: DuelOutcome): Verdict {
  if (defenderHp <= 0) return attackerHp > 0 ? 'attacker' : 'both'
  return attackerHp <= 0 ? 'defender' : 'draw'
}

/** A modal summary of a settled duel: who won, and each fighter's HP before and after. */
export function DuelResult({ attacker, defender, outcome, onContinue }: Props) {
  const box = useDialog<HTMLDivElement>(onContinue)
  useEffect(() => {
    const timer = setTimeout(onContinue, SHOWN_MS)
    return () => clearTimeout(timer)
    // The countdown starts once, when the dialog opens.
    // oxlint-disable-next-line react/exhaustive-deps
  }, [])
  const verdict = verdictOf(outcome)
  const name = (p: Piece) => ROLE_NAMES[p.court][p.role]
  const winner = verdict === 'attacker' ? attacker : verdict === 'defender' ? defender : null
  const winnerAfter = verdict === 'attacker' ? outcome.attackerHp : outcome.defenderHp
  const headline = winner ? t('tray.wins', { name: name(winner) }) : verdict === 'both' ? t('tray.bothFall') : t('tray.drawHolds')
  const fighters = [
    { piece: attacker, after: outcome.attackerHp, role: t('tray.attacker') },
    { piece: defender, after: outcome.defenderHp, role: t('tray.defender') },
  ]
  return (
    <div className="modal-backdrop">
      <div ref={box} className="modal duel-result" role="dialog" aria-modal="true" aria-label={t('tray.combatResult')}>
        <p className="modal-kicker">{t('tray.combatResult')}</p>
        <h2>{headline}</h2>
        {winner && (
          <p className="result-line">
            {t('tray.startedWith', { start: winner.hp, end: winnerAfter })}
            {winner.hp > winnerAfter ? ` (−${winner.hp - winnerAfter})` : t('tray.unhurt')}
          </p>
        )}
        <div className="result-fighters">
          {fighters.map(({ piece, after, role }) => {
            const fell = after <= 0
            return (
              <div key={piece.id} className={`result-fighter ${piece.court}${winner?.id === piece.id ? ' won' : ''}${fell ? ' fell' : ''}`}>
                <svg viewBox="-0.45 -0.45 0.9 0.9" aria-hidden="true">
                  <PieceArt role={piece.role} court={piece.court} hp={after} maxHp={piece.maxHp} />
                </svg>
                <b>{name(piece)}</b>
                <small>{role}</small>
                <span className="result-hp">{fell ? t('tray.fallen', { hp: piece.hp }) : t('tray.hpChange', { hp: piece.hp, after })}</span>
              </div>
            )
          })}
        </div>
        <div className="buttons">
          <button className="primary" autoFocus onClick={onContinue}><Icon name="onward" />{t('tray.continue')}</button>
        </div>
        <div className="result-timer" aria-hidden="true"><i style={{ animationDuration: `${SHOWN_MS}ms` }} /></div>
      </div>
    </div>
  )
}
