import { useEffect, useRef, useState } from 'react'
import { autoDuel } from './ai/autoDuel'
import { requestAction } from './ai/client'
import { isMuted, setMuted, sfx, turnBell } from './audio/synth'
import { describeHint, HINT_DIFFICULTY, type Hint } from './ai/hint'
import { AUTO_DUEL_SKILL, DIFFICULTY, type Difficulty } from './ai/profile'
import { estimateOdds, reduce } from './engine/reducer'
import { samePos } from './engine/rules/board'
import { squareLuminance } from './engine/rules/luminance'
import { legalMoves, pieceAt } from './engine/rules/moves'
import { spellTargets } from './engine/rules/spells'
import type { Action, Court, DuelOutcome, GameState, Pos, Spell } from './engine/rules/types'
import { Board } from './ui/board/Board'
import { HintCard } from './ui/tray/HintCard'
import { PieceCard } from './ui/tray/PieceCard'
import { Dial } from './ui/dial/Dial'
import { DuelView, type DuelOptions } from './ui/duel/DuelView'
import { AttackConfirm } from './ui/tray/AttackConfirm'
import { Icon } from './ui/menus/icons'
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
/** How long the AI's chosen piece flashes before it moves. */
const AI_FLASH_MS = 800

const spellsLeft = (g: GameState) => g.spells.solari.length + g.spells.umbral.length

function describeDuel({ attackerHp, defenderHp }: DuelOutcome): string {
  if (defenderHp <= 0) return attackerHp > 0 ? 'attacker won' : 'both fell'
  return attackerHp <= 0 ? 'defender won' : 'draw, defender holds'
}

export function Game({ human, difficulty, initial, onExit }: Props) {
  const foe: Court = human === 'solari' ? 'umbral' : 'solari'
  const foeSkill = DIFFICULTY[difficulty].skill
  const foeAggression = DIFFICULTY[difficulty].aggression
  const [history, setHistory] = useState<GameState[]>([initial])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [options, setOptions] = useState<DuelOptions>({ mirror: false, aimAssist: true, haptics: true })
  const [duelMode, setDuelMode] = useState<DuelMode>('live')
  const [pending, setPending] = useState<Pending | null>(null)
  const [inspectId, setInspectId] = useState<string | null>(null)
  const [casting, setCasting] = useState<Spell | null>(null)
  const [aiFocus, setAiFocus] = useState<{ mover: string; target?: string } | null>(null)
  const [hint, setHint] = useState<Hint | 'thinking' | null>(null)
  const state = history[history.length - 1]
  /** The position a hint was asked for, so a slow search cannot land on a later one. */
  const hintFor = useRef<GameState | null>(null)
  const myTurn = state.turn === human
  const selected = state.pieces.find((p) => p.id === selectedId && p.court === human) ?? null
  const shown = state.pieces.find((p) => p.id === (selected?.id ?? inspectId)) ?? null
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

  const clearHint = () => {
    hintFor.current = null
    setHint(null)
  }

  const askHint = () => {
    if (hint) return clearHint()
    hintFor.current = state
    setHint('thinking')
    requestAction(state, HINT_DIFFICULTY, state.rng + state.round).then((action) => {
      if (hintFor.current === state) setHint(describeHint(state, action))
    })
  }

  const push = (s: GameState) => {
    if (spellsLeft(s) < spellsLeft(state)) sfx.cast()
    else if (s.lastDuel) sfx.hit(2)
    else sfx.move()
    setHistory((h) => [...h, s])
    setSelectedId(null)
    setInspectId(null)
    setCasting(null)
    setPending(null)
    clearHint()
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
    let flash: ReturnType<typeof setTimeout> | undefined
    const timer = setTimeout(() => {
      requestAction(state, difficulty, state.rng + state.round).then((action: Action) => {
        if (cancelled) return
        const act = () => {
          setAiFocus(null)
          if (action.type === 'move' && pieceAt(state, action.to)) beginDuel({ pieceId: action.pieceId, to: action.to, confirmed: true, byAi: true })
          else push(reduce(state, action))
        }
        // Flash the piece that is about to move so the player can follow it.
        const mover = action.type === 'move' ? action.pieceId : action.type === 'cast' ? action.pieceId : undefined
        if (!mover) return act()
        setAiFocus({ mover, target: action.type === 'move' ? pieceAt(state, action.to)?.id : undefined })
        flash = setTimeout(act, AI_FLASH_MS)
      })
    }, AI_DELAY_MS)
    return () => {
      cancelled = true
      clearTimeout(timer)
      clearTimeout(flash)
      setAiFocus(null)
    }
    // beginDuel and push only close over state/duelMode, which are covered or intentionally read fresh.
    // oxlint-disable-next-line react/exhaustive-deps
  }, [state, pending, foe, difficulty])

  const pickSpell = (spell: Spell | null) => {
    clearHint()
    setSelectedId(null)
    if (spell && spellTargets(state, human, spell).none) return push(reduce(state, { type: 'cast', spell }))
    setCasting(spell)
  }

  const onSquare = (p: Pos) => {
    if (state.winner || pending) return
    if (!myTurn) {
      // Off-turn taps only look at pieces.
      const occ = pieceAt(state, p)
      return setInspectId(occ ? occ.id : null)
    }
    if (casting && targets) {
      const occ = pieceAt(state, p)
      if (occ && targets.pieces.includes(occ.id)) return push(reduce(state, { type: 'cast', spell: casting, pieceId: occ.id }))
      if (targets.squares.some((m) => samePos(m, p))) return push(reduce(state, { type: 'cast', spell: casting, to: p }))
      return setCasting(null)
    }
    if (selected && moves.some((m) => samePos(m, p))) {
      if (pieceAt(state, p)) return setPending({ pieceId: selected.id, to: p, confirmed: false, byAi: false })
      return push(reduce(state, { type: 'move', pieceId: selected.id, to: p }))
    }
    clearHint()
    const occ = pieceAt(state, p)
    setSelectedId(occ && occ.court === human ? occ.id : null)
    setInspectId(occ ? occ.id : null)
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
    clearHint()
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
  const hinted = hint && hint !== 'thinking' ? hint : null
  const result = state.winner === 'draw' ? 'Draw' : state.winner === human ? 'Victory' : 'Defeat'

  return (
    <main className="app">
      <Dial state={state} />
      <Board state={state} selected={selected} moves={moves} targetIds={targets?.pieces ?? []} onSquare={onSquare}
        focus={pending ? { mover: pending.pieceId, target: defender?.id }
          : aiFocus ?? (hinted ? { mover: hinted.mover, target: hinted.target } : undefined)}
        hint={hinted ? { from: hinted.from, to: hinted.to, square: hinted.square, pieceId: hinted.mover } : undefined} flip={human === 'umbral'} />
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
            <button className="primary" onClick={() => onExit(state.winner)}><Icon name="next" />Continue</button>
          </div>
        </div>
      )}
      {hint && myTurn ? <HintCard hint={hint} /> : (
        <PieceCard state={state} human={human} piece={shown}
          hint={myTurn ? 'Tap one of your pieces to see what it can do. Tap an enemy to inspect it.' : 'Tap any piece to inspect it.'} />
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
                ? `Last duel: ${describeDuel(duel)}`
                : 'Tap a piece, then a glowing square'}
        </p>
        <div className="buttons">
          <button disabled={history.length < 2} onClick={undo}><Icon name="undo" />Undo</button>
          <button className={hint ? 'on' : ''} disabled={!!state.winner || !myTurn || !!pending} onClick={askHint}><Icon name="bulb" />Hint</button>
          <button disabled={!!state.winner || !myTurn || !!pending} onClick={() => push(reduce(state, { type: 'pass' }))}><Icon name="hourglass" />End turn</button>
          <button onClick={() => onExit(null)}><Icon name="exit" />Quit</button>
        </div>
      </footer>
    </main>
  )
}
