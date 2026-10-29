import { CELL_INFO, cellAt } from '../../engine/rules/cells'
import { centerOf, chebyshev, isBeacon, isBlocked, isCycling, sizeOf } from '../../engine/rules/board'
import { safeRadius } from '../../engine/rules/events'
import { duelMods, favouredCourt, squareLuminance } from '../../engine/rules/luminance'
import type { GameState, Pos } from '../../engine/rules/types'
import { t, type StringKey } from '../../i18n'

interface Props {
  state: GameState
  pos: Pos
}

const LIGHT_NAMES: Record<number, StringKey> = { [-2]: 'tray.lightDeep', [-1]: 'tray.lightDim', 0: 'tray.lightDusk', 1: 'tray.lightLit', 2: 'tray.lightFull' }

/** Summary of a tapped empty square: its light, any cell effect, and the terrain on it. */
export function CellCard({ state, pos }: Props) {
  const lum = squareLuminance(state, pos)
  const favoured = favouredCourt(lum)
  const cell = cellAt(state.config, pos)
  const radius = safeRadius(state)
  const duel = favoured ? duelMods(favoured, lum) : null
  const terrain = [
    isBlocked(state.config, pos) ? t('tray.wall') : '',
    isBeacon(pos, state.config.beacons) ? t('tray.beaconNote') : '',
    radius !== null && chebyshev(pos, centerOf(sizeOf(state.config))) > radius ? t('tray.eclipseZone') : '',
    isCycling(pos, sizeOf(state.config)) ? t('tray.lightShifts') : t('tray.lightFixed'),
  ].filter(Boolean)
  return (
    <section className={`piece-card cell-card${favoured ? ` ${favoured}` : ''}`} aria-live="polite">
      <header>
        <b>{t('tray.emptySquare')}</b>
        <span>{t(LIGHT_NAMES[lum])}{lum ? ` (${lum > 0 ? '+' : '−'}${Math.abs(lum)})` : ''}</span>
      </header>
      <p><i>{t('tray.light')}</i>{duel && favoured
        ? t('tray.favours', { court: favoured === 'solari' ? 'Solari' : 'Umbral', dealt: Math.round((duel.dealt - 1) * 100), taken: Math.round((1 - duel.taken) * 100) })
        : t('tray.favoursNeither')}</p>
      <p><i>{t('tray.cell')}</i>{cell ? `${CELL_INFO[cell].name}: ${CELL_INFO[cell].text}` : t('tray.noEffect')}</p>
      <p><i>{t('tray.terrain')}</i>{terrain.join(' · ')}</p>
    </section>
  )
}
