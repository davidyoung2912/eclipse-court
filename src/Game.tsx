import { useEffect, useRef, useState } from 'react'
import { autoDuel } from './ai/autoDuel'
import { requestAction } from './ai/client'
import { isMuted, setMuted, sfx, turnBell } from './audio/synth'
import { AUTO_DUEL_SKILL, DIFFICULTY, type Difficulty } from './ai/profile'
import { estimateOdds, reduce } from './engine/reducer'
import { squareLuminance } from './engine/rules/luminance'
import { legalMoves, pieceAt } from './engine/rules/moves'
import { spellTargets } from './engine/rules/spells'
import type { Action, Court, DuelOutcome, GameState, Pos, Spell } from './engine/rules/types'
import { Board } from './ui/board/Board'
import { Dial } from './ui/dial/Dial'
import { DuelView, type DuelOptions } from './ui/duel/DuelView'
import { AttackConfirm } from './ui/tray/AttackConfirm'
import { SpellBar } from './ui/tray/SpellBar'

interface Props {
  human: Court
  difficulty: Difficulty
  initial: GameState
  onExit: (winner: GameState['winner']) => void
}

/** A capture waiting to be settled; `byAi` means the human is the defender. */
interface Pending {
  pieceId: string
  to: Pos
  confirmed: boolean
  byAi: boolean
}

type DuelMode = 'live' | 'auto'

const AI_DELAY_MS = 450

export function Game({ human, difficulty, initial, onExit }: Props) {
  const foe: Court = human === 'solari' ? 'umbral' : 'solari'
  const foeSkill = DIFFICULTY[difficulty].skill
  const foeAggression = DIFFICULTY[difficulty].aggression
  const [history, setHistory] = useState<GameState[]>([initial])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [options, setOptions] = useState<DuelOptions>({ mirror: false, aimAssist: true, haptics: true })
  const [duelMode, setDuelMode] = useState<DuelMode>('live')
  const [pending, setPending] = useState<Pending | null>(null)
  const [casting, setCasting] = useState<Spell | null>(null)
  const state = history[history.length - 1]
  const myTurn = state.turn === human
  const selected = state.pieces.find((p) => p.id === selectedId && p.court === human) ?? null
  const targets = casting && myTurn ? spellTargets(state, human, casting) : null
  const moves = targets ? targets.squares : selected && myTurn ? legalMoves(state, selected) : []

  const [sound, setSound] = useState(() => !isMuted())
  const lastTurn = useRef(state.turn)

  // Each court's bell rings as its turn begins.
  useEffect(() => {
    if (state.winner) {
      if (state.winner === human) sfx.win()
      else sfx.lose()
    } else if (state.turn !== lastTurn.current) turnBell(state.turn)
    lastTurn.current = state.turn
  }, [state, human])

  const push = (s: GameState) => {
    const spent = (g: GameState) => g.spells.solari.length + g.spells.umbral.length
    if (spent(s) < spent(state)) sfx.cast()
    else if (s.lastDuel) sfx.hit(2)
    else sfx.move()
    setHistory((h) => [...h, s])
    setSelectedId(null)
    setCasting(null)
    setPending(null)
  }

  /** Settle a capture: play it live, or let the duel AI play it out at the auto-duel skill. */
  const beginDuel = (p: Pending) => {
    if (duelMode === 'live') return setPending({ ...p, confirmed: true })
    const attacker = state.pieces.find((x) => x.id === p.pieceId)
    const defender = pieceAt(state, p.to)
    if (!attacker || !defender) return
    const skills: [number, number] = p.byAi ? [foeSkill, AUTO_DUEL_SKILL] : [AUTO_DUEL_SKILL, foeSkill]
    const duel = autoDuel(attacker, defender, squareLuminance(state, p.to), skills, state.rng + state.round,
      p.byAi ? [foeAggression, 1] : [1, foeAggression])
    push(reduce(state, { type: 'move', pieceId: p.pieceId, to: p.to, duel }))
  }

  // The AI court takes its turn after a short pause, searching off the main thread.
  useEffect(() => {
    if (state.turn !== foe || state.winner || pending) return
    let cancelled = false
    const timer = setTimeout(() => {
      requestAction(state, difficulty, state.rng + state.round).then((action: Action) => {
        if (cancelled) return
        if (action.type === 'move' && pieceAt(state, action.to)) beginDuel({ pieceId: action.pieceId, to: action.to, confirmed: true, byAi: true })
        else push(reduce(state, action))
      })
    }, AI_DELAY_MS)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
    // beginDuel and push only close over state/duelMode, which are covered or intentionally read fresh.
    // oxlint-disable-next-line react/exhaustive-deps
  }, [state, pending, foe, difficulty])

  const pickSpell = (spell: Spell | null) => {
    setSelectedId(null)
    if (spell && spellTargets(state, human, spell).none) return push(reduce(state, { type: 'cast', spell }))
    setCasting(spell)
  }

  const onSquare = (p: Pos) => {
    if (state.winner || pending || !myTurn) return
    if (casting && targets) {
      const occ = pieceAt(state, p)
      if (occ && targets.pieces.includes(occ.id)) return push(reduce(state, { type: 'cast', spell: casting, pieceId: occ.id }))
      if (targets.squares.some((m) => m.x === p.x && m.y === p.y)) return push(reduce(state, { type: 'cast', spell: casting, to: p }))
      return setCasting(null)
    }
    if (selected && moves.some((m) => m.x === p.x && m.y === p.y)) {
      if (pieceAt(state, p)) return setPending({ pieceId: selected.id, to: p, confirmed: false, byAi: false })
      return push(reduce(state, { type: 'move', pieceId: selected.id, to: p }))
    }
    const occ = pieceAt(state, p)
    setSelectedId(occ && occ.court === human ? occ.id : null)
  }

  const undo = () => {
    setHistory((h) => {
      let i = h.length - 2
      while (i > 0 && h[i].turn !== human) i--
      return h.slice(0, i + 1)
    })
    setSelectedId(null)
    setCasting(null)
    setPending(null)
  }

  const finishDuel = (outcome: DuelOutcome) => {
    if (pending) push(reduce(state, { type: 'move', pieceId: pending.pieceId, to: pending.to, duel: outcome }))
  }

  const toggleSound = () => {
    setMuted(sound)
    setSound(!sound)
  }
  const toggle = (key: keyof DuelOptions) => setOptions((o) => ({ ...o, [key]: !o[key] }))
  const attacker = pending && state.pieces.find((x) => x.id === pending.pieceId)
  const defender = pending && pieceAt(state, pending.to)
  const duel = state.lastDuel
  const result = state.winner === 'draw' ? 'Draw' : state.winner === human ? 'Victory' : 'Defeat'

  return (
    <main className="app">
      <Dial state={state} />
      <Board state={state} selected={selected} moves={moves} targetIds={targets?.pieces ?? []} onSquare={onSquare} flip={human === 'umbral'} />
      {pending && !pending.confirmed && attacker && defender && (
        <AttackConfirm attacker={attacker} defender={defender} live={duelMode === 'live'}
          luminance={squareLuminance(state, pending.to)}
          odds={estimateOdds(attacker, defender, squareLuminance(state, pending.to))}
          onConfirm={() => beginDuel(pending)} onCancel={() => setPending(null)} />
      )}
      {pending?.confirmed && attacker && defender && (
        <DuelView attacker={attacker} defender={defender} luminance={squareLuminance(state, pending.to)}
          options={options} playerSide={pending.byAi ? 1 : 0} opponentSkill={foeSkill} opponentAggression={foeAggression}
          seed={state.rng + state.round} onDone={finishDuel} />
      )}
      {state.winner && (
        <div className="confirm result" role="dialog" aria-label="Game over">
          <p className="confirm-title">{result}</p>
          <div className="buttons">
            <button className="primary" onClick={() => onExit(state.winner)}>Continue</button>
          </div>
        </div>
      )}
      <footer className="tray">
        {!state.winner && !pending && myTurn && <SpellBar state={state} active={casting} onPick={pickSpell} />}
        <div className="options">
          <label><input type="checkbox" checked={duelMode === 'auto'} onChange={() => setDuelMode((m) => (m === 'live' ? 'auto' : 'live'))} /> Auto-duel</label>
          <label><input type="checkbox" checked={options.mirror} onChange={() => toggle('mirror')} /> Mirror</label>
          <label><input type="checkbox" checked={options.aimAssist} onChange={() => toggle('aimAssist')} /> Aim assist</label>
          <label><input type="checkbox" checked={options.haptics} onChange={() => toggle('haptics')} /> Haptics</label>
          <label><input type="checkbox" checked={sound} onChange={toggleSound} /> Sound</label>
        </div>
        <p className="status">
          {state.winner
            ? result
            : !myTurn
              ? 'Opponent is thinking…'
              : duel
                ? `Last duel: ${duel.attackerHp > 0 && duel.defenderHp <= 0 ? 'attacker won' : duel.attackerHp <= 0 && duel.defenderHp > 0 ? 'defender won' : duel.attackerHp <= 0 ? 'both fell' : 'draw, defender holds'}`
                : 'Tap a piece, then a glowing square'}
        </p>
        <div className="buttons">
          <button disabled={history.length < 2} onClick={undo}>Undo</button>
          <button disabled={!!state.winner || !myTurn || !!pending} onClick={() => push(reduce(state, { type: 'pass' }))}>End turn</button>
          <button onClick={() => onExit(null)}>Quit</button>
        </div>
      </footer>
    </main>
  )
}
