import { useEffect } from 'react'
import { PieceArt } from '../../art/PieceArt'
import { ROLE_NAMES } from '../../engine/data/roster'
import type { DuelOutcome, Piece } from '../../engine/rules/types'
import { Icon } from '../menus/icons'

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
  const headline = winner ? `${name(winner)} wins` : verdict === 'both' ? 'Both pieces fall' : 'Draw: the defender holds'
  const fighters = [
    { piece: attacker, after: outcome.attackerHp, role: 'Attacker' },
    { piece: defender, after: outcome.defenderHp, role: 'Defender' },
  ]
  return (
    <div className="modal-backdrop">
      <div className="modal duel-result" role="dialog" aria-modal="true" aria-label="Combat result">
        <p className="modal-kicker">Combat result</p>
        <h2>{headline}</h2>
        {winner && (
          <p className="result-line">
            Started with <b>{winner.hp}</b> HP, ended with <b>{winnerAfter}</b>
            {winner.hp > winnerAfter ? ` (−${winner.hp - winnerAfter})` : ' (unhurt)'}
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
                <span className="result-hp">{fell ? `${piece.hp} → fallen` : `${piece.hp} → ${after} HP`}</span>
              </div>
            )
          })}
        </div>
        <div className="buttons">
          <button className="primary" autoFocus onClick={onContinue}><Icon name="next" />Continue</button>
        </div>
        <div className="result-timer" aria-hidden="true"><i style={{ animationDuration: `${SHOWN_MS}ms` }} /></div>
      </div>
    </div>
  )
}
