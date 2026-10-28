import { useState } from 'react'
import { Icon } from '../menus/icons'
import {
  TUTORIAL_FOE_AT, TUTORIAL_KNIGHT, TUTORIAL_STEP_TO, TUTORIAL_STEPS, tutorialStart,
} from '../../engine/data/tutorial'
import { estimateOdds, reduce } from '../../engine/reducer'
import { samePos } from '../../engine/rules/board'
import { squareLuminance } from '../../engine/rules/luminance'
import { legalMoves, pieceAt } from '../../engine/rules/moves'
import { spellTargets } from '../../engine/rules/spells'
import type { DuelOutcome, GameState, Pos, Spell } from '../../engine/rules/types'
import { sfx } from '../../audio/synth'
import { Board } from '../board/Board'
import { Dial } from '../dial/Dial'
import { DuelView } from '../duel/DuelView'
import { AttackConfirm } from '../tray/AttackConfirm'
import { DuelResult } from '../tray/DuelResult'
import { CellCard } from '../tray/CellCard'
import { PieceCard } from '../tray/PieceCard'
import { SpellBar } from '../tray/SpellBar'
import { BackButton } from '../menus/BackButton'

interface Props {
  onExit: () => void
}

type Duel = 'confirm' | 'live' | 'result' | null

/** The 3-minute guided board: the rules in short steps, with a real move, duel and spell. */
export function Tutorial({ onExit }: Props) {
  const [state, setState] = useState<GameState>(tutorialStart)
  const [step, setStep] = useState(0)
  const [selected, setSelected] = useState(false)
  /** The piece whose card an `info` step is showing, as in play when a piece is tapped off-turn. */
  const [inspectId, setInspectId] = useState<string | null>(null)
  /** An empty square being inspected; its card shows the light and any cell effect there. */
  const [inspectSq, setInspectSq] = useState<Pos | null>(null)
  const [duel, setDuel] = useState<Duel>(null)
  const [casting, setCasting] = useState<Spell | null>(null)
  const [outcome, setOutcome] = useState<DuelOutcome | null>(null)
  const current = TUTORIAL_STEPS[step]
  const knight = state.pieces.find((p) => p.id === TUTORIAL_KNIGHT) ?? null
  const foe = pieceAt(state, TUTORIAL_FOE_AT)
  const inspected = state.pieces.find((p) => p.id === inspectId)
  const shown = selected ? knight : inspected ?? null
  const targets = casting ? spellTargets(state, 'solari', casting) : null

  /** Play the scripted Umbral reply: it simply passes, which ends the round. */
  const next = (s: GameState) => {
    setState(s.winner ? s : reduce(s, { type: 'pass' }))
    setSelected(false)
    setInspectId(null)
    setInspectSq(null)
    setDuel(null)
    setCasting(null)
    setStep((n) => n + 1)
  }

  const moves: Pos[] =
    targets ? targets.squares
    : current.kind === 'move' && selected ? [TUTORIAL_STEP_TO]
    : current.kind === 'duel' && selected && knight ? legalMoves(state, knight).filter((m) => samePos(m, TUTORIAL_FOE_AT))
    : []

  const onSquare = (p: Pos) => {
    if (duel) return
    if (current.kind === 'info' || current.kind === 'end') {
      const occ = pieceAt(state, p)
      setInspectSq(occ ? null : p)
      return setInspectId(occ ? occ.id : null)
    }
    if (current.kind === 'move') {
      if (knight && samePos(p, knight.pos)) return setSelected(true)
      if (selected && samePos(p, TUTORIAL_STEP_TO)) {
        sfx.move()
        next(reduce(state, { type: 'move', pieceId: TUTORIAL_KNIGHT, to: p }))
      }
    } else if (current.kind === 'duel' && knight) {
      if (samePos(p, knight.pos)) return setSelected(true)
      if (selected && foe && samePos(p, foe.pos)) setDuel('confirm')
    } else if (current.kind === 'spell' && casting === 'blink' && targets?.squares.some((q) => samePos(q, p))) {
      sfx.cast()
      next(reduce(state, { type: 'cast', spell: 'blink', to: p }))
    }
  }

  const finishDuel = (result: DuelOutcome) => {
    setOutcome(result)
    setDuel('result')
  }

  return (
    <main className="app tutorial">
      <Dial state={state} />
      <Board state={state} selected={selected ? knight : (inspected ?? null)} moves={moves} onSquare={onSquare} />
      {duel === 'confirm' && knight && foe && (
        <AttackConfirm attacker={knight} defender={foe} live luminance={squareLuminance(state, foe.pos)}
          odds={estimateOdds(knight, foe, squareLuminance(state, foe.pos))}
          onConfirm={() => setDuel('live')} onCancel={() => setDuel(null)} />
      )}
      {duel === 'live' && knight && foe && (
        <DuelView attacker={knight} defender={foe} luminance={squareLuminance(state, foe.pos)}
          options={{ mirror: false, aimAssist: true, haptics: true }} opponentSkill={0.15}
          seed={7} onDone={finishDuel} />
      )}
      {duel === 'result' && knight && foe && outcome && (
        <DuelResult attacker={knight} defender={foe} outcome={outcome}
          onContinue={() => next(reduce(state, { type: 'move', pieceId: TUTORIAL_KNIGHT, to: TUTORIAL_FOE_AT, duel: outcome }))} />
      )}
      {!shown && inspectSq
        ? <CellCard state={state} pos={inspectSq} />
        : <PieceCard state={state} human="solari" piece={shown} hint="Tap any piece to read its card." />}
      <footer className="tray">
        <section className="lesson" aria-live="polite">
          {/* Every step is laid out in one cell and only the current one shows, so the card keeps the tallest step's height and the board never shifts. */}
          {TUTORIAL_STEPS.map((s, i) => (
            <div key={s.title} className={i === step ? undefined : 'lesson-hidden'} aria-hidden={i === step ? undefined : true}>
              <h2>{s.title}</h2>
              <p>{s.text}</p>
            </div>
          ))}
        </section>
        {current.kind === 'spell' && <SpellBar state={state} active={casting} onPick={setCasting} />}
        <div className="buttons">
          {current.kind === 'end' ? <BackButton onClick={onExit} /> : <button onClick={onExit}><Icon name="skip" />Skip</button>}
          {current.kind === 'info' && <button className="primary" onClick={() => { setInspectId(null); setInspectSq(null); setStep(step + 1) }}><Icon name="check" />Got It</button>}
          {current.kind === 'end' && <button className="primary" onClick={onExit}><Icon name="play" />Play</button>}
        </div>
      </footer>
    </main>
  )
}
