import type { TurnClock } from '../../engine/rules/types'
import { readClock } from '../../clock'

interface Props {
  clock: TurnClock
  elapsedMs: number
  bankMs: number
  /** Whose turn it is, for the colour. */
  court: 'solari' | 'umbral'
  /** The clock is stopped (a duel, a dialog or the AI's turn). */
  paused: boolean
}

const R = 16
const C = 2 * Math.PI * R

/** A countdown ring: it drains over the turn's allowance, shows the seconds left in all, and pulses at the end. */
export function ClockRing({ clock, elapsedMs, bankMs, court, paused }: Props) {
  const r = readClock(clock, elapsedMs, bankMs)
  const fraction = Math.min(1, r.turn / clock.seconds)
  return (
    <div className={`clock-ring ${court}${r.urgent ? ' urgent' : ''}${paused ? ' paused' : ''}`} role="timer" aria-label={`${r.total} seconds left`}>
      <svg viewBox="-20 -20 40 40" aria-hidden="true">
        <circle className="clock-track" r={R} />
        <circle className="clock-arc" r={R} strokeDasharray={C} strokeDashoffset={C * (1 - fraction)} transform="rotate(-90)" />
      </svg>
      <span>{r.total}</span>
      {r.turn === 0 && bankMs > 0 && <small>extra</small>}
    </div>
  )
}
