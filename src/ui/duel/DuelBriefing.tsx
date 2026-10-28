import { ROLE_NAMES } from '../../engine/data/roster'
import { ROLE_INFO } from '../../engine/data/pieceInfo'
import { createFighter, styleOf } from '../../engine/duel/duel'
import { rankOf } from '../../engine/rules/growth'
import type { DuelCells } from '../../engine/rules/cells'
import type { Piece } from '../../engine/rules/types'

const KIND_LABEL = { swing: 'Swing', slam: 'Slam', shot: 'Shot', pulse: 'Pulse', rush: 'Rush' } as const

/** Plain-words read on the AI fighter's duel skill. */
const skillLabel = (s: number) => (s < 0.25 ? 'Clumsy' : s < 0.5 ? 'Steady' : s < 0.75 ? 'Sharp' : 'Deadly')
const aggressionLabel = (a: number) => (a < 0.4 ? 'Cautious' : a < 0.75 ? 'Balanced' : 'Relentless')
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
      <div className="duel-brief-hp" aria-label={`${piece.hp} of ${piece.maxHp} health`}>
        <span style={{ width: `${Math.round((piece.hp / piece.maxHp) * 100)}%` }} />
      </div>
      <dl>
        <dt>Health</dt><dd>{Math.round(piece.hp * 10) / 10} / {piece.maxHp}</dd>
        <dt>Attack</dt><dd>{KIND_LABEL[st.kind]}</dd>
        <dt>Damage</dt><dd>{pct(f.dealt)}</dd>
        <dt>Takes</dt><dd>{pct(f.taken)}</dd>
        <dt>Speed</dt><dd>{st.speed.toFixed(1)}</dd>
      </dl>
    </div>
  )
}

export function DuelBriefing({ mine, foe, luminance, cells, playerSide, opponentSkill, opponentAggression, onContinue }: Props) {
  const mineCell = cells && (playerSide === 0 ? cells.attacker : cells.defender)
  const foeCell = cells && (playerSide === 0 ? cells.defender : cells.attacker)
  return (
    <button type="button" className="duel-brief" onClick={onContinue} aria-label="Fight summary, tap to start the countdown">
      <div className="duel-brief-cards">
        <Card piece={mine} who="You" cell={mineCell} luminance={luminance} />
        <Card piece={foe} who="Opponent" cell={foeCell} luminance={luminance} ai={`${skillLabel(opponentSkill)}, ${aggressionLabel(opponentAggression)}`} />
      </div>
      <span className="duel-brief-hint">Tap to start</span>
    </button>
  )
}
