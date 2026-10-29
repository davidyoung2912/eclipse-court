import { ROLE_NAMES } from '../../engine/data/roster'
import { ROLE_INFO } from '../../engine/data/pieceInfo'
import { createFighter, styleOf } from '../../engine/duel/duel'
import { rankOf } from '../../engine/rules/growth'
import type { DuelCells } from '../../engine/rules/cells'
import type { Piece } from '../../engine/rules/types'
import { t } from '../../i18n'

/** Plain-words read on the AI fighter's duel skill. */
const skillLabel = (s: number) => (s < 0.25 ? t('brief.clumsy') : s < 0.5 ? t('brief.steady') : s < 0.75 ? t('brief.sharp') : t('brief.deadly'))
const aggressionLabel = (a: number) => (a < 0.4 ? t('brief.cautious') : a < 0.75 ? t('brief.balanced') : t('brief.relentless'))
const pct = (m: number) => `${m > 1 ? '+' : m < 1 ? '−' : ''}${Math.round(Math.abs(m - 1) * 100)}%`

interface Props {
  mine: Piece
  foe: Piece
  luminance: number
  /** Cell effects under the attacker and defender. */
  cells?: DuelCells
  playerSide: 0 | 1
  opponentSkill: number
  opponentAggression: number
  onContinue: () => void
}

function Card({ piece, who, cell, luminance, ai }: { piece: Piece; who: string; cell?: DuelCells['attacker']; luminance: number; ai?: string }) {
  const st = styleOf(piece.role)
  const f = createFighter(piece, { x: 0, y: 0 }, 0, luminance, cell)
  const rank = rankOf(piece)
  return (
    <div className={`duel-brief-card ${piece.court}`}>
      <h3>{who}</h3>
      <p className="duel-brief-name">{ROLE_NAMES[piece.court][piece.role]}{rank !== 'recruit' ? ` · ${rank}` : ''}{piece.perk ? ` · ${piece.perk}` : ''}</p>
      <p className="duel-brief-role">{ROLE_INFO[piece.role].label}{ai ? ` · ${ai}` : ''}</p>
      <div className="duel-brief-hp" aria-label={t('brief.healthLabel', { hp: piece.hp, max: piece.maxHp })}>
        <span style={{ width: `${Math.round((piece.hp / piece.maxHp) * 100)}%` }} />
      </div>
      <dl>
        <dt>{t('brief.health')}</dt><dd>{Math.round(piece.hp * 10) / 10} / {piece.maxHp}</dd>
        <dt>{t('brief.attack')}</dt><dd>{t(`brief.kind.${st.kind}`)}</dd>
        <dt>{t('brief.damage')}</dt><dd>{pct(f.dealt)}</dd>
        <dt>{t('brief.takes')}</dt><dd>{pct(f.taken)}</dd>
        <dt>{t('brief.speed')}</dt><dd>{st.speed.toFixed(1)}</dd>
      </dl>
    </div>
  )
}

export function DuelBriefing({ mine, foe, luminance, cells, playerSide, opponentSkill, opponentAggression, onContinue }: Props) {
  const mineCell = cells && (playerSide === 0 ? cells.attacker : cells.defender)
  const foeCell = cells && (playerSide === 0 ? cells.defender : cells.attacker)
  return (
    <button type="button" className="duel-brief" onClick={onContinue} aria-label={t('brief.label')}>
      <div className="duel-brief-cards">
        <Card piece={mine} who={t('brief.you')} cell={mineCell} luminance={luminance} />
        <Card piece={foe} who={t('brief.opponent')} cell={foeCell} luminance={luminance} ai={`${skillLabel(opponentSkill)}, ${aggressionLabel(opponentAggression)}`} />
      </div>
      <span className="duel-brief-hint">{t('brief.tap')}</span>
    </button>
  )
}
