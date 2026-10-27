import { forecast, squareLuminance } from '../../engine/rules/luminance'
import type { GameState } from '../../engine/rules/types'
import { lumColor } from '../board/lumColor'

export function Dial({ state }: { state: GameState }) {
  const now = squareLuminance(state, { x: 3, y: 3 })
  const next = forecast(state, 3)
  return (
    <header className="hud">
      <div className="hud-round">
        {state.eclipse ? 'Eclipse' : `Round ${Math.min(state.round, state.config.eclipseRound)} / ${state.config.eclipseRound}`}
        <span className={`turn turn-${state.turn}`}>{state.turn === 'solari' ? 'Solari' : 'Umbral'} to move</span>
      </div>
      <div className="dial" aria-label="Luminance dial">
        <span className="dial-now" style={{ background: lumColor(now) }}>{now > 0 ? `+${now}` : now}</span>
        {next.map((l, i) => (
          <span key={i} className="dial-next" style={{ background: lumColor(l) }}>{l > 0 ? `+${l}` : l}</span>
        ))}
      </div>
    </header>
  )
}
