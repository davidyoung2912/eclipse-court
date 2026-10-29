import { ROLE_INFO, courtFight, courtPassive } from '../../engine/data/pieceInfo'
import { ROLE_NAMES } from '../../engine/data/roster'
import { styleOf } from '../../engine/duel/duel'
import { PERK_INFO, rankOf } from '../../engine/rules/growth'
import { CELL_INFO, cellAt } from '../../engine/rules/cells'
import { isBeacon } from '../../engine/rules/board'
import { favouredCourt, squareLuminance } from '../../engine/rules/luminance'
import type { GameState, Piece } from '../../engine/rules/types'
import { t } from '../../i18n'

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
  const note =
    piece.bound ? t('tray.bound')
      : piece.shrouded ? t('tray.shrouded')
      : isBeacon(piece.pos, state.config.beacons) ? t('tray.beaconNote')
        : piece.hp < piece.maxHp ? t('tray.wounded')
          : favoured === piece.court ? t('tray.lightFavours')
            : favoured ? t('tray.lightAgainst') : ''
  const cell = cellAt(state.config, piece.pos)
  const gift = state.config.passives ? courtPassive(piece.court, piece.role) : ''
  const rank = rankOf(piece)
  const record = state.config.growth
    ? `${t('tray.duelWins', { count: piece.wins ?? 0 })}${rank === 'recruit' ? '' : ` · ${rank === 'elite' ? t('tray.elite') : t('tray.veteran')}`}${piece.perk ? ` · ${PERK_INFO[piece.perk].name}: ${PERK_INFO[piece.perk].text}` : ''}`
    : ''
  const duel = [info.fight, courtFight(piece.court, piece.role)].filter(Boolean).join(' · ')
  return (
    <section className={`piece-card ${piece.court}`} aria-live="polite">
      <header>
        <b>{ROLE_NAMES[piece.court][piece.role]}</b>
        <span>{info.label} · {piece.court === 'solari' ? 'Solari' : 'Umbral'}{piece.court === human ? '' : t('tray.enemyTag')}</span>
        <em>{t('tray.hpLabel', { hp: piece.hp, max: piece.maxHp })}</em>
      </header>
      <p><i>{t('tray.moves')}</i>{info.move}</p>
      <p><i>{t('tray.duel')}</i>{duel}</p>
      {cell && <p><i>{t('tray.cell')}</i>{CELL_INFO[cell].name}: {CELL_INFO[cell].text}</p>}
      {gift && <p><i>{t('tray.gift')}</i>{gift}</p>}
      {record && <p><i>{t('tray.record')}</i>{record}</p>}
      <p className="piece-stats">
        <i>{t('tray.power')}</i><span className="dots">{stars(st.damage * 2)}</span>
        <i>{t('tray.speed')}</i><span className="dots">{stars(st.speed * 1.2)}</span>
        {note && <small>{note}</small>}
      </p>
    </section>
  )
}
