/** Early-play help: a first-steps checklist, coaching lines for the first battle, and advice after early losses. */
import { clearedCount, type Progress } from './progress'
import { legalMoves, pieceAt } from './engine/rules/moves'
import type { Difficulty } from './engine/data/difficulty'
import type { Court, GameState, Piece, Pos } from './engine/rules/types'

const KEY = 'eclipse-court:onboarding'

export type Result = 'win' | 'loss' | 'draw'

export interface Onboarding {
  /** The last few games against the AI at a difficulty the player chose, oldest first. */
  recent: { difficulty: Difficulty; result: Result }[]
  /** Games ever recorded, so a dismissed piece of advice stays dismissed until newer games change the picture. */
  total: number
  /** The `total` at which advice was last dismissed. */
  hushedAt: number
  /** The first-steps checklist was dismissed. */
  listHidden: boolean
}

const RECENT = 6
const empty = (): Onboarding => ({ recent: [], total: 0, hushedAt: 0, listHidden: false })

function read(): Onboarding {
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(KEY) ?? 'null')
    if (!raw || typeof raw !== 'object') return empty()
    const o = raw as Partial<Onboarding>
    const recent = Array.isArray(o.recent)
      ? o.recent.filter((g) => g && ['easy', 'normal', 'hard'].includes(g.difficulty) && ['win', 'loss', 'draw'].includes(g.result)).slice(-RECENT)
      : []
    const num = (n: unknown) => (typeof n === 'number' && Number.isFinite(n) && n >= 0 ? n : 0)
    return { recent, total: num(o.total), hushedAt: num(o.hushedAt), listHidden: o.listHidden === true }
  } catch {
    return empty()
  }
}

type Listener = () => void
const listeners = new Set<Listener>()

/** Held in memory too, so a device without storage still works for the visit. */
let state = read()

function save(next: Onboarding) {
  state = next
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    // Without storage the help simply starts over next visit.
  }
  listeners.forEach((l) => l())
}

export const onboardingSnapshot = () => state
export const subscribeOnboarding = (l: Listener) => {
  listeners.add(l)
  return () => { listeners.delete(l) }
}

/** Forgets everything, for tests and for a player who wants the help back. */
export function resetOnboarding() {
  try {
    localStorage.removeItem(KEY)
  } catch {
    // Nothing was stored.
  }
  state = empty()
  listeners.forEach((l) => l())
}

/** Notes a finished game against the AI at a difficulty the player picked. */
export function recordAiGame(difficulty: Difficulty, result: Result) {
  save({ ...state, recent: [...state.recent, { difficulty, result }].slice(-RECENT), total: state.total + 1 })
}

export const hideAdvice = () => save({ ...state, hushedAt: state.total })
export const hideChecklist = () => save({ ...state, listHidden: true })

export interface Advice {
  from: Difficulty
  to: Difficulty
  text: string
}

const EASIER: Record<Difficulty, Difficulty | null> = { hard: 'normal', normal: 'easy', easy: null }
const NAME: Record<Difficulty, string> = { easy: 'Easy', normal: 'Normal', hard: 'Hard' }

/** A gentle suggestion once the latest games at one difficulty were two losses in a row (and none since were won). */
export function adviceFor(o: Onboarding): Advice | null {
  if (o.total <= o.hushedAt) return null
  const last = o.recent[o.recent.length - 1]
  const before = o.recent[o.recent.length - 2]
  if (!last || !before) return null
  if (last.result !== 'loss' || before.result !== 'loss' || last.difficulty !== before.difficulty) return null
  const to = EASIER[last.difficulty]
  if (!to) return null
  return {
    from: last.difficulty, to,
    text: `Two ${NAME[last.difficulty]} games in a row ended in defeat. There is no shame in that: try ${NAME[to]} for a while, or use the Hint button, and move back up when it feels comfortable.`,
  }
}

export interface Step {
  id: string
  text: string
  done: boolean
}

/** The first things worth doing, in order. `learned` means the tutorial was finished or skipped. */
export function checklist(progress: Progress, learned: boolean): Step[] {
  return [
    { id: 'learn', text: 'Learn the rules', done: learned },
    { id: 'battle', text: 'Win a campaign battle', done: clearedCount(progress) > 0 },
    { id: 'skirmish', text: 'Play a skirmish', done: progress.areas.skirmish.games > 0 },
    { id: 'puzzle', text: 'Solve a puzzle', done: progress.puzzles.length > 0 },
    { id: 'daily', text: 'Play the daily match', done: progress.daily.last !== null },
  ]
}

/** Whether the checklist is worth showing: the player has begun, has things left, and has not put it away. */
export const showChecklist = (steps: readonly Step[], o: Onboarding) =>
  !o.listHidden && steps[0].done && steps.some((s) => !s.done)

/** The player has never cleared a campaign battle, so the first one comes with coaching. */
export const isFirstBattle = (progress: Progress, campaignIndex: number | null) =>
  campaignIndex === 0 && clearedCount(progress) === 0

/** A prompt for the first battle, chosen from what is on the board and what the player has selected. */
export function coachLine(s: GameState, human: Court, selected: Piece | null, moves: readonly Pos[]): string | null {
  if (s.winner || s.turn !== human) return null
  const foe = (to: Pos) => pieceAt(s, to)?.court !== human && !!pieceAt(s, to)
  if (selected) {
    if (moves.some(foe)) return 'One of the highlighted squares holds an enemy. Tap it to attack: a duel decides the fight. Or tap an empty highlighted square to move there.'
    if (moves.length === 0) return 'This piece cannot move right now. Tap another of yours.'
    return 'The highlighted squares are everywhere this piece can go. Tap one to move there, or tap the piece again to choose another.'
  }
  const mine = s.pieces.filter((p) => p.court === human)
  if (mine.some((p) => legalMoves(s, p).some(foe))) return 'An enemy is within reach. Select the piece that can hit it, then tap the enemy to attack.'
  return 'Your turn. Tap one of your pieces to select it, then choose where it goes. Holding the beacons is how you win; End Turn passes if you would rather wait.'
}
