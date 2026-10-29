/** The most dramatic recent games, kept so the main menu can name a Game of the Week. */
import { gameOfTheWeek, keepBest, MAX_CODE, rateFacts, type GameFacts, type Highlight } from './engine/data/highlights'
import { replaySteps, type GameRecord } from './engine/log'
import { encodeRecord } from './engine/serialize'
import type { Court } from './engine/rules/types'
import { dailySeed } from './engine/data/setups'
import { piecesLost } from './juice'
import { momentOf, type MomentId } from './moments'

const KEY = 'eclipse-court:highlights'

const int = (x: unknown): x is number => typeof x === 'number' && Number.isInteger(x) && x >= 0

const entry = (raw: unknown): Highlight | null => {
  const o = raw as Partial<Highlight> | null
  const f = o?.facts as Partial<GameFacts> | undefined
  return o && typeof o === 'object' && int(o.day) && o.day > 19000101 && typeof o.score === 'number' && Number.isFinite(o.score) && f
    && int(f.captures) && int(f.moments) && int(f.leadChanges) && int(f.turns) && typeof f.won === 'boolean' && int(f.margin)
    && typeof o.code === 'string' && o.code.length > 0 && o.code.length <= MAX_CODE && /^[A-Za-z0-9_-]+$/.test(o.code)
    ? { day: o.day, score: o.score, facts: { captures: f.captures, moments: f.moments, leadChanges: f.leadChanges, turns: f.turns, won: f.won, margin: f.margin }, code: o.code } : null
}

export function parseHighlights(raw: unknown): Highlight[] {
  return Array.isArray(raw) ? raw.flatMap((x) => entry(x) ?? []).slice(0, 8) : []
}

/** Counts a finished game's facts from its steps, from `human`'s side; null if the record does not replay. */
export function factsOf(record: GameRecord, human: Court): GameFacts | null {
  const steps = replaySteps(record.initial, record.actions)
  if (!steps || steps.length < 2) return null
  const seen = new Set<MomentId>()
  let moments = 0
  let captures = 0
  let leadChanges = 0
  let leader = 0
  steps.forEach((s, i) => {
    if (i === 0) return
    captures += piecesLost(steps[i - 1].state, s.state)
    const named = momentOf(steps.slice(0, i + 1), seen)
    if (named) { seen.add(named.id); moments++ }
    const own = s.state.pieces.filter((p) => p.court === human).length
    const lead = Math.sign(own - (s.state.pieces.length - own))
    if (lead !== 0 && leader !== 0 && lead !== leader) leadChanges++
    if (lead !== 0) leader = lead
  })
  const end = steps[steps.length - 1].state
  const own = end.pieces.filter((p) => p.court === human).length
  return { captures, moments, leadChanges, turns: end.round, won: end.winner === human, margin: Math.abs(own - (end.pieces.length - own)) }
}

function load(): Highlight[] {
  try {
    return parseHighlights(JSON.parse(localStorage.getItem(KEY) ?? 'null'))
  } catch {
    return []
  }
}

let state = load()
const listeners = new Set<() => void>()

export const highlightsSnapshot = () => state
export function subscribeHighlights(l: () => void) {
  listeners.add(l)
  return () => { listeners.delete(l) }
}

/** Rates a finished game and keeps it if it is among the best of the last two weeks. */
export function recordHighlight(record: GameRecord, human: Court, today = dailySeed()) {
  const code = encodeRecord(record)
  const facts = factsOf(record, human)
  if (!facts || code.length > MAX_CODE) return
  state = keepBest(state, { day: today, score: rateFacts(facts), facts, code }, today)
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    // The game is just not kept.
  }
  listeners.forEach((l) => l())
}

/** The week's best game right now, or null. */
export const currentGameOfTheWeek = (today = dailySeed()) => gameOfTheWeek(state, today)
