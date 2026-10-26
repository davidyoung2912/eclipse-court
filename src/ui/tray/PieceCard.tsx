import { ROLE_INFO, courtFight } from '../../engine/data/pieceInfo'
import { ROLE_NAMES } from '../../engine/data/roster'
import { styleOf } from '../../engine/duel/sim'
import { isBeacon } from '../../engine/rules/board'
import { favouredCourt, squareLuminance } from '../../engine/rules/luminance'
import type { GameState, Piece } from '../../engine/rules/types'

interface Props {
  state: GameState
  /** The piece being shown; null shows a hint instead. */
  piece: Piece | null
  /** The player's court, to say whether a shown piece is theirs. */
  human: Piece['court']
  hint: string
}

const stars = (n: number, max = 5) => '●'.repeat(Math.min(max, Math.max(1, Math.round(n)))) + '○'.repeat(Math.max(0, max - Math.max(1, Math.round(n))))

/** Summary of a tapped piece: who it is, how it moves, how it fights and what state it is in. */
export function PieceCard({ state, piece, human, hint }: Props) {
  if (!piece) return <section className="piece-card empty" aria-live="polite"><p>{hint}</p></section>
  const info = ROLE_INFO[piece.role]
  const st = styleOf(piece.role)
  const lum = squareLuminance(state, piece.pos)
  const favoured = favouredCourt(lum)
  const note = [
    isBeacon(piece.pos) ? 'On a beacon: untargetable by spells, heals +1 per round' : '',
    piece.bound ? 'Bound: cannot move this turn' : '',
    piece.hp < piece.maxHp ? 'Wounded: heals 1 every 2 rounds it stays still' : '',
    favoured === piece.court ? 'The light favours it here' : favoured ? 'The light works against it here' : '',
  ].filter(Boolean)
  return (
    <section className={`piece-card ${piece.court}`} aria-live="polite">
      <header>
        <b>{ROLE_NAMES[piece.court][piece.role]}</b>
        <span>{info.label} · {piece.court === 'solari' ? 'Solari' : 'Umbral'}{piece.court === human ? '' : ' (enemy)'}</span>
      </header>
      <dl>
        <dt>Health</dt><dd>{piece.hp} / {piece.maxHp}</dd>
        <dt>Moves</dt><dd>{info.move}</dd>
        <dt>Duel</dt><dd>{info.fight} {courtFight(piece.court, piece.role)}</dd>
        <dt>Power</dt><dd className="dots">{stars(st.damage * 2)}</dd>
        <dt>Speed</dt><dd className="dots">{stars(st.speed * 1.2)}</dd>
      </dl>
      {note.length > 0 && <p className="piece-note">{note.join(' · ')}</p>}
    </section>
  )
}
