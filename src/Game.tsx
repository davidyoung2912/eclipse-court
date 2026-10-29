import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type CSSProperties } from 'react'
import { autoDuel } from './ai/autoDuel'
import { haptic } from './haptics'
import { isMusicOn, isMuted, setMusicOn, setMuted, sfx, startMusic, turnBell } from './audio/synth'
import { HEARTBEAT_S, leaderInDanger, leaderStopMs, streaksOf, winningSquares } from './boardDrama'
import { StreakMeter } from './ui/board/StreakMeter'
import { FallenTrays } from './ui/board/FallenTrays'
import { EclipseCinematic } from './ui/board/EclipseCinematic'
import { KillCam } from './ui/board/KillCam'
import { killShotOf, type KillShot } from './killCam'
import { flyBeacon } from './ui/board/flyBeacon'
import { beaconPickups, castPath, eclipseCinemaMs, type CastFx } from './spellFx'
import { hourBed } from './audio/cues'
import { musicLevel, piecesLost, shakeFor, streakAfter, streakLabel } from './juice'
import { flashesReduced, getSettings, HINTS_PER_MATCH, updateSettings } from './settings'
import { t } from './i18n'
import { consumePackHint, sinksSnapshot, subscribeSinks } from './sinks'
import { explainMove } from './ai/why'
import { attackOdds, beaconReach, blunderOf, lastMoveOf, nextAttackOdds, nextDetail, nextLightState, spellReminder, threatenedIds } from './ui/board/aids'
import { AUTO_DUEL_SKILL, DIFFICULTY } from './ai/profile'
import { coopPlayer } from './engine/data/coop'
import { humanCourt, isHotSeat, isHuman, isOnline, type Controllers } from './controllers'
import type { EndReason, Session } from './net/session'
import { recordOf, replaySteps, type GameRecord, type Step } from './engine/log'
import { ROLE_NAMES } from './engine/data/roster'
import { matchGoal, modeOf } from './engine/rules/events'
import { estimateOdds, reduce } from './engine/reducer'
import { otherCourt, samePos, sizeOf } from './engine/rules/board'
import { duelCells } from './engine/rules/cells'
import { FIGHT_TUNING, tuneCells } from './fightDifficulty'
import { growthChoice } from './engine/rules/growth'
import { squareLuminance } from './engine/rules/luminance'
import { legalMoves, pieceAt } from './engine/rules/moves'
import { SPELL_INFO, spellTargets } from './engine/rules/spells'
import type { Action, Court, DuelOutcome, GameState, Piece, Pos, Spell } from './engine/rules/types'
import { Board } from './ui/board/Board'
import { HintCard } from './ui/tray/HintCard'
import { PieceCard } from './ui/tray/PieceCard'
import { TipCard } from './ui/tips/TipCard'
import { CoachMarks } from './ui/tips/CoachMarks'
import { CHAT_IDS, CHAT_LINES } from './net/protocol'
import { coachLine } from './onboarding'
import { CellCard } from './ui/tray/CellCard'
import { Dial } from './ui/dial/Dial'
import { narrate } from './narrate'
import { moodFor, MOOD_MS, type Mood } from './mood'
import { momentOf, MOMENT_MS, type Moment, type MomentId } from './moments'
import { lineAllowed, newBanter, speak, triggerFor, type BanterState } from './banter'
import { personaById } from './engine/data/personas'
import type { LineCategory } from './engine/data/personaLines'
import { PersonaBubble } from './ui/tray/PersonaBubble'
import { farewellLine, recordLine } from './personaMenu'
import type { PuzzleHelp } from './hooks/useHint'
import { useAiTurn } from './hooks/useAiTurn'
import { useHint } from './hooks/useHint'
import { useLatest } from './hooks/useLatest'
import { useTurnClock } from './hooks/useTurnClock'
import { ClockRing } from './ui/dial/ClockRing'
import { DuelView, type DuelOptions } from './ui/duel/DuelView'
import { cellAt } from './engine/rules/cells'
import { CellLegend } from './ui/board/CellLegend'
import { AttackConfirm } from './ui/tray/AttackConfirm'
import { replayLink, watchLink } from './share'
import { ShareButton } from './ui/ShareButton'
import { Icon } from './ui/menus/icons'
import { SpellBar } from './ui/tray/SpellBar'
import { DuelResult } from './ui/tray/DuelResult'
import { GrowthPrompt, type Prompt } from './ui/tray/GrowthPrompt'
import { WinBurst } from './ui/tray/WinBurst'
import { Confetti } from './ui/tray/Confetti'
import { RewardLines } from './ui/tray/RewardLines'
import { confettiCount } from './rewardFx'
import { ResultBanner, type ResultStat, type ResultTone } from './ui/tray/ResultBanner'

interface Props {
  /** Who plays each court: a person at the screen, or the AI. Two people make a hot-seat game. */
  controllers: Controllers
  /** What a named opponent says before the first move, when the menu has a better line than the default briefing. */
  opening?: string
  /** The game to play: a fresh one has no actions, a resumed one carries what has been played. */
  record: GameRecord
  /** The connection to the other player, for an online game. */
  session?: Session
  /** A puzzle: you win by winning within this many of your own turns. */
  puzzleLimit?: number
  /** Where the game comes from, for the line above the board and the guidance cards that suit it. */
  context?: { label: string; kind: 'skirmish' | 'campaign' | 'scenario' | 'story' | 'daily' | 'gauntlet' | 'series'; /** A rated game: no take-backs. */ scored?: boolean; /** Two people share the Solari court and alternate by round. */ coop?: boolean; /** Which scored mode this is, for its guidance card. */ flavour?: 'weekly' | 'ladder' }
  /** The player's first campaign battle: a line of coaching sits above the board's cards. */
  coach?: boolean
  /** The player has never won a game: a win now is their first, and gets confetti. */
  firstWin?: boolean
  /** A puzzle's name and description, shown over the board when it starts and boiled down to its first sentence above it. */
  puzzle?: { name: string; text: string; /** A Puzzle Rush run: a failed puzzle ends it, so there is no retry. */ rush?: boolean }
  /** A puzzle's own hints and solution; the Hint button walks through them in place of the AI's advice. */
  puzzleHelp?: PuzzleHelp
  /** Called after every action with the game so far, or null once it has ended. */
  /** Play by link: the other court is not here, so no AI answers; called with the game once the person has moved and the turn has passed on. */
  mail?: (record: GameRecord) => void
  onSave: (record: GameRecord | null) => void
  /** The setup can be played again: the result offers Play Again (and Swap Sides against the AI), which exit with `again` set. */
  canPlayAgain?: boolean
  /** After a loss to the named opponent the result offers a Grudge Match: the same fight again, which pays Shards if won. */
  canGrudge?: boolean
  /** Play Again may swap courts too; false where the player's court is fixed. */
  canSwap?: boolean
  onExit: (winner: GameState['winner'], record: GameRecord, review?: boolean, again?: 'same' | 'swap' | 'grudge') => void
  /** Once, when the game is decided and the result opens: settles the payouts and returns the lines to show; absent when nothing is paid here. */
  onEnded?: (winner: GameState['winner'], record: GameRecord) => string[]
  /** Online, when the connection drops mid-game: go and make a new one, handing over the game so far. */
  onReconnect?: (record: GameRecord) => void
  /** Online, once both players asked for a rematch and the next match has begun: swap to it. */
  onRematch?: (view: ReturnType<Session['view']>) => void
}

/** A capture waiting to be settled; `byAi` means the human is the defender. */
interface Pending {
  pieceId: string
  to: Pos
  confirmed: boolean
  byAi: boolean
}

type DuelMode = 'live' | 'auto'

const NO_SQUARES: Pos[] = []
const NO_IDS: string[] = []

const COURT_NAME: Record<Court, string> = { solari: 'Solari', umbral: 'Umbral' }

/** How long "Your Turn" / "AI Turn" stays up between players. */
const TURN_BANNER_MS = 1000

/** How long the player may think before a named opponent says something. */
const IDLE_MS = 45_000

function describeDuel({ attackerHp, defenderHp }: DuelOutcome): string {
  if (defenderHp <= 0) return attackerHp > 0 ? 'attacker won' : 'both fell'
  return attackerHp <= 0 ? 'defender won' : 'draw, defender holds'
}

const DROPPED_TEXT: Partial<Record<EndReason, string>> = {
  'opponent-left': 'Your opponent left',
  desync: 'The games disagreed',
  illegal: 'The games disagreed',
  version: 'Different game versions',
}

export function Game({ controllers, opening, record, session, context, coach, firstWin, puzzle, puzzleLimit, puzzleHelp, mail, canPlayAgain, canGrudge, canSwap = true, onSave, onExit, onEnded, onReconnect, onRematch }: Props) {
  const hotSeat = isHotSeat(controllers)
  const online = isOnline(controllers) && !!session
  const coop = !!context?.coop
  const [net, setNet] = useState(() => session?.view() ?? null)
  const [history, setHistory] = useState<Step[]>(() => replaySteps(record.initial, record.actions) ?? [{ state: record.initial, action: null }])
  const [quitAsk, setQuitAsk] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [options, setOptions] = useState<DuelOptions>({ mirror: false, aimAssist: true, haptics: true })
  const [duelMode, setDuelMode] = useState<DuelMode>('live')
  /** Hot-seat only: hide the board between turns, and turn it to face whoever is about to play. */
  const [passScreen, setPassScreen] = useState(true)
  const [flipBoard, setFlipBoard] = useState(true)
  const [pending, setPending] = useState<Pending | null>(null)
  const [inspectId, setInspectId] = useState<string | null>(null)
  /** An empty square being inspected; its card shows the light and any cell effect there. */
  const [inspectSq, setInspectSq] = useState<Pos | null>(null)
  const [casting, setCasting] = useState<Spell | null>(null)
  /** The first ally chosen for Exchange, which takes two taps. */
  const [castFirst, setCastFirst] = useState<string | null>(null)
  /** A growth decision (perk or promotion) the player must make before their move is played. */
  const [asking, setAsking] = useState<{ action: Extract<Action, { type: 'move' }>; prompt: Prompt } | null>(null)
  /** A duel that has been fought, shown in a dialog before its result is played. */
  const [settled, setSettled] = useState<{ pending: Pending; outcome: DuelOutcome } | null>(null)
  /** The latest spell's effect on the board, and the Eclipse cinematic while it plays. */
  const [castFx, setCastFx] = useState<CastFx | null>(null)
  const [cinema, setCinema] = useState(false)
  const [kill, setKill] = useState<KillShot | null>(null)
  /** The side whose turn is being announced; play waits until it clears. */
  const [banner, setBanner] = useState<{ court: Court } | null>(() => {
    const last = history[history.length - 1].state
    return last.winner ? null : { court: last.turn }
  })
  /** The AI's reason for its latest move, shown while it is the player's turn (hidden once undone past it). */
  const [bubble, setBubble] = useState<string | null>(() => {
    const named = [controllers.solari, controllers.umbral].find((c) => typeof c === 'object' && c.persona)
    const id = typeof named === 'object' ? named.persona : undefined
    if (!id || !personaById(id) || record.actions.length > 0 || !lineAllowed(getSettings().banter, 'briefing')) return null
    return opening ?? recordLine(id, 'briefing', String(record.initial.config.seed))
  })
  const banter = useRef<BanterState>(newBanter(record.initial.config.seed))
  const [aiWhy, setAiWhy] = useState<{ at: number; text: string } | null>(null)
  /** The puzzle briefing waits for Got It! before play can begin; a resumed puzzle has been briefed already. */
  const [briefing, setBriefing] = useState(!!puzzle && record.actions.length === 0)
  const state = history[history.length - 1].state
  const myTurn = isHuman(controllers, state.turn)
  /** The court the person at the screen acts for: the one human court, or whoever's turn it is in hot-seat. */
  const human = hotSeat ? state.turn : humanCourt(controllers)
  const foe = otherCourt(human)
  const foeController = controllers[foe]
  const aiFoe = typeof foeController === 'object' ? foeController : null
  const difficulty = aiFoe ? aiFoe.ai : 'normal'
  const personality = aiFoe?.personality
  /** The named opponent whose voice speaks in the fight, if the foe has one. */
  const persona = aiFoe?.persona ? personaById(aiFoe.persona) : undefined
  /** Hot-seat and online duels are settled by the duel AI on both sides, as the live duel steers only one fighter. */
  const even = hotSeat || online || !!mail
  /** The fight-difficulty setting only tunes fights against the AI; games between people stay even. */
  const tuning = FIGHT_TUNING[even ? 'normal' : getSettings().fightDifficulty]
  const foeSkill = Math.min(1, Math.max(0, DIFFICULTY[difficulty].skill + tuning.foeSkill))
  const foeAggression = Math.min(1, Math.max(0, DIFFICULTY[difficulty].aggression + tuning.foeAggression))
  /** The cells under a capture's fighters, with the fight difficulty applied to the human's side. */
  const fightCells = (attacker: Piece, defender: Piece, byAi: boolean) => tuneCells(duelCells(state, attacker, defender), byAi ? 1 : 0, tuning)
  /** The person at the screen for Solari's turn in a co-op game: the first on odd rounds. */
  const coopTurn = coopPlayer(state.round)
  /** The device changes hands: hot-seat before every turn, co-op before each of Solari's. */
  const handover = (hotSeat || (coop && banner?.court === 'solari')) && passScreen
  const settleAuto = even || duelMode === 'auto' || getSettings().duelSpeed === 'instant'
  /** Turns the human has taken; a puzzle is lost once its limit is used up without a win. */
  const turnsTaken = history.filter((_, i) => i > 0 && history[i - 1].state.turn === human).length
  const failed = puzzleLimit !== undefined && !state.winner && turnsTaken >= puzzleLimit
  /** Online, a resignation ends the game without the board showing a winner. */
  const resigned = net?.reason === 'resigned' || net?.reason === 'opponent-resigned' || net?.reason === 'drawn'
  const winner = state.winner ?? (resigned ? net?.winner ?? null : null)
  /** The connection broke, or the other build disagreed, before the game was decided. */
  const dropped = !!net && net.status === 'over' && net.reason !== 'finished' && !winner
  const ended = !!winner || failed || dropped
  /** Online and playing, but the other side cannot be heard: the game waits for a new connection. */
  const lost = online && !ended && net?.status === 'playing' && net.link === 'down'
  /** The two games disagreed, which is worth a bug report. */
  const disagreed = dropped && (net?.reason === 'desync' || net?.reason === 'illegal')
  const selected = state.pieces.find((p) => p.id === selectedId && p.court === human) ?? null
  const shown = state.pieces.find((p) => p.id === (selected?.id ?? inspectId)) ?? null
  const targets = useMemo(
    () => (casting && myTurn ? spellTargets(state, human, casting, castFirst ?? undefined) : null),
    [state, human, casting, castFirst, myTurn],
  )
  const moves = useMemo(
    () => (targets ? targets.squares : selected && myTurn ? legalMoves(state, selected) : NO_SQUARES),
    [state, targets, selected, myTurn],
  )
  /** Tapping an enemy piece shows where it could strike next. */
  const threats = useMemo(
    () => (!selected && !targets && shown && shown.court !== human ? legalMoves(state, shown) : NO_SQUARES),
    [state, selected, targets, shown, human],
  )

  /** The last few plays in words for a screen reader; under fog the enemy's plays are not described. */
  const log = useMemo(() => {
    const hidden = !!state.config.fog && !hotSeat && !online
    return history.slice(-12).flatMap((step, i, all) => {
      const before = all[i - 1] ?? history[history.length - all.length - 1]
      if (!step.action || !before) return []
      return [hidden && before.state.turn !== human ? 'The opponent acts.' : narrate(before.state, step.action, step.state)]
    })
  }, [history, state.config.fog, hotSeat, online, human])

  const trail = useMemo(() => (getSettings().lastMove && !state.config.fog && !ended ? lastMoveOf(history) ?? undefined : undefined), [history, state.config.fog, ended])
  const chipOn = getSettings().eclipseChip && !ended
  /** The blunder check gives advice, so it is off under fog and in scored, daily and puzzle games. */
  const adviceOk = !state.config.fog && !online && !puzzleHelp && puzzleLimit === undefined && context?.kind !== 'daily' && !context?.scored
  const blunderOn = getSettings().blunderCheck && adviceOk
  const detailOn = getSettings().oddsDetail && adviceOk
  const remindOn = getSettings().reminders && adviceOk && myTurn && !ended
  const reach = useMemo(() => (remindOn ? beaconReach(state, human) : undefined), [remindOn, state, human])
  const reminder = useMemo(() => (remindOn ? spellReminder(state, human) : undefined), [remindOn, state, human])
  const [blunder, setBlunder] = useState<{ action: Extract<Action, { type: 'move' }>; text: string } | null>(null)
  const [blunderSkip, setBlunderSkip] = useState(false)
  const forecastOn = getSettings().forecast && !state.config.fog && !ended
  const nextLight = useMemo(() => (forecastOn ? nextLightState(state) : undefined), [forecastOn, state])
  const [aids, setAids] = useState(() => getSettings().aids)
  /** The aids are off under fog, where they would give away unseen pieces. */
  const aidsOn = aids && !state.config.fog && !ended
  const endangered = useMemo(() => (aidsOn ? threatenedIds(state, human) : NO_IDS), [aidsOn, state, human])
  /** Threat and win cues are advice, so they follow the aids: a red pulse while the Leader can be taken, gold on a winning square. */
  const leaderDanger = aidsOn && !pending && !settled && leaderInDanger(state, human, endangered)
  const winAt = useMemo(() => (aidsOn && myTurn && !pending ? winningSquares(state, human) : undefined), [aidsOn, myTurn, pending, state, human])
  const odds = useMemo(() => (aidsOn && selected && myTurn && !targets ? attackOdds(state, selected, moves) : undefined), [aidsOn, state, selected, myTurn, targets, moves])

  const nextOdds = useMemo(() => (forecastOn && selected && myTurn && !targets ? nextAttackOdds(state, selected, moves) : undefined), [forecastOn, state, selected, myTurn, targets, moves])

  const sinks = useSyncExternalStore(subscribeSinks, sinksSnapshot)
  const packHints = { held: sinks.hints, spend: consumePackHint }
  const { hint, level: hintLevel, ask: askHintRaw, clear: clearHint } = useHint(state, puzzleHelp, turnsTaken, packHints)
  const hintMode = puzzleHelp ? 'unlimited' : getSettings().hints
  const [hintsUsed, setHintsUsed] = useState(0)
  const hintsLeft = Math.max(0, HINTS_PER_MATCH - hintsUsed)
  /** Opening a hint spends one under Three per match; closing the card is free. */
  const askHint = () => {
    if (hintMode === 'three' && !hint) setHintsUsed((n) => n + 1)
    askHintRaw()
  }

  /** Duel assist is off in scored, daily and puzzle games, like the other aids. */
  const duelAssistOk = getSettings().duelAssist && !online && !puzzleHelp && puzzleLimit === undefined && context?.kind !== 'daily' && !context?.scored
  const takeBacks = getSettings().takeBacks
  /** Casual games are skirmishes and hot-seat; Undo stays hidden elsewhere under Casual games only. */
  const takeBackOk = takeBacks === 'always' || (takeBacks === 'casual' && (hotSeat || context?.kind === 'skirmish'))

  const clock = state.config.turnClock
  /** The clock stops for duels, dialogs, the pass screen and the AI's turn. */
  const clockRunning = !!clock && myTurn && !ended && !pending && !banner && !asking && !settled
  const turnClock = useTurnClock({
    clock, turn: state.turn, turnId: history.length, running: clockRunning, charge: myTurn,
    // Out of time: the turn is passed for the player, as any other pass.
    onExpire: () => play({ type: 'pass' }),
  })
  const { elapsed, banks } = turnClock

  const [sound, setSound] = useState(() => !isMuted())
  const [music, setMusic] = useState(isMusicOn)
  /** The capture streak just made, shown for a moment; the key restarts the animation. */
  const [combo, setCombo] = useState<{ key: number; label: string; court: Court } | null>(null)
  /** The named moment on show (tap to skip); each is named once a game. */
  const [moment, setMoment] = useState<(Moment & { key: number }) | null>(null)
  const momentsSeen = useRef(new Set<MomentId>())
  /** The named opponent's expression; it settles back to calm on its own. */
  const [mood, setMood] = useState<{ mood: Mood; key: number } | null>(null)
  const lastTurn = useRef(state.turn)
  const wasEclipse = useRef(state.eclipse)
  const musicRef = useRef<ReturnType<typeof startMusic> | null>(null)

  // The music bed plays while sound and music are on, and builds toward the Eclipse.
  useEffect(() => {
    if (!sound || !music) return
    const bed = startMusic()
    musicRef.current = bed
    return () => {
      bed.stop()
      musicRef.current = null
    }
  }, [sound, music])
  useEffect(() => musicRef.current?.setLevel(musicLevel(state)), [state, sound, music])
  useEffect(() => musicRef.current?.setHour(hourBed({ phase: state.phase, dir: state.dir, eclipse: state.eclipse })), [state.phase, state.dir, state.eclipse, sound, music])

  // A slow heartbeat thuds while the Leader is in danger.
  useEffect(() => {
    if (!leaderDanger || !sound) return
    sfx.heartbeat()
    const timer = setInterval(sfx.heartbeat, HEARTBEAT_S * 1000)
    return () => clearInterval(timer)
  }, [leaderDanger, sound])

  // The streak label clears itself.
  useEffect(() => {
    if (!combo) return
    const timer = setTimeout(() => setCombo(null), 1600)
    return () => clearTimeout(timer)
  }, [combo])

  // The opponent's face settles back to calm.
  useEffect(() => {
    if (!mood) return
    const timer = setTimeout(() => setMood(null), MOOD_MS)
    return () => clearTimeout(timer)
  }, [mood])

  // The named moment clears itself.
  useEffect(() => {
    if (!moment) return
    const timer = setTimeout(() => setMoment(null), MOMENT_MS)
    return () => clearTimeout(timer)
  }, [moment])

  // Each court's bell rings as its turn begins.
  useEffect(() => {
    if (winner) {
      if (hotSeat ? winner !== 'draw' : winner === human) {
        sfx.win()
        haptic('reward')
      } else {
        sfx.lose()
        haptic('danger')
      }
    } else if (state.eclipse && !wasEclipse.current) {
      sfx.eclipse()
      haptic('rumble')
    }
    else if (state.turn !== lastTurn.current) turnBell(state.turn)
    lastTurn.current = state.turn
    wasEclipse.current = state.eclipse
  }, [state, winner, human, hotSeat])

  // Follows the connection: the other player's actions arrive through it.
  useEffect(() => session?.listen(setNet), [session])

  // The turn announcement fades after a second and then lets play go on.
  useEffect(() => {
    if (!banner || handover) return
    const timer = setTimeout(() => setBanner(null), TURN_BANNER_MS)
    return () => clearTimeout(timer)
  }, [banner, handover])

  // Keeps the unfinished game saved so it can be resumed after leaving.
  useEffect(() => {
    const last = history[history.length - 1].state
    onSave(last.winner || history.length < 2 ? null : recordOf(history))
    // A move by link ends the visit: the link to send is on the next screen. A decided game waits for Continue.
    if (mail && !last.winner && history.length > record.actions.length + 1 && last.turn !== human) mail(recordOf(history))
    // onSave is read fresh; only a change to the game itself should save.
    // oxlint-disable-next-line react/exhaustive-deps
  }, [history])

  // The payouts settle when the result opens, not on Continue.
  const [rewards, setRewards] = useState<string[]>([])
  const paid = useRef(false)
  // The first win is known when the game starts; settling must not take the confetti away.
  const [firstWinAtStart] = useState(firstWin)
  useEffect(() => {
    const last = history[history.length - 1].state
    if (!last.winner || paid.current) return
    paid.current = true
    if (onEnded) setRewards(onEnded(last.winner, recordOf(history)))
    // Runs once, when the game is decided.
    // oxlint-disable-next-line react/exhaustive-deps
  }, [history])

  /** Capture feedback: the board shakes, and a run of captures by one court is named and sounded. */
  const celebrate = (steps: Step[], from: GameState, to: GameState) => {
    const lost = piecesLost(from, to)
    if (lost === 0) return
    const leaderFell = from.pieces.some((p) => p.role === 'leader' && !to.pieces.some((q) => q.id === p.id))
    const shake = shakeFor(lost, leaderFell, getSettings().reduceMotion)
    const board = document.querySelector('.board')
    // A fallen Leader freezes the board for a beat before it shakes.
    const stop = leaderStopMs(leaderFell, getSettings().reduceMotion)
    if (stop && board) {
      board.classList.add('hitstop')
      setTimeout(() => board.classList.remove('hitstop'), stop)
    }
    if (shake && board?.animate) {
      const { px } = shake
      board.animate(
        [{ translate: '0 0' }, { translate: `${-px}px ${px / 3}px` }, { translate: `${px}px ${-px / 3}px` }, { translate: `${-px / 2}px 0` }, { translate: '0 0' }],
        { duration: shake.ms, easing: 'ease-out', delay: stop, fill: 'backwards' },
      )
    }
    const streak = streakAfter(steps)
    const label = streak && streakLabel(streak.count)
    if (streak && label) {
      sfx.streak(streak.count)
      setCombo({ key: steps.length, label: `${label} ×${streak.count}`, court: streak.court })
    }
  }

  /** Spell effects, the Eclipse cinematic and beacon pickups: all show-only, and all skipped when motion is reduced. */
  const spectacle = (action: Action, to: GameState) => {
    if (getSettings().reduceMotion) return
    if (action.type === 'cast') {
      const path = castPath(state, state.turn, action.spell, action.pieceId, action.to)
      if (path) setCastFx({ key: history.length, spell: action.spell, ...path })
    }
    if (eclipseCinemaMs(false) && to.eclipse && !state.eclipse && !to.winner) setCinema(true)
    const flip = human === 'umbral' && (!hotSeat || flipBoard)
    const picks = beaconPickups(state, to).filter((p) => !state.config.fog || hotSeat || p.court === human)
    picks.forEach((p) => flyBeacon(p.pos, p.court, flip, sizeOf(state.config)))
    if (picks.length > 0 && sound) sfx.beaconFly()
  }

  /** Plays an action: the one place the game moves forward, so the history doubles as the game's log. */
  const play = (given: Action, remote = false) => {
    let action = given
    if (online && !remote) {
      // The session settles any capture and sends the action; the game keeps what it settled.
      if (!session!.play(given)) return
      action = session!.view().actions.at(-1)!
    }
    const s = reduce(state, action)
    if (s === state) return
    if (action.type === 'cast') {
      sfx.cast()
      haptic('confirm')
    } else if (s.lastDuel) {
      sfx.hit(2)
      haptic('capture')
    } else {
      sfx.move()
      haptic('move')
    }
    turnClock.spend()
    spectacle(action, s)
    const steps = [...history, { state: s, action }]
    setHistory(steps)
    celebrate(steps, state, s)
    const named = momentOf(steps, momentsSeen.current)
    if (named) {
      momentsSeen.current.add(named.id)
      setMoment({ ...named, key: steps.length })
    }
    if (!getSettings().reduceMotion) setKill(killShotOf(steps))
    say(steps, state, action, s)
    if (s.turn !== state.turn && !s.winner) setBanner({ court: s.turn })
    setSettled(null)
    setSelectedId(null)
    setInspectId(null)
    setInspectSq(null)
    setCasting(null)
    setCastFirst(null)
    setPending(null)
    setBlunder(null)
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
    if (p.byAi) play(move, online)
    else commit(move)
  }

  /** Settle a capture: play it live, or let the duel AI play it out at the auto-duel skill. */
  const beginDuel = (p: Pending) => {
    if (!settleAuto) return setPending({ ...p, confirmed: true })
    const attacker = state.pieces.find((x) => x.id === p.pieceId)
    const defender = pieceAt(state, p.to)
    if (!attacker || !defender) return
    const skills: [number, number] = even ? [AUTO_DUEL_SKILL, AUTO_DUEL_SKILL] : p.byAi ? [foeSkill, AUTO_DUEL_SKILL] : [AUTO_DUEL_SKILL, foeSkill]
    const duel = autoDuel(attacker, defender, squareLuminance(state, p.to), skills, state.rng + state.round,
      even ? [1, 1] : p.byAi ? [foeAggression, 1] : [1, foeAggression], fightCells(attacker, defender, !!p.byAi))
    setPending({ ...p, confirmed: true })
    setSettled({ pending: p, outcome: duel })
  }

  // The AI court takes its turn after a short pause, searching off the main thread.
  const aiFocus = useAiTurn({
    state, active: !online && !mail && !myTurn && !state.winner && !pending && !failed && !banner, difficulty, personality,
    onAct: (action) => {
      if (getSettings().aiWhy) setAiWhy({ at: history.length, text: explainMove(state, action, personality) })
      if (action.type === 'move' && pieceAt(state, action.to)) beginDuel({ pieceId: action.pieceId, to: action.to, confirmed: true, byAi: true })
      else play(action)
    },
  })

  const pickSpell = (spell: Spell | null) => {
    if (banner) return
    clearHint()
    setSelectedId(null)
    setCastFirst(null)
    if (spell && spellTargets(state, human, spell).none) return play({ type: 'cast', spell })
    setCasting(spell)
  }

  const onSquare = useLatest((p: Pos) => {
    if (ended || pending || banner || blunder) return
    if (!myTurn) {
      // Off-turn taps only look at pieces.
      const occ = pieceAt(state, p)
      setInspectSq(occ ? null : p)
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
      const action = { type: 'move' as const, pieceId: selected.id, to: p }
      const warn = blunderOn && !blunderSkip ? blunderOf(state, selected.id, p) : null
      if (warn) return setBlunder({ action, text: warn.kind === 'piece' ? t('blunder.piece', { odds: warn.odds }) : t('blunder.leader') })
      return commit(action)
    }
    clearHint()
    const occ = pieceAt(state, p)
    if (occ && occ.court === human) {
      sfx.select()
      haptic('select')
    } else if (selected) {
      sfx.deny()
      haptic('deny')
    }
    setSelectedId(occ && occ.court === human ? occ.id : null)
    setInspectId(occ ? occ.id : null)
    setInspectSq(occ ? null : p)
  })

  // Both players asked for another match and the session has dealt it.
  useEffect(() => {
    if (online && ended && net?.status === 'playing') onRematch?.(net)
    // oxlint-disable-next-line react/exhaustive-deps
  }, [net, ended])

  // The other player's actions are played as they arrive; a capture shows its settled duel first.
  useEffect(() => {
    if (!net || settled || pending || asking) return
    const next = net.actions[history.length - 1]
    if (!next) return
    if (next.type === 'move' && next.duel && pieceAt(state, next.to)) {
      const p: Pending = { pieceId: next.pieceId, to: next.to, confirmed: true, byAi: true }
      setPending(p)
      setSettled({ pending: p, outcome: next.duel })
    } else play(next, true)
    // play is read fresh; only a new action or a cleared dialog should step the game.
    // oxlint-disable-next-line react/exhaustive-deps
  }, [net, history, settled, pending, asking])

  const undo = () => {
    turnClock.reset()
    setBubble(null)
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
  // Stable props keep the memoised board from redrawing on every clock tick.
  const pendingMover = pending?.pieceId
  const defenderId = defender ? defender.id : undefined
  const boardFocus = useMemo(
    () => (pendingMover ? { mover: pendingMover, target: defenderId } : aiFocus ?? (hinted ? { mover: hinted.mover, target: hinted.target } : undefined)),
    [pendingMover, defenderId, aiFocus, hinted],
  )
  const boardHint = useMemo(
    () => (hinted ? { from: hinted.from, to: hinted.to, square: hinted.square, pieceId: hinted.mover } : undefined),
    [hinted],
  )
  const result = puzzleLimit !== undefined
    ? winner === human ? t('game.solved') : t('game.notSolved')
    : dropped ? DROPPED_TEXT[net?.reason ?? 'closed'] ?? t('game.connLost')
    : winner === 'draw' ? t('game.draw')
    : hotSeat ? t('game.courtWins', { court: COURT_NAME[winner ?? 'solari'] })
    : winner === human ? t('game.victory') : t('game.defeat')
  const resultTone: ResultTone = dropped || puzzleLimit !== undefined && winner !== human ? 'plain'
    : winner === 'draw' ? 'draw' : hotSeat ? 'win' : winner === human ? 'win' : 'lose'
  const resultStats: ResultStat[] = hotSeat || dropped || puzzleLimit !== undefined ? [] : [
    { label: t('game.rounds'), value: state.round },
    { label: t('game.felled'), value: history[0].state.pieces.filter((p) => p.court !== human).length - state.pieces.filter((p) => p.court !== human).length },
    { label: t('game.standing'), value: state.pieces.filter((p) => p.court === human).length },
  ]
  /** One line on what this battle is for: a puzzle's first sentence, else the goal followed by where the game comes from. */
  const objective = puzzle ? puzzle.text.split(/(?<=[.!?])\s/)[0]
    : [matchGoal(state.config), online ? t('setup.online') : hotSeat ? t('game.hotSeat') : context?.label, coop && state.turn === 'solari' ? t('game.player', { n: coopTurn }) : null].filter(Boolean).join(' · ')
  /** The attack summary is up: it takes over the tray, and the tray's own controls step aside. */
  /** Pieces of the side to move that an enemy Bind has frozen for this turn. */
  const bound = state.pieces.filter((p) => p.court === state.turn && p.bound)
  const confirming = !!pending && !pending.confirmed

  const retry = () => {
    turnClock.reset()
    setHistory((h) => h.slice(0, 1))
    setAiWhy(null)
    setBanner({ court: history[0].state.turn })
    setSelectedId(null)
    setCasting(null)
    setCastFirst(null)
    setPending(null)
    clearHint()
  }

  /** The named opponent reacts to what just happened, if there is one and it is not a game between people. */
  function say(steps: Step[], before: GameState, action: Action, after: GameState) {
    if (!persona || even) return
    const side = foe
    const first = !steps.slice(0, -2).some((s) => s.state.turn === side)
    const category = triggerFor(before, action, after, side, first)
    const felt = moodFor(category)
    if (felt && getSettings().banter !== 'off') setMood({ mood: felt, key: steps.length })
    if (category) talk(category, steps.length - 1)
  }
  function talk(category: LineCategory, ply: number) {
    if (!persona || !lineAllowed(getSettings().banter, category)) return
    const said = speak(banter.current, persona.id, category, ply)
    if (!said) return
    banter.current = said.banter
    setBubble(said.line)
  }

  // A long think earns a nudge, once per turn.
  useEffect(() => {
    if (!persona || even || !myTurn || ended || banner || history.length < 2) return
    const timer = setTimeout(() => talk('idle', history.length - 1), IDLE_MS)
    return () => clearTimeout(timer)
    // talk is read fresh; only a new turn should restart the wait.
    // oxlint-disable-next-line react/exhaustive-deps
  }, [persona, even, myTurn, ended, banner, history.length])

  const farewell = persona && ended && getSettings().banter !== 'off' ? farewellLine(persona.id, state.winner, human, String(record.initial.config.seed)) : null
  const [coaching, setCoaching] = useState(false)
  const streaks = useMemo(() => streaksOf(history), [history])
  /** The meter follows the player's court, or in hot-seat whichever court is on the longer streak. */
  const meterCourt: Court = hotSeat ? (streaks.umbral > streaks.solari ? 'umbral' : 'solari') : human
  const dusk = musicLevel(state)
  const eclipseFallen = state.eclipse && !state.winner
  return (
    <main className={`app timed game-${human}${eclipseFallen ? ' eclipsed' : ''}${leaderDanger ? ' leader-danger' : ''}`} style={{ '--dusk': dusk, '--card-rows': 4 + (state.config.cells?.length ? 1 : 0) + (state.config.passives ? 1 : 0) + (state.config.growth ? 1 : 0) } as CSSProperties}>
      <Dial state={state} chip={chipOn} face={persona && !even && getSettings().banter !== 'off' ? persona.id : undefined} mood={ended ? (state.winner === foe ? 'pleased' : state.winner === human ? 'stung' : 'calm') : mood?.mood} />
      <ol className="sr-only" role="log" aria-label={t('game.moves')} aria-relevant="additions">{log.map((line, i) => <li key={history.length - log.length + i}>{line}</li>)}</ol>
      <p className="objective" aria-label={t('game.objective')}>{objective}</p>
      {aiWhy && myTurn && !ended && history.length > aiWhy.at && <p className="ai-why" role="status">{aiWhy.text}</p>}
      <p className="sr-only" role="status" aria-live="polite">{persona && bubble && !even && !ended ? t('game.says', { name: persona.name, line: bubble }) : ''}</p>
      {persona && bubble && !even && !ended && <PersonaBubble persona={persona} text={bubble} onDismiss={() => setBubble(null)} />}
      <Board state={state} selected={selected} moves={moves} threats={threats} endangered={endangered} odds={odds} nextOdds={nextOdds} nextLight={nextLight} targetIds={targets?.pieces ?? NO_IDS} onSquare={onSquare}
        focus={boardFocus} hint={boardHint} trail={trail} reach={reach} fogFor={state.config.fog && !hotSeat && !online && !ended ? human : undefined} flip={human === 'umbral' && (!hotSeat || flipBoard)} winAt={winAt} cast={castFx} />
      {cinema && <EclipseCinematic onDone={() => setCinema(false)} />}
      {kill && <KillCam shot={kill} flip={human === 'umbral' && (!hotSeat || flipBoard)} onDone={() => setKill(null)} />}
      <FallenTrays captured={state.captured} />
      {!ended && <StreakMeter court={meterCourt} count={streaks[meterCourt]} />}
      <CellLegend cells={state.config.cells} />
      {pending?.confirmed && !settled && attacker && defender && (
        <DuelView attacker={attacker} defender={defender} luminance={squareLuminance(state, pending.to)} cells={fightCells(attacker, defender, !!pending.byAi)}
          boardId={state.config.board} cellEffects={[cellAt(state.config, attacker.pos), cellAt(state.config, defender.pos)]}
          options={options} playerSide={pending.byAi ? 1 : 0} opponentSkill={foeSkill} opponentAggression={foeAggression} foeRamp={tuning.foeRamp} assist={duelAssistOk}
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
      {banner && !ended && handover && (
        <button key={banner.court + history.length} className={`pass-screen ${banner.court}`} onClick={() => setBanner(null)}>
          <strong>{coop ? t('game.playerToMove', { n: coopTurn }) : t('game.courtToMove', { court: COURT_NAME[banner.court] })}</strong>
          <span>{t('game.handOver')}</span>
        </button>
      )}
      {banner && !ended && !handover && (
        <div key={banner.court + history.length} className={`turn-banner ${banner.court}`} role="status"
          ref={(el) => {
            // Centre on the board, not the screen.
            const board = el?.parentElement?.querySelector('.board')?.getBoundingClientRect()
            if (el && board) { el.style.left = `${board.left + board.width / 2}px`; el.style.top = `${board.top + board.height / 2}px` }
          }}>
          {hotSeat ? t('game.courtTurn', { court: COURT_NAME[banner.court] }) : coop && banner.court === human ? t('game.playerTurn', { n: coopTurn }) : banner.court === human ? t('game.yourTurn') : online ? t('game.theirTurn') : t('game.aiTurn')}
        </div>
      )}
      {combo && !ended && <div key={combo.key} className={`combo ${hotSeat ? combo.court : combo.court === human ? 'mine' : 'theirs'}`} role="status">{combo.label}</div>}
      {moment && !ended && (
        <button key={moment.key} className={`moment ${moment.court ?? 'both'}`} aria-live="polite" onClick={() => setMoment(null)}>{t(`moment.${moment.id}`)}</button>
      )}
      {lost && (
        <div className="confirm result" role="dialog" aria-label={t('game.connLost')}>
          <p className="confirm-title">{t('game.connLost')}</p>
          <p>{t('game.connKept')}</p>
          <div className="buttons">
            {onReconnect && <button className="primary" onClick={() => onReconnect({ initial: record.initial, actions: [...net!.actions] })}><Icon name="chain" />{t('game.reconnect')}</button>}
            <button className="back" onClick={() => { session?.resign(); onExit(null, recordOf(history)) }}><Icon name="exit" />{t('game.resign')}</button>
          </div>
        </div>
      )}
      {online && !ended && net?.draw === 'asked' && (
        <div className="confirm result" role="dialog" aria-label={t('game.drawOffered')}>
          <p className="confirm-title">{t('game.drawOffered')}</p>
          <p>{t('game.drawText')}</p>
          <div className="buttons">
            <button className="primary" onClick={() => session!.answerDraw(true)}><Icon name="check" />{t('game.accept')}</button>
            <button onClick={() => session!.answerDraw(false)}><Icon name="close" />{t('game.decline')}</button>
          </div>
        </div>
      )}
      {online && net?.chat && net.chat.from === 'them' && <div key={net.chat.n} className="chat-bubble" role="status">{CHAT_LINES[net.chat.id]}</div>}
      {ended && (
        <div className="confirm result" role="dialog" aria-label={t('game.over')}>
          {(hotSeat ? winner !== 'draw' : winner === human) && <WinBurst />}
          {winner === human && !hotSeat && !online && <Confetti count={confettiCount(!!firstWinAtStart, flashesReduced())} />}
          <ResultBanner title={result} tone={resultTone} stats={resultStats} />
          <RewardLines lines={rewards} />
          {persona && !even && farewell && <p className="persona-farewell"><b>{persona.name}</b> “{farewell}”</p>}
          <div className="buttons">
            {puzzleLimit !== undefined && !puzzle?.rush && state.winner !== human && <button onClick={retry}><Icon name="undo" />{t('game.tryAgain')}</button>}
            {disagreed && <button onClick={() => void navigator.clipboard?.writeText(session!.report()).catch(() => {})}><Icon name="chain" />{t('game.copyReport')}</button>}
            {puzzleLimit === undefined && !dropped && <ShareButton title={t('game.replayTitle')} label={t('game.copyReplay')} link={() => replayLink(recordOf(history))} />}
            {online && !dropped && history.length > 1 && <ShareButton title={t('game.watchTitle')} label={t('game.copyWatch')} link={() => watchLink(recordOf(history))} />}
            {online && net && net.rematch !== 'none' && (
              <button disabled={net.rematch === 'sent'} onClick={() => session!.rematch()}>
                <Icon name="undo" />{net.rematch === 'sent' ? t('game.waitingThem') : net.rematch === 'asked' ? t('game.acceptRematch') : t('game.rematch')}
              </button>
            )}
            {!hotSeat && !online && !mail && puzzleLimit === undefined && !dropped && history.length > 1 && (context?.kind === 'skirmish' || context?.kind === 'campaign' || context?.kind === 'daily') && (
              <button onClick={() => onExit(winner ?? foe, recordOf(history), true)}><Icon name="flame" />{t('game.review')}</button>
            )}
            {canGrudge && persona && winner === foe && <button onClick={() => onExit(winner, recordOf(history), false, 'grudge')}><Icon name="flame" />{t('game.grudge')}</button>}
            {canPlayAgain && <button onClick={() => onExit(winner ?? foe, recordOf(history), false, 'same')}><Icon name="undo" />{t('game.playAgain')}</button>}
            {canPlayAgain && canSwap && !hotSeat && <button onClick={() => onExit(winner ?? foe, recordOf(history), false, 'swap')}><Icon name="cycle" />{t('game.swapSides')}</button>}
            <button className="primary" onClick={() => onExit(winner ?? foe, recordOf(history))}><Icon name="onward" />{t('tray.continue')}</button>
          </div>
        </div>
      )}
      {coach && !ended && !pending && !asking && (() => {
        const line = coachLine(state, human, selected, moves)
        return line && <p className="coach-line" role="status"><Icon name="bulb" />{line}</p>
      })()}
      {hint && myTurn ? <HintCard hint={hint} source={puzzleHelp ? t('game.fromSetter') : undefined} />
        : !shown && inspectSq ? <CellCard state={state} pos={inspectSq} /> : (
        <PieceCard state={state} human={human} piece={shown}
          hint={myTurn ? t('game.tapYours') : t('game.tapAny')} />
      )}
      <footer className={`tray${confirming ? ' confirming' : ''}`}>
        {clock && <div className={myTurn && !ended ? undefined : 'keep-space'} aria-hidden={!myTurn || ended}>
          <ClockRing clock={clock} elapsedMs={elapsed} bankMs={banks[state.turn]} court={state.turn} paused={!clockRunning} />
        </div>}
        <div className={!ended && !pending && myTurn ? undefined : 'keep-space'} aria-hidden={ended || !!pending || !myTurn}>
          <SpellBar state={state} active={casting} onPick={pickSpell} exchanging={!!castFirst} />
          {reminder && reminder.ready.length > 0 && !casting && (
            <p className="spell-hint" role="status">
              {t('reminder.spells', { list: reminder.ready.map((r) => (r.targets ? `${SPELL_INFO[r.spell].name} (${r.targets})` : SPELL_INFO[r.spell].name)).join(', ') })}
              {reminder.idle && ` ${t('reminder.idle')}`}
            </p>
          )}
        </div>
        <div className="options">
          {hotSeat ? (
            <>
              <label><input type="checkbox" checked={passScreen} onChange={() => setPassScreen((v) => !v)} /> {t('game.passScreen')}</label>
              <label><input type="checkbox" checked={flipBoard} onChange={() => setFlipBoard((v) => !v)} /> {t('game.facePlayer')}</label>
            </>
          ) : online ? null : (<>
            {coop && <label><input type="checkbox" checked={passScreen} onChange={() => setPassScreen((v) => !v)} /> {t('game.passScreen')}</label>}
            <label><input type="checkbox" checked={duelMode === 'auto'} onChange={() => setDuelMode((m) => (m === 'live' ? 'auto' : 'live'))} /> {t('game.autoDuel')}</label>
          </>)}
          <label><input type="checkbox" checked={options.mirror} onChange={() => toggle('mirror')} /> {t('game.mirror')}</label>
          <label><input type="checkbox" checked={options.aimAssist} onChange={() => toggle('aimAssist')} /> {t('game.aimAssist')}</label>
          <label><input type="checkbox" checked={options.haptics} onChange={() => toggle('haptics')} /> {t('game.haptics')}</label>
          <label><input type="checkbox" checked={sound} onChange={toggleSound} /> {t('game.sound')}</label>
          <label><input type="checkbox" checked={music} onChange={() => { setMusicOn(!music); setMusic(!music) }} /> {t('game.music')}</label>
        </div>
        <p className="status">
          {ended
            ? result
            : puzzleLimit !== undefined && myTurn
              ? t('game.turnOf', { n: turnsTaken + 1, total: puzzleLimit })
              : !myTurn
              ? online ? t('game.waitingOpp') : t('game.oppThinking')
              : bound.length
                ? t(bound.length > 1 ? 'game.boundMany' : 'game.boundOne', { who: hotSeat ? COURT_NAME[state.turn] : t('game.your'), name: ROLE_NAMES[state.turn][bound[0].role], more: bound.length - 1 })
              : duel
                ? t('game.lastDuel', { text: describeDuel(duel) })
                : t('game.tapSquare')}
        </p>
        <div className="buttons">
          {!online && !mail && context?.kind !== 'daily' && !context?.scored && takeBackOk && <button disabled={history.length < 2} onClick={undo}><Icon name="undo" />{t('game.undo')}</button>}
          {online && !ended && net?.status === 'playing' && (
            <>
              <button disabled={net.draw !== 'none'} onClick={() => session!.offerDraw()}><Icon name="swap" />{net.draw === 'offered' ? t('game.drawOfferedBtn') : t('game.offerDraw')}</button>
              <select aria-label={t('game.say')} value="" onChange={(e) => { if (e.target.value) session!.say(e.target.value as (typeof CHAT_IDS)[number]) }}>
                <option value="">{t('game.sayOption')}</option>
                {CHAT_IDS.map((id) => <option key={id} value={id}>{CHAT_LINES[id]}</option>)}
              </select>
            </>
          )}
          {!state.config.fog && <button aria-pressed={aids} className={aids ? 'on' : undefined} onClick={() => setAids(updateSettings({ aids: !aids }).aids)}><Icon name="shield" />{t('game.danger')}</button>}
          {!hotSeat && !online && hintMode !== 'off' && <button className={hint ? 'hint on' : 'hint'} disabled={ended || !myTurn || !!pending || !!banner || (hintMode === 'three' && !hint && hintsLeft === 0)} onClick={askHint}><Icon name="bulb" />{t('tray.hint')}{puzzleHelp && hintLevel > 0 && hintLevel < 3 ? ` ${hintLevel}/3` : ''}{puzzleHelp && hintLevel === 3 && sinks.hints > 0 ? ` (${t('puzzle.seer')}, ${sinks.hints})` : ''}{hintMode === 'three' ? ` (${t('game.hintsLeft', { n: hintsLeft })})` : ''}</button>}
          <button disabled={ended || !myTurn || !!pending || !!banner} onClick={() => play({ type: 'pass' })}><Icon name="hourglass" />{t('game.endTurn')}</button>
          <button className="back" onClick={() => { if (ended) onExit(null, recordOf(history)); else setQuitAsk(true) }}><Icon name="exit" />{online && !ended ? t('game.resign') : t('game.quit')}</button>
        </div>
        {quitAsk && !ended && (
          <div className="confirm" role="dialog" aria-label={online ? t('game.confirmResign') : t('game.confirmQuit')}>
            <p className="confirm-title">{online ? t('game.resignAsk') : t('game.quitAsk')}</p>
            <div className="buttons">
              <button onClick={() => setQuitAsk(false)}><Icon name="close" />{t('game.keepPlaying')}</button>
              <button className="primary" onClick={() => { setQuitAsk(false); if (online) session?.resign(); onExit(null, recordOf(history)) }}><Icon name="exit" />{online ? t('game.resign') : t('game.quit')}</button>
            </div>
          </div>
        )}
        {blunder && !pending && (
          <div className="confirm" role="dialog" aria-label={t('game.confirmMove')}>
            <p className="confirm-title">{blunder.text}</p>
            <label className="recharge"><input type="checkbox" checked={blunderSkip} onChange={() => setBlunderSkip(!blunderSkip)} /> {t('blunder.skip')}</label>
            <div className="buttons">
              <button onClick={() => setBlunder(null)}><Icon name="close" />{t('game.rethink')}</button>
              <button className="primary" onClick={() => { const { action } = blunder; setBlunder(null); commit(action) }}><Icon name="check" />{t('game.moveAnyway')}</button>
            </div>
          </div>
        )}
        {confirming && attacker && defender && (
          <AttackConfirm attacker={attacker} defender={defender} live={!settleAuto}
            cells={{ attacker: cellAt(state.config, attacker.pos), defender: cellAt(state.config, defender.pos) }}
            detail={detailOn ? nextDetail(state, attacker, defender, pending.to) : undefined}
            luminance={squareLuminance(state, pending.to)}
            odds={estimateOdds(attacker, defender, squareLuminance(state, pending.to), undefined, fightCells(attacker, defender, !!pending.byAi))}
            onConfirm={() => beginDuel(pending)} onCancel={() => setPending(null)} />
        )}
      </footer>
      {briefing && puzzle && (
        <div className="puzzle-intro-backdrop">
          <section className="puzzle-intro" role="dialog" aria-label={t('game.puzzleLabel', { name: puzzle.name })}>
            <div className="puzzle-intro-icon"><Icon name="puzzle" /></div>
            <h2>{puzzle.name}</h2>
            <span className="pill">{t('game.winIn', { count: puzzleLimit ?? 0 })}</span>
            <p>{puzzle.text}</p>
            <div className="puzzle-intro-foot"><button onClick={() => setBriefing(false)}><Icon name="check" />{t('tip.gotIt')}</button></div>
          </section>
        </div>
      )}
      <CoachMarks hidden={briefing || !!banner || !!pending || !!settled || !!asking || ended} onActive={setCoaching} />
      <TipCard float hidden={coaching || briefing || !!banner || !!pending || !!settled || !!asking || ended}
        page={[
          'game', !!state.config.cells?.length && 'game-cells', hotSeat && 'game-hotseat', online && 'game-online',
          puzzleLimit !== undefined && 'game-puzzle', !!state.config.objective && context?.kind !== 'story' && 'game-scenario',
          context?.kind === 'story' && 'game-story', context?.kind === 'gauntlet' && 'game-gauntlet', context?.kind === 'series' && 'game-series',
          sizeOf(state.config) === 9 && 'game-grand', modeOf(state.config) !== 'beacons' && !state.config.objective && 'game-modes',
          !!state.config.events && 'game-events', (!!state.config.growth || !!state.config.promotion) && 'game-growth', !!clock && 'game-clock',
          !!state.config.passives && 'game-passives', !!state.config.loadouts && 'game-loadout', !!state.config.recharge && 'game-recharge',
          !!state.config.fog && 'game-fog', !!state.config.suddenDeath && 'game-sudden', !!state.config.edge && 'game-edge',
          context?.kind === 'daily' && 'game-daily', context?.flavour === 'weekly' && 'game-weekly', context?.flavour === 'ladder' && 'game-ladder',
          !!mail && 'game-mail', !!puzzle?.rush && 'game-rush',
        ]} />
    </main>
  )
}
