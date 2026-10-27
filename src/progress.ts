import type { Difficulty } from './engine/data/difficulty'
import type { Summary } from './engine/data/summary'

export type { Summary }
import { CAMPAIGN, battlesIn, grandBattles } from './engine/data/campaign'
import { PUZZLES, puzzlesIn, type PuzzleTier } from './engine/data/puzzles'
import { SCENARIOS } from './engine/data/scenarios'
import { dayIndex, tierOfConfig } from './engine/data/setups'
import { replaySteps, type GameRecord } from './engine/log'
import type { Court } from './engine/rules/types'

const PROGRESS_KEY = 'eclipse-court:progress'
/** The pre-E8 save: just the number of opponents beaten. */
const LEGACY_KEY = 'eclipse-court:campaign'

/** The first eight battles in the order they had when progress was a list; older saves are read against it. */
const LEGACY_BATTLES = ['novice', 'archerless', 'tongue-tied', 'wall', 'troll-court', 'backwards-hour', 'iron-court', 'eclipse-queen']

export const PROGRESS_VERSION = 6

/** The three stars of a campaign battle, as bits so each is remembered on its own. */
export const STAR_WIN = 1
export const STAR_FLAWLESS = 2
export const STAR_SWIFT = 4
export const STAR_TEXT: readonly { bit: number; text: string }[] = [
  { bit: STAR_WIN, text: 'Win the battle' },
  { bit: STAR_FLAWLESS, text: 'Win without losing a piece' },
  { bit: STAR_SWIFT, text: 'Win before the Eclipse' },
]

export interface Stats {
  games: number
  wins: number
  losses: number
  draws: number
  /** Enemy pieces taken, over every game. */
  captures: number
  /** Own pieces lost, over every game. */
  piecesLost: number
  /** Seconds spent in games, puzzles, the tutorial and the practice arena. */
  playSeconds: number
}

/** What the roguelike gauntlet has shown so far. */
export interface Gauntlet {
  /** Runs begun, and runs won. */
  runs: number
  won: number
  /** The furthest stage reached in any run. */
  best: number
}

/** The one scored attempt of a day's daily match: won or lost, then rounds taken, then pieces lost. */
export interface DailyAttempt {
  /** The day as a `dailySeed`. */
  date: number
  won: boolean
  turns: number
  lost: number
}

/** The daily match so far: the latest scored attempt, and the run of days played. */
export interface Daily {
  last: DailyAttempt | null
  /** Consecutive days with a scored attempt, as of `last`. */
  streak: number
  best: number
}

export interface Progress {
  v: typeof PROGRESS_VERSION
  /** Star bits earned in each campaign battle, by battle id. */
  battles: Record<string, number>
  stats: Stats
  achievements: string[]
  /** Ids of the puzzles solved. */
  puzzles: string[]
  /** Best-of-three series won. */
  tournaments: number
  gauntlet: Gauntlet
  daily: Daily
  /** Star bits earned in each scenario, by scenario id. */
  scenarios: Record<string, number>
  /** The finished game most recently played, as a record code for the replay viewer. */
  last: string | null
}

export const emptyProgress = (): Progress => ({
  v: PROGRESS_VERSION,
  battles: {},
  stats: { games: 0, wins: 0, losses: 0, draws: 0, captures: 0, piecesLost: 0, playSeconds: 0 },
  achievements: [],
  puzzles: [],
  tournaments: 0,
  gauntlet: { runs: 0, won: 0, best: 0 },
  daily: { last: null, streak: 0, best: 0 },
  scenarios: {},
  last: null,
})

export const starCount = (bits: number) => [STAR_WIN, STAR_FLAWLESS, STAR_SWIFT].filter((b) => bits & b).length
export const totalStars = (p: Progress) => CAMPAIGN.reduce((n, o) => n + starCount(p.battles[o.id] ?? 0), 0)

/** Campaign battles won, in any tier. */
export const clearedCount = (p: Progress) => CAMPAIGN.filter((o) => (p.battles[o.id] ?? 0) & STAR_WIN).length

/** Campaign stars that open the Grand Court and the 9x9 Skirmish board. */
export const GRAND_STARS = 6

/** A tier opens its first battle at once (the Grand Court after `GRAND_STARS` stars); each later one opens when the battle before it, in the same tier, is won. */
export function battleUnlocked(p: Progress, index: number): boolean {
  const o = CAMPAIGN[index]
  const grand = o.size === 9
  const tier = grand ? grandBattles() : battlesIn(o.difficulty)
  const at = tier.indexOf(o)
  if (grand && totalStars(p) < GRAND_STARS) return false
  return at <= 0 || ((p.battles[tier[at - 1].id] ?? 0) & STAR_WIN) !== 0
}

/** Stars a campaign battle earned; none unless it was won. */
export function starsEarned(s: Summary): number {
  if (!s.won) return 0
  return STAR_WIN | (s.lost === 0 ? STAR_FLAWLESS : 0) | (s.swift ? STAR_SWIFT : 0)
}

export interface Achievement {
  id: string
  name: string
  text: string
  earned: (p: Progress, s: Summary) => boolean
}

/** Every puzzle of a tier solved; a tier with no puzzles yet never counts. */
const tierCleared = (p: Progress, tier: PuzzleTier) => {
  const list = puzzlesIn(tier)
  return list.length > 0 && list.every((z) => p.puzzles.includes(z.id))
}

export const ACHIEVEMENTS: readonly Achievement[] = [
  { id: 'first-win', name: 'First Light', text: 'Win a game.', earned: (_, s) => s.won },
  { id: 'flawless', name: 'Unscathed', text: 'Win without losing a piece.', earned: (_, s) => s.won && s.lost === 0 },
  { id: 'swift', name: 'Before the Dark', text: 'Win before the Eclipse falls.', earned: (_, s) => s.won && s.swift },
  { id: 'silent', name: 'Silent Leader', text: 'Win without casting a spell.', earned: (_, s) => s.won && s.spellsCast === 0 && !s.classic },
  { id: 'hard', name: 'Against the Tide', text: 'Win against a hard opponent.', earned: (_, s) => s.won && s.difficulty === 'hard' },
  { id: 'daily', name: 'Daily Bread', text: "Win the day's daily game.", earned: (_, s) => s.won && s.daily },
  { id: 'three-stars', name: 'Triple Crown', text: 'Earn all three stars on one opponent.', earned: (p) => Object.values(p.battles).some((b) => starCount(b) === 3) },
  { id: 'half', name: 'Halfway There', text: 'Beat four campaign opponents.', earned: (p) => clearedCount(p) >= 4 },
  { id: 'queen', name: 'Eclipse Ender', text: 'Beat the Eclipse Queen.', earned: (p) => ((p.battles['eclipse-queen'] ?? 0) & STAR_WIN) !== 0 },
  { id: 'veteran', name: 'Seasoned', text: 'Play 25 games.', earned: (p) => p.stats.games >= 25 },
  { id: 'puzzler', name: 'Puzzler', text: 'Solve three puzzles.', earned: (p) => p.puzzles.length >= 3 },
  { id: 'puzzle-master', name: 'Puzzle Master', text: 'Solve every puzzle.', earned: (p) => PUZZLES.every((z) => p.puzzles.includes(z.id)) },
  { id: 'beginner-cleared', name: 'First Steps', text: 'Solve every Beginner puzzle.', earned: (p) => tierCleared(p, 'beginner') },
  { id: 'normal-cleared', name: 'Steady Hands', text: 'Solve every Normal puzzle.', earned: (p) => tierCleared(p, 'normal') },
  { id: 'expert-cleared', name: 'Eclipse Scholar', text: 'Solve every Expert puzzle.', earned: (p) => tierCleared(p, 'expert') },
  { id: 'daily-puzzle', name: 'Puzzle of the Day', text: "Solve the day's puzzle.", earned: (_, s) => !!s.dailyPuzzle },
  { id: 'deep', name: 'Deep Delver', text: 'Reach stage 5 of the gauntlet.', earned: (p) => p.gauntlet.best >= 5 },
  { id: 'gauntlet', name: 'Court Eternal', text: 'Win a gauntlet run.', earned: (p) => p.gauntlet.won >= 1 },
  { id: 'streak-3', name: 'Three Days Running', text: 'Play the daily match three days in a row.', earned: (p) => p.daily.best >= 3 },
  { id: 'streak-7', name: 'A Week of Eclipses', text: 'Play the daily match seven days in a row.', earned: (p) => p.daily.best >= 7 },
  { id: 'scenario-first', name: 'Against the Odds', text: 'Clear a scenario.', earned: (p) => Object.values(p.scenarios).some((b) => b & STAR_WIN) },
  { id: 'scenario-all', name: 'Tactician', text: 'Clear every scenario.', earned: (p) => SCENARIOS.every((x) => (p.scenarios[x.id] ?? 0) & STAR_WIN) },
  { id: 'champion', name: 'Champion', text: 'Win a best-of-three tournament.', earned: (p) => p.tournaments >= 1 },
]

/** The progress after one finished game, and the achievements it newly earned. */
export function recordGame(p: Progress, s: Summary, replay: string | null): { progress: Progress; earned: Achievement[] } {
  const stats: Stats = {
    ...p.stats,
    games: p.stats.games + 1,
    wins: p.stats.wins + (s.won ? 1 : 0),
    losses: p.stats.losses + (!s.won && !s.draw ? 1 : 0),
    draws: p.stats.draws + (s.draw ? 1 : 0),
    captures: p.stats.captures + s.taken,
    piecesLost: p.stats.piecesLost + s.lost,
  }
  const battles = { ...p.battles }
  const id = s.campaignIndex === null ? undefined : CAMPAIGN[s.campaignIndex]?.id
  if (id && s.won) battles[id] = (battles[id] ?? 0) | starsEarned(s)
  const next: Progress = { ...p, battles, stats, last: replay ?? p.last }
  return award(next, s, p)
}

/** What no game happened looks like, for achievements earned outside a game. */
const NO_GAME: Summary = {
  won: false, draw: false, lost: 0, taken: 0, turns: 0, swift: false, spellsCast: 0, difficulty: 'normal', campaignIndex: null, daily: false,
}

function award(next: Progress, s: Summary, before: Progress): { progress: Progress; earned: Achievement[] } {
  const earned = ACHIEVEMENTS.filter((a) => !before.achievements.includes(a.id) && a.earned(next, s))
  return { progress: { ...next, achievements: [...before.achievements, ...earned.map((a) => a.id)] }, earned }
}

/** The progress after a puzzle is solved; `daily` marks the day's puzzle. */
export function recordPuzzle(p: Progress, id: string, daily: boolean) {
  const puzzles = p.puzzles.includes(id) ? p.puzzles : [...p.puzzles, id]
  return award({ ...p, puzzles }, { ...NO_GAME, dailyPuzzle: daily }, p)
}

/** The progress after a best-of-three series ends; only a win counts as a title. */
export function recordTournament(p: Progress, won: boolean) {
  return award({ ...p, tournaments: p.tournaments + (won ? 1 : 0) }, NO_GAME, p)
}

/** The progress after a scenario is won with `bits` of its stars; stars once earned are kept. */
export function recordScenario(p: Progress, id: string, bits: number) {
  return award({ ...p, scenarios: { ...p.scenarios, [id]: (p.scenarios[id] ?? 0) | bits } }, NO_GAME, p)
}

/** The progress with every puzzle unsolved again. */
export const addPlaytime = (p: Progress, seconds: number): Progress =>
  seconds > 0 ? { ...p, stats: { ...p.stats, playSeconds: p.stats.playSeconds + seconds } } : p

/** Clears the counters, the gauntlet record, the achievements and the last replay; campaign, puzzle and scenario progress have their own resets. */
export const resetStats = (p: Progress): Progress => {
  const fresh = emptyProgress()
  return { ...p, stats: fresh.stats, gauntlet: fresh.gauntlet, achievements: [], tournaments: 0, last: null }
}

export const resetPuzzles = (p: Progress): Progress => ({ ...p, puzzles: [] })

/** The progress with every scenario unplayed again. */
export const resetScenarios = (p: Progress): Progress => ({ ...p, scenarios: {} })

/** The progress with the campaign battles unbeaten and unstarred; boards and themes gated on stars lock again. */
export const resetCampaign = (p: Progress): Progress => ({ ...p, battles: {} })

export const scenarioStars = (p: Progress) => SCENARIOS.reduce((n, x) => n + starCount(p.scenarios[x.id] ?? 0), 0)

/** The progress after a gauntlet run ends at `stage` (the stage lost, or one past the last when won). */
export function recordRun(p: Progress, stage: number, won: boolean) {
  const g = p.gauntlet
  return award({ ...p, gauntlet: { runs: g.runs + 1, won: g.won + (won ? 1 : 0), best: Math.max(g.best, won ? stage - 1 : stage) } }, NO_GAME, p)
}

/** The days-in-a-row count that is still alive on `today`: it lapses after a day with no attempt. */
export function liveStreak(p: Progress, today: number): number {
  const last = p.daily.last
  return last && dayIndex(today) - dayIndex(last.date) <= 1 ? p.daily.streak : 0
}

/** The scored attempt of `date`, if one was made. */
export const dailyResult = (p: Progress, date: number) => (p.daily.last?.date === date ? p.daily.last : null)

/**
 * The progress after a daily match is finished. Only the first attempt of a day is scored, so a
 * replay changes nothing and `scored` is false.
 */
export function recordDaily(p: Progress, attempt: DailyAttempt) {
  if (p.daily.last && p.daily.last.date >= attempt.date) return { progress: p, earned: [] as Achievement[], scored: false }
  const streak = liveStreak(p, attempt.date) + 1
  const daily: Daily = { last: attempt, streak, best: Math.max(p.daily.best, streak) }
  return { ...award({ ...p, daily }, NO_GAME, p), scored: true }
}

/** How a finished game went for `human`, found by replaying it. Null if the record is not a legal game. */
export function summarise(
  record: GameRecord, human: Court, difficulty: Difficulty, campaignIndex: number | null,
): Summary | null {
  const steps = replaySteps(record.initial, record.actions)
  if (!steps) return null
  const end = steps[steps.length - 1].state
  const spellsCast = steps.filter((st, i) => i > 0 && st.action?.type === 'cast' && steps[i - 1].state.turn === human).length
  return {
    won: end.winner === human,
    draw: end.winner === 'draw',
    lost: end.captured.filter((p) => p.court === human).length,
    taken: end.captured.filter((p) => p.court !== human).length,
    turns: end.round,
    swift: !end.eclipse,
    spellsCast,
    difficulty,
    campaignIndex,
    daily: record.initial.config.setup === 'daily',
    classic: record.initial.config.setup !== undefined && tierOfConfig(record.initial.config) === 'classic',
  }
}

/** Boards open up as stars are earned in the campaign; the classic board is always open. */
export const BOARD_STARS: Record<string, number> = { classic: 0, pillars: 2, flanks: 4, ruins: 6, shrine: 8, crossroads: 10, sanctum: 12, 'grand-open': GRAND_STARS, 'grand-pillars': 10, 'grand-shrine': 14 }

export const boardUnlocked = (p: Progress, boardId: string) => totalStars(p) >= (BOARD_STARS[boardId] ?? 0)

export const presetUnlocked = (p: Progress, preset: { stars: number }) => totalStars(p) >= preset.stars

const isInt = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v) && v >= 0

/** A stored value made safe to use: a damaged or older blob falls back to what it can give. */
export function migrate(raw: unknown, legacyCleared = 0): Progress {
  const fresh = emptyProgress()
  const o = (raw && typeof raw === 'object' ? raw : null) as Partial<Progress> | null
  // Older versions only lack the gauntlet (2), the daily record (2, 3) and the scenarios (2-4), which then start empty.
  if (!o || (o.v !== PROGRESS_VERSION && o.v !== 5 && o.v !== 4 && o.v !== 3 && o.v !== 2)) {
    // Before E8 the only progress was how many opponents were beaten; each counts as a plain win.
    const battles: Record<string, number> = {}
    LEGACY_BATTLES.slice(0, legacyCleared).forEach((id) => { battles[id] = STAR_WIN })
    return { ...fresh, battles }
  }
  const battles: Record<string, number> = {}
  if (o.v === PROGRESS_VERSION) {
    for (const b of CAMPAIGN) {
      const bits = (o.battles as Record<string, unknown> | undefined)?.[b.id]
      if (isInt(bits) && (bits & 7) !== 0) battles[b.id] = bits & 7
    }
  } else {
    // Before v6 the battles were a list: stars by position, and a count of the first few beaten.
    const oldStars = (o as { stars?: unknown[] }).stars
    const oldCleared = (o as { cleared?: unknown }).cleared
    LEGACY_BATTLES.forEach((id, i) => {
      const bits = (isInt(oldStars?.[i]) ? (oldStars![i] as number) & 7 : 0) | (isInt(oldCleared) && i < oldCleared ? STAR_WIN : 0)
      if (bits) battles[id] = bits
    })
  }
  const stats = { ...fresh.stats }
  for (const k of Object.keys(stats) as (keyof Stats)[]) if (isInt(o.stats?.[k])) stats[k] = o.stats![k]
  const gauntlet = { ...fresh.gauntlet }
  for (const k of Object.keys(gauntlet) as (keyof Gauntlet)[]) if (isInt(o.gauntlet?.[k])) gauntlet[k] = o.gauntlet![k]
  const d = o.daily?.last
  const last: DailyAttempt | null = d && isInt(d.date) && isInt(d.turns) && isInt(d.lost) && typeof d.won === 'boolean'
    ? { date: d.date, won: d.won, turns: d.turns, lost: d.lost } : null
  const daily: Daily = last && isInt(o.daily?.streak) && isInt(o.daily?.best)
    ? { last, streak: o.daily!.streak, best: Math.max(o.daily!.best, o.daily!.streak) } : fresh.daily
  const scenarios: Record<string, number> = {}
  for (const x of SCENARIOS) {
    const bits = (o.scenarios as Record<string, unknown> | undefined)?.[x.id]
    if (isInt(bits) && (bits & 7) !== 0) scenarios[x.id] = bits & 7
  }
  return {
    v: PROGRESS_VERSION,
    battles,
    stats,
    achievements: Array.isArray(o.achievements) ? o.achievements.filter((a) => ACHIEVEMENTS.some((x) => x.id === a)) : [],
    puzzles: Array.isArray(o.puzzles) ? o.puzzles.filter((id) => PUZZLES.some((z) => z.id === id)) : [],
    tournaments: isInt(o.tournaments) ? o.tournaments : 0,
    gauntlet,
    daily,
    scenarios,
    last: typeof o.last === 'string' ? o.last : null,
  }
}

export function loadProgress(): Progress {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY)
    if (raw) return migrate(JSON.parse(raw))
    return migrate(null, Number(localStorage.getItem(LEGACY_KEY)) || 0)
  } catch {
    return emptyProgress()
  }
}

export function saveProgress(p: Progress) {
  try {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(p))
  } catch {
    // Progress is a convenience; playing on without saving is fine.
  }
}
