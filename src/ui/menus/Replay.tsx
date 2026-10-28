import { useEffect, useMemo, useRef, useState } from 'react'
import { requestJudgement } from '../../ai/client'
import { describeHint } from '../../ai/hint'
import { EVAL_CAP, finalEval, GRADE_TEXT, keyMoments, reviewGame, summarise, type MoveReview, type SideSummary } from '../../ai/review'
import type { GameRecord } from '../../engine/log'
import { replaySteps } from '../../engine/log'
import type { Court } from '../../engine/rules/types'
import { Board } from '../board/Board'
import { Dial } from '../dial/Dial'
import { Icon } from './icons'
import { TipCard } from '../tips/TipCard'

interface Props {
  record: GameRecord
  onBack: () => void
  /** Called once when a review finishes, with each side's summary and the winner, if there was one. */
  onReviewed?: (sides: Record<Court, SideSummary>, winner: Court | 'draw' | null) => string[]
}

const STEP_MS = 900
/** How hard the review looks: the 'normal' search, quick enough to take a whole game in a few seconds. */
const REVIEW_DIFFICULTY = 'normal' as const

/** The evaluation over the game from Solari's side; click or tap a point to jump to that position. */
function EvalBar({ values, at, onPick }: { values: number[]; at: number; onPick: (i: number) => void }) {
  const n = Math.max(values.length - 1, 1)
  const y = (v: number) => 20 - ((v + EVAL_CAP) / (2 * EVAL_CAP)) * 20
  const line = values.map((v, i) => `${i},${y(v).toFixed(2)}`).join(' ')
  return (
    <svg className="eval-bar" viewBox={`0 0 ${n} 20`} preserveAspectRatio="none" role="img"
      aria-label="Evaluation over the game; higher favours Solari"
      onClick={(e) => {
        const box = e.currentTarget.getBoundingClientRect()
        onPick(Math.max(0, Math.min(values.length - 1, Math.round(((e.clientX - box.left) / box.width) * n))))
      }}>
      <rect x="0" y="0" width={n} height="10" className="eval-solari" />
      <rect x="0" y="10" width={n} height="10" className="eval-umbral" />
      <polyline points={line} className="eval-line" vectorEffect="non-scaling-stroke" />
      <line x1={at} x2={at} y1="0" y2="20" className="eval-now" vectorEffect="non-scaling-stroke" />
    </svg>
  )
}

/** A finished game played back from its action log, one position at a time. */
export function Replay({ record, onBack, onReviewed }: Props) {
  const steps = useMemo(() => replaySteps(record.initial, record.actions) ?? [{ state: record.initial, action: null }], [record])
  const last = steps.length - 1
  const [at, setAt] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [reviews, setReviews] = useState<(MoveReview | null)[]>([])
  const [phase, setPhase] = useState<'idle' | 'running' | 'done'>('idle')
  const [better, setBetter] = useState(false)
  const [notes, setNotes] = useState<string[]>([])
  const stop = useRef(false)
  useEffect(() => () => { stop.current = true }, [])

  const review = () => {
    stop.current = false
    setReviews(Array(last).fill(null))
    setPhase('running')
    setPlaying(false)
    void reviewGame(steps, (state, played) => requestJudgement(state, played, REVIEW_DIFFICULTY), (i, r) => {
      if (!stop.current) setReviews((prev) => prev.map((x, k) => (k === i ? r : x)))
    }, () => stop.current).then((done) => {
      if (stop.current) return
      setPhase('done')
      setNotes(onReviewed?.({ solari: summarise(done, 'solari'), umbral: summarise(done, 'umbral') }, steps[last].state.winner) ?? [])
    })
  }
  const cancel = () => { stop.current = true; setPhase('idle'); setReviews([]); setNotes([]); setBetter(false) }

  const running = playing && at < last
  useEffect(() => {
    if (!running) return
    const t = setTimeout(() => setAt((i) => i + 1), STEP_MS)
    return () => clearTimeout(t)
  }, [running, at])

  const mine = phase !== 'idle' && at > 0 ? reviews[at - 1] : null
  const flagged = !!mine && mine.grade !== 'best' && mine.grade !== 'good'
  const showBetter = better && flagged
  const { state, action } = steps[showBetter ? at - 1 : at]
  const bestHint = useMemo(() => (showBetter && mine ? describeHint(steps[at - 1].state, mine.best) : null), [showBetter, mine, steps, at])
  const moments = keyMoments(reviews)
  const jump = (index: number) => { setPlaying(false); setBetter(false); setAt(index + 1) }
  const prevMoment = [...moments].reverse().find((m) => m + 1 < at)
  const nextMoment = moments.find((m) => m + 1 > at)
  const evals = phase === 'idle' ? [] : [...reviews.map((r, i) => r?.evalBefore ?? (i > 0 ? reviews[i - 1]?.evalBefore ?? 0 : 0)), finalEval(steps)]
  const mover: Court = at > 0 ? steps[at - 1].state.turn : state.turn
  const to = action && action.type === 'move' ? action.to : undefined
  const caption = at === 0
    ? 'The opening position.'
    : action?.type === 'cast' ? `${mover} cast ${action.spell}.`
      : action?.type === 'pass' ? `${mover} ended the turn.`
        : state.lastDuel ? `${mover} attacked; ${state.lastDuel.defenderHp <= 0 ? 'the defender fell' : state.lastDuel.attackerHp <= 0 ? 'the attacker fell' : 'a draw'}.`
          : `${mover} moved.`
  const sides = phase === 'idle' ? null : (['solari', 'umbral'] as const).map((c) => ({ court: c, ...summarise(reviews, c) }))
  const status = showBetter && bestHint
    ? `A better move: ${bestHint.headline}. ${bestHint.detail}`
    : `Round ${state.round}, move ${at} of ${last}. ${caption}${at === last && state.winner ? ` ${state.winner === 'draw' ? 'Draw.' : `${state.winner} won.`}` : ''}`
  return (
    <main className="app">
      <Dial state={state} />
      <Board state={state} selected={null} moves={[]} onSquare={() => {}}
        focus={!showBetter && to ? { mover: action && action.type === 'move' ? action.pieceId : undefined } : undefined}
        hint={showBetter && bestHint ? { from: bestHint.from, to: bestHint.to, square: bestHint.square, pieceId: bestHint.mover } : to ? { to } : undefined} />
      <p className="status">{status}</p>
      {mine && (
        <p className={`review-note grade-${mine.grade}`} role="status">
          <strong>{GRADE_TEXT[mine.grade]}</strong>
          {flagged ? ` (gave up about ${mine.loss.toFixed(1)} points). ` : '. '}
          {flagged && <button className="link" onClick={() => setBetter((b) => !b)}>{showBetter ? 'Back to the game' : 'Show the better move'}</button>}
        </p>
      )}
      {phase !== 'idle' && <EvalBar values={evals} at={at} onPick={(i) => { setPlaying(false); setBetter(false); setAt(i) }} />}
      {phase === 'running' && <p className="status" role="status">Reviewing: move {reviews.filter(Boolean).length} of {last}.</p>}
      {notes.length > 0 && <div className="setup-card" role="status">{notes.map((line) => <div key={line}>{line}</div>)}</div>}
      {sides && (
        <div className="setup-card review-summary">
          {sides.map((side) => (
            <div key={side.court}>
              <strong>{side.court === 'solari' ? 'Solari' : 'Umbral'}</strong>: accuracy {side.accuracy}%, {side.counts.best} best, {side.counts.inaccuracy} inaccurate, {side.counts.mistake} mistakes, {side.counts.blunder} blunders.
            </div>
          ))}
        </div>
      )}
      <div className="buttons">
        <button disabled={at === 0} onClick={() => { setPlaying(false); setBetter(false); setAt(0) }}><Icon name="replay" />Start</button>
        <button disabled={at === 0} onClick={() => { setPlaying(false); setBetter(false); setAt((i) => i - 1) }}><Icon name="back" />Prev</button>
        <button className={running ? 'on' : ''} disabled={at >= last} onClick={() => setPlaying((p) => !p)}><Icon name="play" />{running ? 'Pause' : 'Play'}</button>
        <button disabled={at >= last} onClick={() => { setPlaying(false); setBetter(false); setAt((i) => i + 1) }}><Icon name="next" />Next</button>
        <button onClick={onBack}><Icon name="exit" />Close</button>
      </div>
      {last > 0 && (
        <div className="buttons">
          {phase === 'idle' && <button className="primary" onClick={review}><Icon name="flame" />Review Game</button>}
          {phase === 'running' && <button onClick={cancel}><Icon name="exit" />Stop Review</button>}
          {phase !== 'idle' && <button disabled={prevMoment === undefined} onClick={() => jump(prevMoment!)}><Icon name="back" />Prev Key Move</button>}
          {phase !== 'idle' && <button disabled={nextMoment === undefined} onClick={() => jump(nextMoment!)}><Icon name="next" />Next Key Move</button>}
        </div>
      )}
      <TipCard page="replay" float />
    </main>
  )
}
