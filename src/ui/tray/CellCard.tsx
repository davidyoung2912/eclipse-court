import { CELL_INFO, cellAt } from '../../engine/rules/cells'
import { centerOf, chebyshev, isBeacon, isBlocked, isCycling, sizeOf } from '../../engine/rules/board'
import { safeRadius } from '../../engine/rules/events'
import { duelMods, favouredCourt, squareLuminance } from '../../engine/rules/luminance'
import type { GameState, Pos } from '../../engine/rules/types'

interface Props {
  state: GameState
  pos: Pos
}

const LIGHT_NAMES: Record<number, string> = { [-2]: 'Deep dark', [-1]: 'Dim', 0: 'Dusk', 1: 'Lit', 2: 'Full light' }

/** Summary of a tapped empty square: its light, any cell effect, and the terrain on it. */
export function CellCard({ state, pos }: Props) {
  const lum = squareLuminance(state, pos)
  const favoured = favouredCourt(lum)
  const cell = cellAt(state.config, pos)
  const radius = safeRadius(state)
  const duel = favoured ? duelMods(favoured, lum) : null
  const terrain = [
    isBlocked(state.config, pos) ? 'A wall: nothing can enter' : '',
    isBeacon(pos, state.config.beacons) ? 'Beacon: spell-proof, heals +1' : '',
    radius !== null && chebyshev(pos, centerOf(sizeOf(state.config))) > radius ? 'Eclipse zone: 3 damage each round' : '',
    isCycling(pos, sizeOf(state.config)) ? 'The light here shifts every round' : 'The light here never changes',
  ].filter(Boolean)
  return (
    <section className={`piece-card cell-card${favoured ? ` ${favoured}` : ''}`} aria-live="polite">
      <header>
        <b>Empty square</b>
        <span>{LIGHT_NAMES[lum]}{lum ? ` (${lum > 0 ? '+' : '−'}${Math.abs(lum)})` : ''}</span>
      </header>
      <p><i>Light</i>{duel && favoured
        ? `Favours ${favoured === 'solari' ? 'Solari' : 'Umbral'}: +${Math.round((duel.dealt - 1) * 100)}% damage dealt, −${Math.round((1 - duel.taken) * 100)}% taken`
        : 'Favours neither court'}</p>
      <p><i>Cell</i>{cell ? `${CELL_INFO[cell].name}: ${CELL_INFO[cell].text}` : 'No special effect'}</p>
      <p><i>Terrain</i>{terrain.join(' · ')}</p>
    </section>
  )
}
