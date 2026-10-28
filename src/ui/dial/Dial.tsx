import { memo, type CSSProperties } from 'react'
import { eventAt, EVENT_INFO, HILL_TURNS, modeOf, nextEvent, objectiveGoal, objectiveRounds, safeRadius, SCORE_TARGET } from '../../engine/rules/events'
import { centerOf, sizeOf } from '../../engine/rules/board'
import { forecast, squareLuminance } from '../../engine/rules/luminance'
import type { GameState } from '../../engine/rules/types'
import { t } from '../../i18n'
import { eclipseIn } from '../board/aids'
import { lumColor } from '../board/lumColor'
import { hourStrip } from './hourStrip'

export const Dial = memo(function Dial({ state, chip }: { state: GameState; chip?: boolean }) {
  const now = squareLuminance(state, centerOf(sizeOf(state.config)))
  const next = forecast(state, 3)
  const notes = hudNotes(state)
  const left = chip ? eclipseIn(state) : null
  const { hour, at } = hourStrip(state)
  return (
    <header className={`hud hud-${hour}`}>
      <div className="hud-round">
        {state.eclipse ? 'Eclipse' : `Round ${Math.min(state.round, state.config.eclipseRound)} / ${state.config.eclipseRound}`}
        <span key={state.turn} className={`turn turn-${state.turn}`}>{state.turn === 'solari' ? 'Solari' : 'Umbral'} to move</span>
        {left !== null && <span className={`eclipse-chip${left === 1 ? ' soon' : ''}`} role="status" aria-live="polite">{left === 1 ? t('eclipse.chipNext') : t('eclipse.chip', { count: left })}</span>}
        {notes.length > 0 && <span className="hud-note">{notes.join(' · ')}</span>}
      </div>
      <div className="dial" aria-label="Luminance dial">
        <span className="dial-now" style={{ background: lumColor(now) }}>{now > 0 ? `+${now}` : now}</span>
        {next.map((l, i) => (
          <span key={i} className="dial-next" style={{ background: lumColor(l) }}>{l > 0 ? `+${l}` : l}</span>
        ))}
      </div>
      <div className="hour-strip" aria-hidden="true" style={{ '--at': at } as CSSProperties}>
        <i className="hour-mark" />
        <b className="hour-end" />
      </div>
    </header>
  )
})

/** Short status lines for whatever the match adds to the classic game: its goal, an event, the closing safe zone. */
function hudNotes(state: GameState): string[] {
  const { config } = state
  const notes: string[] = []
  const mode = modeOf(config)
  const { objective } = config
  if (objective) {
    const left = objectiveRounds(objective) - state.round + 1
    notes.push(`${objectiveGoal(objective)} (${left} ${left === 1 ? 'round' : 'rounds'} left)`)
    if (objective.kind === 'hold') notes.push(`Held ${state.streak.solari} of ${objective.turns} turns`)
  } else if (mode === 'leader') notes.push('Defeat the enemy Leader')
  else if (mode === 'score') notes.push(`Score ${state.score.solari}–${state.score.umbral} of ${SCORE_TARGET}`)
  else if (mode === 'hill') notes.push(`Hill ${state.streak.solari}–${state.streak.umbral} of ${HILL_TURNS}`)
  const event = eventAt(config, state.round)
  const next = nextEvent(state)
  if (event) notes.push(`${EVENT_INFO[event].name}: ${EVENT_INFO[event].text}`)
  else if (next) notes.push(`${EVENT_INFO[next.event].name} ${next.in === 1 ? 'next round' : 'in 2 rounds'}`)
  if (state.mayhemNote) notes.push(state.mayhemNote)
  const radius = safeRadius(state)
  if (radius !== null) notes.push(radius === 0 ? 'Only the centre is safe' : `Safe zone: ${radius} from the centre`)
  return notes
}
