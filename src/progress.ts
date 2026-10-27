import type { Difficulty } from './engine/data/difficulty'
import type { Summary } from './engine/data/summary'

export type { Summary }
import { CAMPAIGN, battlesIn, grandBattles } from './engine/data/campaign'
import { PUZZLES, puzzlesIn, type PuzzleTier } from './engine/data/puzzles'
import { SCENARIOS } from './engine/data/scenarios'
import { dayIndex, tierOfConfig } from './engine/data/setups'
import { replaySteps, type GameRecord } from './engine/log'
import { sizeOf } from './engine/rules/board'
import { modeOf } from './engine/rules/events'
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

/** Games won, lost and drawn in one part of the game. */
export interface Tally {
  games: number
  wins: number
  losses: number
  draws: number
}

/** The places a game can be played that keep their own record. */
export type PlayArea = 'skirmish' | 'campaign' | 'scenario' | 'daily' | 'practice' | 'hotseat' | 'online'
export const PLAY_AREAS: readonly PlayArea[] = ['skirmish', 'campaign', 'scenario', 'daily', 'practice', 'hotseat', 'online']

const noTally = (): Tally => ({ games: 0, wins: 0, losses: 0, draws: 0 })

/** The tally with one more result: a win, a draw, or otherwise a loss. */
const tallied = (t: Tally, result: 'win' | 'draw' | 'loss'): Tally => ({
  games: t.games + 1,
  wins: t.wins + (result === 'win' ? 1 : 0),
  losses: t.losses + (result === 'loss' ? 1 : 0),
  draws: t.draws + (result === 'draw' ? 1 : 0),
})

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
  /** A record for each place games are played: practice duels count here, and hot-seat games only as played. */
  areas: Record<PlayArea, Tally>
  /** Games against the AI by its difficulty. */
  byDifficulty: Record<Difficulty, Tally>
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
  areas: emptyAreas(),
  byDifficulty: { easy: noTally(), normal: noTally(), hard: noTally() },
  last: null,
})

function emptyAreas(): Record<PlayArea, Tally> {
  return Object.fromEntries(PLAY_AREAS.map((a) => [a, noTally()])) as Record<PlayArea, Tally>
}

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

/** The groups the Stats page folds achievements into. */
export const ACHIEVEMENT_CATEGORIES = [
  'Milestones', 'Battle Craft', 'Conquest', 'Campaign', 'Boards and Rules', 'Scenarios', 'Puzzles', 'Gauntlet', 'Daily and Tournaments', 'Mastery',
] as const

export type AchievementCategory = (typeof ACHIEVEMENT_CATEGORIES)[number]

export interface Achievement {
  id: string
  category: AchievementCategory
  name: string
  text: string
  earned: (p: Progress, s: Summary) => boolean
}

/** Every puzzle of a tier solved; a tier with no puzzles yet never counts. */
const tierCleared = (p: Progress, tier: PuzzleTier) => {
  const list = puzzlesIn(tier)
  return list.length > 0 && list.every((z) => p.puzzles.includes(z.id))
}

const battleWon = (p: Progress, o: { id: string }) => ((p.battles[o.id] ?? 0) & STAR_WIN) !== 0
const tierWon = (p: Progress, list: readonly { id: string }[]) => list.length > 0 && list.every((o) => battleWon(p, o))
const scenariosCleared = (p: Progress) => SCENARIOS.filter((x) => (p.scenarios[x.id] ?? 0) & STAR_WIN).length
const perfectScenarios = (p: Progress) => SCENARIOS.filter((x) => starCount(p.scenarios[x.id] ?? 0) === 3).length
const hours = (p: Progress, h: number) => p.stats.playSeconds >= h * 3600

const def = (category: AchievementCategory, id: string, name: string, text: string, earned: Achievement['earned']): Achievement => ({ id, category, name, text, earned })

export const ACHIEVEMENTS: readonly Achievement[] = [
  // Milestones
  def('Milestones', 'first-win', 'First Light', 'Win a game.', (_, s) => s.won),
  def('Milestones', 'wins-10', 'Ten Victories', 'Win 10 games.', (p) => p.stats.wins >= 10),
  def('Milestones', 'wins-25', 'Quarter Century', 'Win 25 games.', (p) => p.stats.wins >= 25),
  def('Milestones', 'wins-50', 'Fifty Fallen Foes', 'Win 50 games.', (p) => p.stats.wins >= 50),
  def('Milestones', 'wins-100', 'Hundred Crowns', 'Win 100 games.', (p) => p.stats.wins >= 100),
  def('Milestones', 'veteran', 'Seasoned', 'Play 25 games.', (p) => p.stats.games >= 25),
  def('Milestones', 'games-100', 'Centurion', 'Play 100 games.', (p) => p.stats.games >= 100),
  def('Milestones', 'games-250', 'Old Guard', 'Play 250 games.', (p) => p.stats.games >= 250),
  def('Milestones', 'first-loss', 'Lessons in Dusk', 'Lose a game.', (p) => p.stats.losses >= 1),
  def('Milestones', 'first-draw', 'Stalemate', 'Draw a game.', (p) => p.stats.draws >= 1),
  // Battle Craft
  def('Battle Craft', 'flawless', 'Unscathed', 'Win without losing a piece.', (_, s) => s.won && s.lost === 0),
  def('Battle Craft', 'swift', 'Before the Dark', 'Win before the Eclipse falls.', (_, s) => s.won && s.swift),
  def('Battle Craft', 'silent', 'Silent Leader', 'Win without casting a spell.', (_, s) => s.won && s.spellsCast === 0 && !s.classic),
  def('Battle Craft', 'hard', 'Against the Tide', 'Win against a hard opponent.', (_, s) => s.won && s.difficulty === 'hard'),
  def('Battle Craft', 'quick-win', 'Blitzkrieg', 'Win in 10 rounds or fewer.', (_, s) => s.won && s.turns <= 10),
  def('Battle Craft', 'rout', 'Rout', 'Take 8 enemy pieces in one game you win.', (_, s) => s.won && s.taken >= 8),
  def('Battle Craft', 'comeback', 'Against the Dying Light', 'Win after losing 6 or more pieces.', (_, s) => s.won && s.lost >= 6),
  def('Battle Craft', 'hard-flawless', 'Untouchable', 'Win against a hard opponent without losing a piece.', (_, s) => s.won && s.lost === 0 && s.difficulty === 'hard'),
  def('Battle Craft', 'spell-weaver', 'Spell Weaver', 'Win after casting 4 or more spells.', (_, s) => s.won && s.spellsCast >= 4),
  def('Battle Craft', 'eclipse-win', 'Through the Eclipse', 'Win after the Eclipse has fallen.', (_, s) => s.won && !s.swift),
  // Conquest
  def('Conquest', 'captures-10', 'First Spoils', 'Take 10 enemy pieces.', (p) => p.stats.captures >= 10),
  def('Conquest', 'captures-50', 'Harvest of Shadows', 'Take 50 enemy pieces.', (p) => p.stats.captures >= 50),
  def('Conquest', 'captures-100', 'Hundred Fallen', 'Take 100 enemy pieces.', (p) => p.stats.captures >= 100),
  def('Conquest', 'captures-250', 'Reaper of Light', 'Take 250 enemy pieces.', (p) => p.stats.captures >= 250),
  def('Conquest', 'captures-500', 'Scourge of the Court', 'Take 500 enemy pieces.', (p) => p.stats.captures >= 500),
  def('Conquest', 'captures-1000', 'A Thousand Eclipses', 'Take 1000 enemy pieces.', (p) => p.stats.captures >= 1000),
  def('Conquest', 'defeats-5', 'Persistent', 'Lose 5 games and keep playing.', (p) => p.stats.losses >= 5),
  def('Conquest', 'defeats-25', 'Unbowed', 'Lose 25 games and keep playing.', (p) => p.stats.losses >= 25),
  def('Conquest', 'pieces-lost-50', 'Fallen Legion', 'Lose 50 pieces over all your games.', (p) => p.stats.piecesLost >= 50),
  def('Conquest', 'draws-5', 'Deadlock', 'Draw 5 games.', (p) => p.stats.draws >= 5),
  // Campaign
  def('Campaign', 'half', 'Halfway There', 'Beat four campaign opponents.', (p) => clearedCount(p) >= 4),
  def('Campaign', 'queen', 'Eclipse Ender', 'Beat the Eclipse Queen.', (p) => ((p.battles['eclipse-queen'] ?? 0) & STAR_WIN) !== 0),
  def('Campaign', 'three-stars', 'Triple Crown', 'Earn all three stars on one opponent.', (p) => Object.values(p.battles).some((b) => starCount(b) === 3)),
  def('Campaign', 'battles-10', 'Ten Banners', 'Beat 10 campaign opponents.', (p) => clearedCount(p) >= 10),
  def('Campaign', 'battles-25', 'Warlord', 'Beat 25 campaign opponents.', (p) => clearedCount(p) >= 25),
  def('Campaign', 'tier-beginner', 'Beginner Ladder', 'Beat every Beginner battle.', (p) => tierWon(p, battlesIn('easy'))),
  def('Campaign', 'tier-normal', 'Normal Ladder', 'Beat every Normal battle.', (p) => tierWon(p, battlesIn('normal'))),
  def('Campaign', 'tier-expert', 'Expert Ladder', 'Beat every Expert battle.', (p) => tierWon(p, battlesIn('hard'))),
  def('Campaign', 'tier-grand', 'Grand Marshal', 'Beat every Grand Court battle.', (p) => tierWon(p, grandBattles())),
  def('Campaign', 'stars-50', 'Constellation', 'Earn 50 campaign stars.', (p) => totalStars(p) >= 50),
  // Boards and Rules
  def('Boards and Rules', 'grand-win', 'Grand Strategist', 'Win a game on the 9x9 Grand board.', (_, s) => s.won && s.size === 9),
  def('Boards and Rules', 'leader-win', 'Regicide', 'Win a Leader Capture game.', (_, s) => s.won && s.mode === 'leader'),
  def('Boards and Rules', 'score-win', 'Beacon Baron', 'Win a Score Race game.', (_, s) => s.won && s.mode === 'score'),
  def('Boards and Rules', 'hill-win', 'King of the Hill', 'Win a King of the Hill game.', (_, s) => s.won && s.mode === 'hill'),
  def('Boards and Rules', 'cells-win', 'Ground Truth', 'Win on a board with cell effects.', (_, s) => s.won && !!s.cells),
  def('Boards and Rules', 'events-win', 'Weathered', 'Win a game with day events.', (_, s) => s.won && !!s.events),
  def('Boards and Rules', 'showdown-win', 'Last Light Standing', 'Win a game with the Eclipse showdown.', (_, s) => s.won && !!s.showdown),
  def('Boards and Rules', 'blitz-win', 'Beat the Clock', 'Win a game with a turn clock.', (_, s) => s.won && !!s.clock),
  def('Boards and Rules', 'growth-win', 'Battle-Hardened', 'Win a game with veterancy and perks.', (_, s) => s.won && !!s.growth),
  def('Boards and Rules', 'promotion-win', 'Rank and File', 'Win a game with promotion.', (_, s) => s.won && !!s.promotion),
  // Scenarios
  def('Scenarios', 'scenario-first', 'Against the Odds', 'Clear a scenario.', (p) => scenariosCleared(p) >= 1),
  def('Scenarios', 'scenario-5', 'Problem Solver', 'Clear 5 scenarios.', (p) => scenariosCleared(p) >= 5),
  def('Scenarios', 'scenario-10', 'Field Officer', 'Clear 10 scenarios.', (p) => scenariosCleared(p) >= 10),
  def('Scenarios', 'scenario-25', 'Staff Captain', 'Clear 25 scenarios.', (p) => scenariosCleared(p) >= 25),
  def('Scenarios', 'scenario-50', 'War Council', 'Clear 50 scenarios.', (p) => scenariosCleared(p) >= 50),
  def('Scenarios', 'scenario-all', 'Tactician', 'Clear every scenario.', (p) => scenariosCleared(p) === SCENARIOS.length),
  def('Scenarios', 'scenario-stars-30', 'Scenario Stars', 'Earn 30 scenario stars.', (p) => scenarioStars(p) >= 30),
  def('Scenarios', 'scenario-stars-100', 'Night Sky', 'Earn 100 scenario stars.', (p) => scenarioStars(p) >= 100),
  def('Scenarios', 'scenario-perfect-1', 'Perfect Plan', 'Earn all three stars in one scenario.', (p) => perfectScenarios(p) >= 1),
  def('Scenarios', 'scenario-perfect-10', 'Master Planner', 'Earn all three stars in 10 scenarios.', (p) => perfectScenarios(p) >= 10),
  // Puzzles
  def('Puzzles', 'puzzle-1', 'Fresh Eyes', 'Solve a puzzle.', (p) => p.puzzles.length >= 1),
  def('Puzzles', 'puzzler', 'Puzzler', 'Solve three puzzles.', (p) => p.puzzles.length >= 3),
  def('Puzzles', 'puzzle-10', 'Riddle Reader', 'Solve 10 puzzles.', (p) => p.puzzles.length >= 10),
  def('Puzzles', 'puzzle-25', 'Knot Cutter', 'Solve 25 puzzles.', (p) => p.puzzles.length >= 25),
  def('Puzzles', 'puzzle-50', 'Puzzle Sage', 'Solve 50 puzzles.', (p) => p.puzzles.length >= 50),
  def('Puzzles', 'beginner-cleared', 'First Steps', 'Solve every Beginner puzzle.', (p) => tierCleared(p, 'beginner')),
  def('Puzzles', 'normal-cleared', 'Steady Hands', 'Solve every Normal puzzle.', (p) => tierCleared(p, 'normal')),
  def('Puzzles', 'expert-cleared', 'Eclipse Scholar', 'Solve every Expert puzzle.', (p) => tierCleared(p, 'expert')),
  def('Puzzles', 'puzzle-master', 'Puzzle Master', 'Solve every puzzle.', (p) => PUZZLES.every((z) => p.puzzles.includes(z.id))),
  def('Puzzles', 'daily-puzzle', 'Puzzle of the Day', "Solve the day's puzzle.", (_, s) => !!s.dailyPuzzle),
  // Gauntlet
  def('Gauntlet', 'gauntlet-run-1', 'Into the Gauntlet', 'Begin a gauntlet run.', (p) => p.gauntlet.runs >= 1),
  def('Gauntlet', 'stage-3', 'Third Fight', 'Reach stage 3 of the gauntlet.', (p) => p.gauntlet.best >= 3),
  def('Gauntlet', 'deep', 'Deep Delver', 'Reach stage 5 of the gauntlet.', (p) => p.gauntlet.best >= 5),
  def('Gauntlet', 'stage-7', 'At the Boss Door', 'Reach stage 7 of the gauntlet.', (p) => p.gauntlet.best >= 7),
  def('Gauntlet', 'gauntlet', 'Court Eternal', 'Win a gauntlet run.', (p) => p.gauntlet.won >= 1),
  def('Gauntlet', 'gauntlet-runs-5', 'Returning Runner', 'Begin 5 gauntlet runs.', (p) => p.gauntlet.runs >= 5),
  def('Gauntlet', 'gauntlet-runs-10', 'Gauntlet Regular', 'Begin 10 gauntlet runs.', (p) => p.gauntlet.runs >= 10),
  def('Gauntlet', 'gauntlet-runs-25', 'Gauntlet Devotee', 'Begin 25 gauntlet runs.', (p) => p.gauntlet.runs >= 25),
  def('Gauntlet', 'gauntlet-won-3', 'Thrice Crowned', 'Win 3 gauntlet runs.', (p) => p.gauntlet.won >= 3),
  def('Gauntlet', 'gauntlet-won-5', 'Eternal Champion', 'Win 5 gauntlet runs.', (p) => p.gauntlet.won >= 5),
  // Daily and Tournaments
  def('Daily and Tournaments', 'daily', 'Daily Bread', "Win the day's daily game.", (_, s) => s.won && s.daily),
  def('Daily and Tournaments', 'streak-2', 'Back Tomorrow', 'Play the daily match two days in a row.', (p) => p.daily.best >= 2),
  def('Daily and Tournaments', 'streak-3', 'Three Days Running', 'Play the daily match three days in a row.', (p) => p.daily.best >= 3),
  def('Daily and Tournaments', 'streak-7', 'A Week of Eclipses', 'Play the daily match seven days in a row.', (p) => p.daily.best >= 7),
  def('Daily and Tournaments', 'streak-14', 'Fortnight Vigil', 'Play the daily match 14 days in a row.', (p) => p.daily.best >= 14),
  def('Daily and Tournaments', 'streak-30', 'A Month of Dawns', 'Play the daily match 30 days in a row.', (p) => p.daily.best >= 30),
  def('Daily and Tournaments', 'champion', 'Champion', 'Win a best-of-three tournament.', (p) => p.tournaments >= 1),
  def('Daily and Tournaments', 'tournaments-3', 'Circuit Rider', 'Win 3 tournaments.', (p) => p.tournaments >= 3),
  def('Daily and Tournaments', 'tournaments-5', 'Tournament Terror', 'Win 5 tournaments.', (p) => p.tournaments >= 5),
  def('Daily and Tournaments', 'tournaments-10', 'Grand Champion', 'Win 10 tournaments.', (p) => p.tournaments >= 10),
  // Mastery
  def('Mastery', 'time-1', 'An Hour Well Spent', 'Play for 1 hour.', (p) => hours(p, 1)),
  def('Mastery', 'time-5', 'Dedicated', 'Play for 5 hours.', (p) => hours(p, 5)),
  def('Mastery', 'time-10', 'Devoted', 'Play for 10 hours.', (p) => hours(p, 10)),
  def('Mastery', 'time-25', 'Lifelong Courtier', 'Play for 25 hours.', (p) => hours(p, 25)),
  def('Mastery', 'badges-10', 'Collector', 'Earn 10 achievements.', (p) => p.achievements.length >= 10),
  def('Mastery', 'badges-25', 'Trophy Shelf', 'Earn 25 achievements.', (p) => p.achievements.length >= 25),
  def('Mastery', 'badges-50', 'Hall of Honours', 'Earn 50 achievements.', (p) => p.achievements.length >= 50),
  def('Mastery', 'badges-75', 'Near Legend', 'Earn 75 achievements.', (p) => p.achievements.length >= 75),
  def('Mastery', 'campaign-all', 'Conqueror', 'Beat every campaign battle.', (p) => tierWon(p, CAMPAIGN)),
  def('Mastery', 'stars-all', 'Every Star', 'Earn every campaign star.', (p) => totalStars(p) === CAMPAIGN.length * 3),
]

/** The progress after one finished game, and the achievements it newly earned. */
export function recordGame(p: Progress, s: Summary, replay: string | null, area: PlayArea = 'skirmish'): { progress: Progress; earned: Achievement[] } {
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
  const result = s.won ? 'win' : s.draw ? 'draw' : 'loss'
  const next: Progress = {
    ...p, battles, stats, last: replay ?? p.last,
    areas: { ...p.areas, [area]: tallied(p.areas[area], result) },
    byDifficulty: { ...p.byDifficulty, [s.difficulty]: tallied(p.byDifficulty[s.difficulty], result) },
  }
  return award(next, s, p)
}

/** What no game happened looks like, for achievements earned outside a game. */
const NO_GAME: Summary = {
  won: false, draw: false, lost: 0, taken: 0, turns: 0, swift: false, spellsCast: 0, difficulty: 'normal', campaignIndex: null, daily: false,
}

function award(next: Progress, s: Summary, before: Progress): { progress: Progress; earned: Achievement[] } {
  // Achievements that count achievements can unlock others, so go round until nothing new is earned.
  const earned: Achievement[] = []
  let have = before.achievements
  for (;;) {
    const fresh = ACHIEVEMENTS.filter((a) => !have.includes(a.id) && a.earned({ ...next, achievements: have }, s))
    if (fresh.length === 0) break
    earned.push(...fresh)
    have = [...have, ...fresh.map((a) => a.id)]
  }
  return { progress: { ...next, achievements: have }, earned }
}

/** The progress after a practice duel; the player attacks, so a win needs the defender down and the attacker standing. */
export function recordPractice(p: Progress, outcome: { attackerHp: number; defenderHp: number }): Progress {
  const result = outcome.defenderHp <= 0 && outcome.attackerHp > 0 ? 'win' : outcome.attackerHp <= 0 && outcome.defenderHp > 0 ? 'loss' : 'draw'
  return { ...p, areas: { ...p.areas, practice: tallied(p.areas.practice, result) } }
}

/** The progress after a game against another person; `won` is null for a draw. They touch no other record. */
export function recordVersus(p: Progress, area: 'hotseat' | 'online', won: boolean | null): Progress {
  return { ...p, areas: { ...p.areas, [area]: tallied(p.areas[area], won === null ? 'draw' : won ? 'win' : 'loss') } }
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
  return { ...p, stats: fresh.stats, gauntlet: fresh.gauntlet, achievements: [], tournaments: 0, areas: fresh.areas, byDifficulty: fresh.byDifficulty, last: null }
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
    size: sizeOf(record.initial.config),
    mode: modeOf(record.initial.config),
    cells: !!record.initial.config.cells?.length,
    events: !!record.initial.config.events,
    showdown: !!record.initial.config.showdown,
    clock: !!record.initial.config.turnClock,
    growth: !!record.initial.config.growth,
    promotion: !!record.initial.config.promotion,
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
  const tally = (raw: unknown): Tally => {
    const t = (raw && typeof raw === 'object' ? raw : {}) as Partial<Tally>
    return { games: isInt(t.games) ? t.games : 0, wins: isInt(t.wins) ? t.wins : 0, losses: isInt(t.losses) ? t.losses : 0, draws: isInt(t.draws) ? t.draws : 0 }
  }
  const areas = emptyAreas()
  for (const a of PLAY_AREAS) areas[a] = tally((o.areas as Record<string, unknown> | undefined)?.[a])
  const byDifficulty = {
    easy: tally(o.byDifficulty?.easy), normal: tally(o.byDifficulty?.normal), hard: tally(o.byDifficulty?.hard),
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
    areas,
    byDifficulty,
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
