import { useEffect, useMemo, useRef, useState } from 'react'
import { requestJudgement } from '../../ai/client'
import { describeHint } from '../../ai/hint'
import { EVAL_CAP, finalEval, GRADE_TEXT, keyMoments, reviewGame, summarise, type MoveReview, type SideSummary } from '../../ai/review'
import type { GameRecord } from '../../engine/log'
import { replaySteps } from '../../engine/log'
import type { Court, GameState } from '../../engine/rules/types'
import { Board } from '../board/Board'
import { Dial } from '../dial/Dial'
import { canRecordClip, cardClip, cardImage } from '../../shareCard'
import { saveBlob } from '../../saveFile'
import { Icon } from './icons'
import { t } from '../../i18n'
import { TipCard } from '../tips/TipCard'

interface Props {
  record: GameRecord
  /** Start playing at once, as a replay opened from a link does. */
  autoplay?: boolean
  /** A spectator's view from a watch link: says so, and leaves out playing on from a position. */
  watch?: boolean
  onBack: () => void
  /** Take over the game from the position on show, as `court`; the replay offers it for a position still in play. */
  onPlayOn?: (state: GameState, court: Court) => void
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
  // The Start, Prev, Play and Next buttons are the keyboard way through the game; the bar is a pointer scrub.
  return (
    // oxlint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions
    <svg className="eval-bar" viewBox={`0 0 ${n} 20`} preserveAspectRatio="none" role="img"
      aria-label={t('replay.evalLabel')}
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
export function Replay({ record, autoplay, watch, onBack, onPlayOn, onReviewed }: Props) {
  const steps = useMemo(() => replaySteps(record.initial, record.actions) ?? [{ state: record.initial, action: null }], [record])
  const last = steps.length - 1
  const [at, setAt] = useState(0)
  const [playing, setPlaying] = useState(!!autoplay)
  const [saving, setSaving] = useState<'card' | 'clip' | null>(null)
  const [saveNote, setSaveNote] = useState<string | null>(null)
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

  const save = async (kind: 'card' | 'clip') => {
    setPlaying(false)
    setSaving(kind)
    setSaveNote(null)
    try {
      const blob = await (kind === 'card' ? cardImage(record) : cardClip(record))
      if (!blob) setSaveNote(t('replay.cannotMake'))
      else setSaveNote(saveBlob(blob, kind === 'card' ? 'eclipse-court.png' : 'eclipse-court.webm') ? t('replay.saved') : t('replay.cannotSave'))
    } catch {
      setSaveNote(t('replay.cannotMake'))
    }
    setSaving(null)
  }

  const running = playing && at < last
  useEffect(() => {
    if (!running) return
    const timer = setTimeout(() => setAt((i) => i + 1), STEP_MS)
    return () => clearTimeout(timer)
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
    ? t('replay.opening')
    : action?.type === 'cast' ? t('replay.cast', { mover, spell: action.spell })
      : action?.type === 'pass' ? t('replay.pass', { mover })
        : state.lastDuel ? t('replay.attack', { mover, result: state.lastDuel.defenderHp <= 0 ? t('replay.defenderFell') : state.lastDuel.attackerHp <= 0 ? t('replay.attackerFell') : t('replay.draw') })
          : t('replay.moved', { mover })
  const sides = phase === 'idle' ? null : (['solari', 'umbral'] as const).map((c) => ({ court: c, ...summarise(reviews, c) }))
  const status = showBetter && bestHint
    ? t('replay.better', { headline: bestHint.headline, detail: bestHint.detail })
    : `${t('replay.position', { round: state.round, at, last })} ${caption}${at === last && state.winner ? ` ${state.winner === 'draw' ? t('replay.drawn') : t('replay.won', { court: state.winner })}` : ''}`
  return (
    <main className="app">
      <Dial state={state} />
      <Board state={state} selected={null} moves={[]} onSquare={() => {}}
        focus={!showBetter && to ? { mover: action && action.type === 'move' ? action.pieceId : undefined } : undefined}
        hint={showBetter && bestHint ? { from: bestHint.from, to: bestHint.to, square: bestHint.square, pieceId: bestHint.mover } : to ? { to } : undefined} />
      {watch && <p className="tagline" role="status">{t('replay.watching')}</p>}
      <p className="status">{status}</p>
      {mine && (
        <p className={`review-note grade-${mine.grade}`} role="status">
          <strong>{GRADE_TEXT[mine.grade]}</strong>
          {flagged ? t('replay.gaveUp', { points: mine.loss.toFixed(1) }) : '. '}
          {flagged && <button className="link" onClick={() => setBetter((b) => !b)}>{showBetter ? t('replay.backToGame') : t('replay.showBetter')}</button>}
        </p>
      )}
      {phase !== 'idle' && <EvalBar values={evals} at={at} onPick={(i) => { setPlaying(false); setBetter(false); setAt(i) }} />}
      {phase === 'running' && <p className="status" role="status">{t('replay.reviewing', { done: reviews.filter(Boolean).length, total: last })}</p>}
      {notes.length > 0 && <div className="setup-card" role="status">{notes.map((line) => <div key={line}>{line}</div>)}</div>}
      {sides && (
        <div className="setup-card review-summary">
          {sides.map((side) => (
            <div key={side.court}>
              <strong>{side.court === 'solari' ? 'Solari' : 'Umbral'}</strong>: {t('replay.summary', { accuracy: side.accuracy, best: side.counts.best, inaccuracy: side.counts.inaccuracy, mistake: side.counts.mistake, blunder: side.counts.blunder })}
            </div>
          ))}
        </div>
      )}
      <div className="buttons">
        <button disabled={at === 0} onClick={() => { setPlaying(false); setBetter(false); setAt(0) }}><Icon name="replay" />{t('replay.start')}</button>
        <button disabled={at === 0} onClick={() => { setPlaying(false); setBetter(false); setAt((i) => i - 1) }}><Icon name="stepBack" />{t('replay.prev')}</button>
        <button className={running ? 'on' : ''} disabled={at >= last} onClick={() => setPlaying((p) => !p)}><Icon name="play" />{running ? t('replay.pause') : t('replay.play')}</button>
        <button disabled={at >= last} onClick={() => { setPlaying(false); setBetter(false); setAt((i) => i + 1) }}><Icon name="stepNext" />{t('replay.next')}</button>
        <button onClick={onBack}><Icon name="exit" />{t('replay.close')}</button>
      </div>
      {last > 0 && (
        <div className="buttons">
          {phase === 'idle' && <button className="primary" onClick={review}><Icon name="flame" />{t('replay.review')}</button>}
          {phase === 'running' && <button onClick={cancel}><Icon name="exit" />{t('replay.stopReview')}</button>}
          {phase !== 'idle' && <button disabled={prevMoment === undefined} onClick={() => jump(prevMoment!)}><Icon name="keyBack" />{t('replay.prevKey')}</button>}
          {phase !== 'idle' && <button disabled={nextMoment === undefined} onClick={() => jump(nextMoment!)}><Icon name="keyNext" />{t('replay.nextKey')}</button>}
        </div>
      )}
      <div className="buttons">
        <button disabled={saving !== null} onClick={() => void save('card')}><Icon name="chain" />{saving === 'card' ? t('replay.drawing') : t('replay.saveCard')}</button>
        {canRecordClip() && <button disabled={saving !== null} onClick={() => void save('clip')}><Icon name="play" />{saving === 'clip' ? t('replay.recording') : t('replay.saveClip')}</button>}
      </div>
      {onPlayOn && !steps[at].state.winner && (
        <div className="buttons">
          <button onClick={() => onPlayOn(steps[at].state, steps[at].state.turn)}><Icon name="swords" />{t('replay.playOn')}</button>
        </div>
      )}
      {saveNote && <p className="status" role="status">{saveNote}</p>}
      <TipCard page="replay" float />
    </main>
  )
}
