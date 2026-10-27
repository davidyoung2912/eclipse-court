import { useEffect, useRef, useState } from 'react'
import { autoDuel } from './ai/autoDuel'
import { requestAction } from './ai/client'
import { bankAfter, readClock, startingBank } from './clock'
import { isMuted, setMuted, sfx, turnBell } from './audio/synth'
import { describeHint, HINT_DIFFICULTY, type Hint } from './ai/hint'
import { AUTO_DUEL_SKILL, DIFFICULTY } from './ai/profile'
import { humanCourt, isHotSeat, isHuman, type Controllers } from './controllers'
import { recordOf, replaySteps, type GameRecord, type Step } from './engine/log'
import { ROLE_NAMES } from './engine/data/roster'
import { estimateOdds, reduce } from './engine/reducer'
import { otherCourt, samePos } from './engine/rules/board'
import { growthChoice } from './engine/rules/growth'
import { squareLuminance } from './engine/rules/luminance'
import { legalMoves, pieceAt } from './engine/rules/moves'
import { spellTargets } from './engine/rules/spells'
import type { Action, Court, DuelOutcome, GameState, Pos, Spell } from './engine/rules/types'
import { Board } from './ui/board/Board'
import { HintCard } from './ui/tray/HintCard'
import { PieceCard } from './ui/tray/PieceCard'
import { Dial } from './ui/dial/Dial'
import { ClockRing } from './ui/dial/ClockRing'
import { DuelView, type DuelOptions } from './ui/duel/DuelView'
import { AttackConfirm } from './ui/tray/AttackConfirm'
import { replayLink } from './share'
import { ShareButton } from './ui/ShareButton'
import { Icon } from './ui/menus/icons'
import { SpellBar } from './ui/tray/SpellBar'
import { DuelResult } from './ui/tray/DuelResult'
import { GrowthPrompt, type Prompt } from './ui/tray/GrowthPrompt'

interface Props {
  /** Who plays each court: a person at the screen, or the AI. Two people make a hot-seat game. */
  controllers: Controllers
  /** The game to play: a fresh one has no actions, a resumed one carries what has been played. */
  record: GameRecord
  /** A puzzle: you win by winning within this many of your own turns. */
  puzzleLimit?: number
  /** Called after every action with the game so far, or null once it has ended. */
  onSave: (record: GameRecord | null) => void
  onExit: (winner: GameState['winner'], record: GameRecord) => void
}

/** A capture waiting to be settled; `byAi` means the human is the defender. */
interface Pending {
  pieceId: string
  to: Pos
  confirmed: boolean
  byAi: boolean
}

type DuelMode = 'live' | 'auto'

const COURT_NAME: Record<Court, string> = { solari: 'Solari', umbral: 'Umbral' }

const AI_DELAY_MS = 450
/** How long the AI's chosen piece flashes before it moves. */
const AI_FLASH_MS = 1080
/** How long "Your Turn" / "AI Turn" stays up between players. */
const TURN_BANNER_MS = 1000

function describeDuel({ attackerHp, defenderHp }: DuelOutcome): string {
  if (defenderHp <= 0) return attackerHp > 0 ? 'attacker won' : 'both fell'
  return attackerHp <= 0 ? 'defender won' : 'draw, defender holds'
}

export function Game({ controllers, record, puzzleLimit, onSave, onExit }: Props) {
  const hotSeat = isHotSeat(controllers)
  const [history, setHistory] = useState<Step[]>(() => replaySteps(record.initial, record.actions) ?? [{ state: record.initial, action: null }])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [options, setOptions] = useState<DuelOptions>({ mirror: false, aimAssist: true, haptics: true })
  const [duelMode, setDuelMode] = useState<DuelMode>('live')
  /** Hot-seat only: hide the board between turns, and turn it to face whoever is about to play. */
  const [passScreen, setPassScreen] = useState(true)
  const [flipBoard, setFlipBoard] = useState(true)
  const [pending, setPending] = useState<Pending | null>(null)
  const [inspectId, setInspectId] = useState<string | null>(null)
  const [casting, setCasting] = useState<Spell | null>(null)
  /** The first ally chosen for Exchange, which takes two taps. */
  const [castFirst, setCastFirst] = useState<string | null>(null)
  /** A growth decision (perk or promotion) the player must make before their move is played. */
  const [asking, setAsking] = useState<{ action: Extract<Action, { type: 'move' }>; prompt: Prompt } | null>(null)
  /** A duel that has been fought, shown in a dialog before its result is played. */
  const [settled, setSettled] = useState<{ pending: Pending; outcome: DuelOutcome } | null>(null)
  /** The side whose turn is being announced; play waits until it clears. */
  const [banner, setBanner] = useState<{ court: Court } | null>(() => {
    const last = history[history.length - 1].state
    return last.winner ? null : { court: last.turn }
  })
  /** Blitz: time used so far on the turn at history length `at`, and the bank each court has left. */
  const [turnMs, setTurnMs] = useState({ at: -1, ms: 0 })
  const [banks, setBanks] = useState<Record<Court, number>>(() => {
    const clock = record.initial.config.turnClock
    const bank = clock ? startingBank(clock) : 0
    return { solari: bank, umbral: bank }
  })
  const [aiFocus, setAiFocus] = useState<{ mover: string; target?: string } | null>(null)
  const [hint, setHint] = useState<Hint | 'thinking' | null>(null)
  const state = history[history.length - 1].state
  /** The position a hint was asked for, so a slow search cannot land on a later one. */
  const hintFor = useRef<GameState | null>(null)
  const myTurn = isHuman(controllers, state.turn)
  /** The court the person at the screen acts for: the one human court, or whoever's turn it is in hot-seat. */
  const human = hotSeat ? state.turn : humanCourt(controllers)
  const foe = otherCourt(human)
  const foeController = controllers[foe]
  const difficulty = foeController === 'human' ? 'normal' : foeController.ai
  const personality = foeController === 'human' ? undefined : foeController.personality
  const foeSkill = DIFFICULTY[difficulty].skill
  const foeAggression = DIFFICULTY[difficulty].aggression
  /** Hot-seat duels are settled by the duel AI on both sides, as the live duel steers only one fighter. */
  const settleAuto = hotSeat || duelMode === 'auto'
  /** Turns the human has taken; a puzzle is lost once its limit is used up without a win. */
  const turnsTaken = history.filter((_, i) => i > 0 && history[i - 1].state.turn === human).length
  const failed = puzzleLimit !== undefined && !state.winner && turnsTaken >= puzzleLimit
  const ended = !!state.winner || failed
  const selected = state.pieces.find((p) => p.id === selectedId && p.court === human) ?? null
  const shown = state.pieces.find((p) => p.id === (selected?.id ?? inspectId)) ?? null
  const targets = casting && myTurn ? spellTargets(state, human, casting, castFirst ?? undefined) : null
  const moves = targets ? targets.squares : selected && myTurn ? legalMoves(state, selected) : []

  const clock = state.config.turnClock
  const elapsed = turnMs.at === history.length ? turnMs.ms : 0
  /** The clock stops for duels, dialogs, the pass screen and the AI's turn. */
  const clockRunning = !!clock && myTurn && !ended && !pending && !banner && !asking && !settled
  const reading = clock && readClock(clock, elapsed, banks[state.turn])

  const [sound, setSound] = useState(() => !isMuted())
  const lastTurn = useRef(state.turn)

  // Each court's bell rings as its turn begins.
  useEffect(() => {
    if (state.winner) {
      if (hotSeat ? state.winner !== 'draw' : state.winner === human) sfx.win()
      else sfx.lose()
    } else if (state.turn !== lastTurn.current) turnBell(state.turn)
    lastTurn.current = state.turn
  }, [state, human, hotSeat])

  // The turn announcement fades after a second and then lets play go on.
  useEffect(() => {
    if (!banner || (hotSeat && passScreen)) return
    const timer = setTimeout(() => setBanner(null), TURN_BANNER_MS)
    return () => clearTimeout(timer)
  }, [banner, hotSeat, passScreen])

  // The clock only counts while it runs; time is added from the real gap between ticks.
  useEffect(() => {
    if (!clockRunning) return
    const at = history.length
    let last = Date.now()
    const timer = setInterval(() => {
      const now = Date.now()
      const dt = now - last
      last = now
      setTurnMs((t) => ({ at, ms: (t.at === at ? t.ms : 0) + dt }))
    }, 100)
    return () => clearInterval(timer)
  }, [clockRunning, history.length])

  // A tick for each of the last few seconds.
  const urgentSecond = reading?.urgent && clockRunning ? reading.total : null
  useEffect(() => {
    if (urgentSecond !== null) sfx.tick()
  }, [urgentSecond])

  // Out of time: the turn is passed for the player, as any other pass.
  const timedOut = clockRunning && !!reading?.expired
  useEffect(() => {
    if (timedOut) play({ type: 'pass' })
    // play closes over the state this effect runs against.
    // oxlint-disable-next-line react/exhaustive-deps
  }, [timedOut])

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

  // Keeps the unfinished game saved so it can be resumed after leaving.
  useEffect(() => {
    const last = history[history.length - 1].state
    onSave(last.winner || history.length < 2 ? null : recordOf(history))
    // onSave is read fresh; only a change to the game itself should save.
    // oxlint-disable-next-line react/exhaustive-deps
  }, [history])

  /** Plays an action: the one place the game moves forward, so the history doubles as the game's log. */
  const play = (action: Action) => {
    const s = reduce(state, action)
    if (s === state) return
    if (action.type === 'cast') sfx.cast()
    else if (s.lastDuel) sfx.hit(2)
    else sfx.move()
    if (clock && myTurn) setBanks((b) => ({ ...b, [state.turn]: bankAfter(clock, elapsed, b[state.turn]) }))
    setHistory((h) => [...h, { state: s, action }])
    if (s.turn !== state.turn && !s.winner) setBanner({ court: s.turn })
    setSettled(null)
    setSelectedId(null)
    setInspectId(null)
    setCasting(null)
    setCastFirst(null)
    setPending(null)
    clearHint()
  }

  /** Plays one of the human's moves, first asking about any perk or promotion it earns. */
  const commit = (action: Extract<Action, { type: 'move' }>) => {
    const choice = growthChoice(state, action)
    const name = ROLE_NAMES[human][state.pieces.find((x) => x.id === action.pieceId)?.role ?? 'footsoldier']
    if (choice.perks && !action.perk) return setAsking({ action, prompt: { kind: 'perk', options: choice.perks, name } })
    if (choice.promote && !action.promote) return setAsking({ action, prompt: { kind: 'promote', court: human, name } })
    setAsking(null)
    play(action)
  }

  /** Plays the move a finished duel decided, once its result has been seen. */
  const applyDuel = ({ pending: p, outcome }: { pending: Pending; outcome: DuelOutcome }) => {
    const move = { type: 'move' as const, pieceId: p.pieceId, to: p.to, duel: outcome }
    if (p.byAi) play(move)
    else commit(move)
  }

  /** Settle a capture: play it live, or let the duel AI play it out at the auto-duel skill. */
  const beginDuel = (p: Pending) => {
    if (!settleAuto) return setPending({ ...p, confirmed: true })
    const attacker = state.pieces.find((x) => x.id === p.pieceId)
    const defender = pieceAt(state, p.to)
    if (!attacker || !defender) return
    const skills: [number, number] = hotSeat ? [AUTO_DUEL_SKILL, AUTO_DUEL_SKILL] : p.byAi ? [foeSkill, AUTO_DUEL_SKILL] : [AUTO_DUEL_SKILL, foeSkill]
    const duel = autoDuel(attacker, defender, squareLuminance(state, p.to), skills, state.rng + state.round,
      hotSeat ? [1, 1] : p.byAi ? [foeAggression, 1] : [1, foeAggression])
    setPending({ ...p, confirmed: true })
    setSettled({ pending: p, outcome: duel })
  }

  // The AI court takes its turn after a short pause, searching off the main thread.
  useEffect(() => {
    if (myTurn || state.winner || pending || failed || banner) return
    let cancelled = false
    let flash: ReturnType<typeof setTimeout> | undefined
    const timer = setTimeout(() => {
      requestAction(state, difficulty, state.rng + state.round, personality).then((action: Action) => {
        if (cancelled) return
        const act = () => {
          setAiFocus(null)
          if (action.type === 'move' && pieceAt(state, action.to)) beginDuel({ pieceId: action.pieceId, to: action.to, confirmed: true, byAi: true })
          else play(action)
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
    // beginDuel and play only close over state/duelMode, which are covered or intentionally read fresh.
    // oxlint-disable-next-line react/exhaustive-deps
  }, [state, pending, myTurn, difficulty, failed, banner])

  const pickSpell = (spell: Spell | null) => {
    if (banner) return
    clearHint()
    setSelectedId(null)
    setCastFirst(null)
    if (spell && spellTargets(state, human, spell).none) return play({ type: 'cast', spell })
    setCasting(spell)
  }

  const onSquare = (p: Pos) => {
    if (ended || pending || banner) return
    if (!myTurn) {
      // Off-turn taps only look at pieces.
      const occ = pieceAt(state, p)
      return setInspectId(occ ? occ.id : null)
    }
    if (casting && targets) {
      const occ = pieceAt(state, p)
      if (occ && targets.pieces.includes(occ.id)) {
        if (casting !== 'exchange') return play({ type: 'cast', spell: casting, pieceId: occ.id })
        return castFirst ? play({ type: 'cast', spell: casting, pieceId: castFirst, to: p }) : setCastFirst(occ.id)
      }
      if (targets.squares.some((m) => samePos(m, p))) return play({ type: 'cast', spell: casting, to: p })
      setCastFirst(null)
      return setCasting(null)
    }
    if (selected && moves.some((m) => samePos(m, p))) {
      if (pieceAt(state, p)) return setPending({ pieceId: selected.id, to: p, confirmed: false, byAi: false })
      return commit({ type: 'move', pieceId: selected.id, to: p })
    }
    clearHint()
    const occ = pieceAt(state, p)
    setSelectedId(occ && occ.court === human ? occ.id : null)
    setInspectId(occ ? occ.id : null)
  }

  const undo = () => {
    setTurnMs({ at: -1, ms: 0 })
    if (hotSeat) {
      // Take back the last move, whoever made it.
      const earlier = history.slice(0, -1)
      setHistory(earlier)
      setBanner({ court: earlier[earlier.length - 1].state.turn })
    } else
      setHistory((h) => {
        let i = h.length - 2
        while (i > 0 && h[i].state.turn !== human) i--
        return h.slice(0, i + 1)
      })
    setSelectedId(null)
    setCasting(null)
    setCastFirst(null)
    setPending(null)
    clearHint()
  }

  const finishDuel = (outcome: DuelOutcome) => {
    if (pending) setSettled({ pending, outcome })
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
  const result = puzzleLimit !== undefined
    ? state.winner === human ? 'Solved' : 'Not solved'
    : state.winner === 'draw' ? 'Draw'
    : hotSeat ? `${COURT_NAME[state.winner ?? 'solari']} wins`
    : state.winner === human ? 'Victory' : 'Defeat'
  const retry = () => {
    setTurnMs({ at: -1, ms: 0 })
    setHistory((h) => h.slice(0, 1))
    setBanner({ court: history[0].state.turn })
    setSelectedId(null)
    setCasting(null)
    setCastFirst(null)
    setPending(null)
    clearHint()
  }

  return (
    <main className="app timed">
      <Dial state={state} />
      <Board state={state} selected={selected} moves={moves} targetIds={targets?.pieces ?? []} onSquare={onSquare}
        focus={pending ? { mover: pending.pieceId, target: defender?.id }
          : aiFocus ?? (hinted ? { mover: hinted.mover, target: hinted.target } : undefined)}
        hint={hinted ? { from: hinted.from, to: hinted.to, square: hinted.square, pieceId: hinted.mover } : undefined} flip={human === 'umbral' && (!hotSeat || flipBoard)} />
      {pending && !pending.confirmed && attacker && defender && (
        <AttackConfirm attacker={attacker} defender={defender} live={!settleAuto}
          luminance={squareLuminance(state, pending.to)}
          odds={estimateOdds(attacker, defender, squareLuminance(state, pending.to))}
          onConfirm={() => beginDuel(pending)} onCancel={() => setPending(null)} />
      )}
      {pending?.confirmed && !settled && attacker && defender && (
        <DuelView attacker={attacker} defender={defender} luminance={squareLuminance(state, pending.to)}
          options={options} playerSide={pending.byAi ? 1 : 0} opponentSkill={foeSkill} opponentAggression={foeAggression}
          seed={state.rng + state.round} onDone={finishDuel} />
      )}
      {settled && !asking && attacker && defender && (
        <DuelResult attacker={attacker} defender={defender} outcome={settled.outcome} onContinue={() => applyDuel(settled)} />
      )}
      {asking && (
        <GrowthPrompt prompt={asking.prompt}
          onPerk={(perk) => commit({ ...asking.action, perk })}
          onPromote={(role) => commit({ ...asking.action, promote: role })} />
      )}
      {banner && !ended && hotSeat && passScreen && (
        <button key={banner.court + history.length} className={`pass-screen ${banner.court}`} onClick={() => setBanner(null)}>
          <strong>{COURT_NAME[banner.court]} to move</strong>
          <span>Hand over the device, then tap to begin</span>
        </button>
      )}
      {banner && !ended && !(hotSeat && passScreen) && (
        <div key={banner.court + history.length} className={`turn-banner ${banner.court}`} role="status">
          {hotSeat ? `${COURT_NAME[banner.court]} Turn` : banner.court === human ? 'Your Turn' : 'AI Turn'}
        </div>
      )}
      {ended && (
        <div className="confirm result" role="dialog" aria-label="Game over">
          <p className="confirm-title">{result}</p>
          <div className="buttons">
            {puzzleLimit !== undefined && state.winner !== human && <button onClick={retry}><Icon name="undo" />Try Again</button>}
            {puzzleLimit === undefined && <ShareButton title="Eclipse Court replay" label="Copy Replay Link" link={() => replayLink(recordOf(history))} />}
            <button className="primary" onClick={() => onExit(state.winner ?? foe, recordOf(history))}><Icon name="next" />Continue</button>
          </div>
        </div>
      )}
      {hint && myTurn ? <HintCard hint={hint} /> : (
        <PieceCard state={state} human={human} piece={shown}
          hint={myTurn ? 'Tap one of your pieces to see what it can do. Tap an enemy to inspect it.' : 'Tap any piece to inspect it.'} />
      )}
      <footer className="tray">
        {clock && !ended && myTurn && <ClockRing clock={clock} elapsedMs={elapsed} bankMs={banks[state.turn]} court={state.turn} paused={!clockRunning} />}
        {!ended && !pending && myTurn && <SpellBar state={state} active={casting} onPick={pickSpell} exchanging={!!castFirst} />}
        <div className="options">
          {hotSeat ? (
            <>
              <label><input type="checkbox" checked={passScreen} onChange={() => setPassScreen((v) => !v)} /> Pass screen</label>
              <label><input type="checkbox" checked={flipBoard} onChange={() => setFlipBoard((v) => !v)} /> Face the player</label>
            </>
          ) : (
            <label><input type="checkbox" checked={duelMode === 'auto'} onChange={() => setDuelMode((m) => (m === 'live' ? 'auto' : 'live'))} /> Auto-duel</label>
          )}
          <label><input type="checkbox" checked={options.mirror} onChange={() => toggle('mirror')} /> Mirror</label>
          <label><input type="checkbox" checked={options.aimAssist} onChange={() => toggle('aimAssist')} /> Aim assist</label>
          <label><input type="checkbox" checked={options.haptics} onChange={() => toggle('haptics')} /> Haptics</label>
          <label><input type="checkbox" checked={sound} onChange={toggleSound} /> Sound</label>
        </div>
        <p className="status">
          {ended
            ? result
            : puzzleLimit !== undefined && myTurn
              ? `Turn ${turnsTaken + 1} of ${puzzleLimit}`
              : !myTurn
              ? 'Opponent is thinking…'
              : duel
                ? `Last duel: ${describeDuel(duel)}`
                : 'Tap a piece, then a glowing square'}
        </p>
        <div className="buttons">
          <button disabled={history.length < 2} onClick={undo}><Icon name="undo" />Undo</button>
          {!hotSeat && <button className={hint ? 'on' : ''} disabled={ended || !myTurn || !!pending || !!banner} onClick={askHint}><Icon name="bulb" />Hint</button>}
          <button disabled={ended || !myTurn || !!pending || !!banner} onClick={() => play({ type: 'pass' })}><Icon name="hourglass" />End Turn</button>
          <button onClick={() => onExit(null, recordOf(history))}><Icon name="exit" />Quit</button>
        </div>
      </footer>
    </main>
  )
}
