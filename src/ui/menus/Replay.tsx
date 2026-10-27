import { useEffect, useState } from 'react'
import type { GameRecord } from '../../engine/log'
import { replaySteps } from '../../engine/log'
import type { Court } from '../../engine/rules/types'
import { Board } from '../board/Board'
import { Dial } from '../dial/Dial'
import { Icon } from './icons'

interface Props {
  record: GameRecord
  onBack: () => void
}

const STEP_MS = 900

/** A finished game played back from its action log, one position at a time. */
export function Replay({ record, onBack }: Props) {
  const steps = replaySteps(record.initial, record.actions) ?? [{ state: record.initial, action: null }]
  const last = steps.length - 1
  const [at, setAt] = useState(0)
  const [playing, setPlaying] = useState(false)

  const running = playing && at < last
  useEffect(() => {
    if (!running) return
    const t = setTimeout(() => setAt((i) => i + 1), STEP_MS)
    return () => clearTimeout(t)
  }, [running, at])

  const { state, action } = steps[at]
  const mover: Court = at > 0 ? steps[at - 1].state.turn : state.turn
  const to = action && action.type === 'move' ? action.to : undefined
  const caption = at === 0
    ? 'The opening position.'
    : action?.type === 'cast' ? `${mover} cast ${action.spell}.`
      : action?.type === 'pass' ? `${mover} ended the turn.`
        : state.lastDuel ? `${mover} attacked; ${state.lastDuel.defenderHp <= 0 ? 'the defender fell' : state.lastDuel.attackerHp <= 0 ? 'the attacker fell' : 'a draw'}.`
          : `${mover} moved.`
  return (
    <main className="app">
      <Dial state={state} />
      <Board state={state} selected={null} moves={[]} onSquare={() => {}}
        focus={to ? { mover: action && action.type === 'move' ? action.pieceId : undefined } : undefined}
        hint={to ? { to } : undefined} />
      <p className="status">Round {state.round}, move {at} of {last}. {caption}{at === last && state.winner ? ` ${state.winner === 'draw' ? 'Draw.' : `${state.winner} won.`}` : ''}</p>
      <div className="buttons">
        <button disabled={at === 0} onClick={() => { setPlaying(false); setAt(0) }}><Icon name="replay" />Start</button>
        <button disabled={at === 0} onClick={() => { setPlaying(false); setAt((i) => i - 1) }}><Icon name="back" />Prev</button>
        <button className={running ? 'on' : ''} disabled={at >= last} onClick={() => setPlaying((p) => !p)}><Icon name="play" />{running ? 'Pause' : 'Play'}</button>
        <button disabled={at >= last} onClick={() => { setPlaying(false); setAt((i) => i + 1) }}><Icon name="next" />Next</button>
        <button onClick={onBack}><Icon name="exit" />Close</button>
      </div>
    </main>
  )
}
