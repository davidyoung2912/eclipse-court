import { aiDraft, aiLoadout } from './aiDraft'
import { PERSONALITIES, type PersonalityId } from './personality'
import { DIFFICULTY_LIST, type Difficulty } from './difficulty'
import { newGame } from '../reducer'
import { rngNext } from '../rng'
import { otherCourt } from '../rules/board'
import { ELITE_WINS, perkChoices, VETERAN_WINS } from '../rules/growth'
import { DAYS } from '../rules/luminance'
import { LOADOUT_SIZE, spellPool } from '../rules/spells'
import type { Court, GameState, MatchConfig, Perk, Piece, Role, Spell } from '../rules/types'
import { BOARDS, boardById } from './boards'
import { arrange, DRAFT_ROLES, MAX_DRAFTED, ROLE_MAX } from './draft'
import { DEFAULT_CONFIG } from './matchConfig'
import { ROLE_STATS } from './roster'

/** Beat this many stages in a row to win the run; the last is a boss. */
export const GAUNTLET_STAGES = 8
/** Stages after which a rest stop offers to bring a fallen piece back. */
export const REST_STAGES: readonly number[] = [3, 6]
/** A Leader's spell book can grow to this many spells. */
export const MAX_SPELLS = 7
/** The most extra HP rewards can add to one piece (before veterancy). */
export const MAX_BONUS = 4
const MAX_FALLEN = 6

export const RUN_VERSION = 1

/** A piece of the persistent army: its role and what it has earned, rebuilt at full health for each fight. */
export interface RunPiece {
  role: Role
  /** Duel wins across the run; two make a Veteran, four an Elite. */
  wins: number
  perk?: Perk
  /** Max HP gained from rewards, on top of the role's HP and any veterancy. */
  bonus: number
}

/** The hardest ascension; each level adds a rule on top of the ones below it. */
export const MAX_ASCENSION = 5

/** What each ascension level adds to the foes, cumulatively. */
export const ASCENSIONS: readonly { name: string; text: string }[] = [
  { name: 'Hardened Foes', text: 'Every enemy piece has 1 extra HP.' },
  { name: 'No Rest', text: 'The camps are gone: fallen pieces stay fallen.' },
  { name: 'Sharper Minds', text: 'Every opponent plays one difficulty step higher.' },
  { name: 'Cruel Rules', text: 'Each stage adds one more rule to the match.' },
  { name: 'Early Dusk', text: 'The boss brings the Eclipse at round 14.' },
]

/** The stages after which a rest stop appears at this ascension. */
export const restStages = (ascension: number): readonly number[] => (ascension >= 2 ? [] : REST_STAGES)

export type RelicId = 'moonwell' | 'hourglass' | 'dawnstone' | 'banner' | 'sundial' | 'omen'

/** Relics only switch on existing match settings, so they bend the rules for both courts. */
export const RELICS: Record<RelicId, { name: string; text: string }> = {
  moonwell: { name: 'Moonwell', text: 'Cast spells return after 8 rounds.' },
  hourglass: { name: 'Hourglass', text: 'The light runs a long, 10-round day.' },
  dawnstone: { name: 'Dawnstone', text: 'The Eclipse falls 8 rounds later.' },
  banner: { name: 'Banner of the March', text: 'Footsoldiers that cross the board are promoted.' },
  sundial: { name: 'Sundial', text: 'Court passives are in play: Solari fliers reach further in light, Umbral regenerate in the dark.' },
  omen: { name: 'Omen', text: 'A day event strikes at the start of each day.' },
}

/** Gauntlet runs won before a relic can be chosen as a starting relic. */
export const RELIC_UNLOCK_WINS: Record<RelicId, number> = { moonwell: 1, hourglass: 2, dawnstone: 3, banner: 4, sundial: 5, omen: 6 }

/** The relics that can open a run once `won` runs have been won. */
export const startingRelics = (won: number): RelicId[] => (Object.keys(RELICS) as RelicId[]).filter((r) => won >= RELIC_UNLOCK_WINS[r])

const RELIC_IDS = Object.keys(RELICS) as RelicId[]

export type Reward =
  | { kind: 'piece'; role: Role }
  | { kind: 'hp'; target: number }
  | { kind: 'perk'; target: number; perk: Perk }
  | { kind: 'spell'; spell: Spell }
  | { kind: 'relic'; relic: RelicId }
  /** A rest stop: index into `fallen`. */
  | { kind: 'revive'; target: number }

export interface Run {
  v: typeof RUN_VERSION
  seed: number
  court: Court
  /** The fight to play next, 1-based; beyond GAUNTLET_STAGES the run is won. */
  stage: number
  leader: RunPiece
  /** Everyone but the Leader. */
  army: RunPiece[]
  /** Pieces lost in earlier fights, best first; a rest stop can bring one back. */
  fallen: RunPiece[]
  loadout: Spell[]
  relics: RelicId[]
  /** The rewards on offer after a win, until one is picked. */
  offers: Reward[] | null
  /** Ascension level, 0 to MAX_ASCENSION. */
  ascension: number
  /** The `dailySeed` of the day this is the seeded daily run for, or 0. */
  daily: number
}

export const runWon = (run: Run) => run.stage > GAUNTLET_STAGES

const fresh = (role: Role): RunPiece => ({ role, wins: 0, bonus: 0 })

/** The spells a new run begins with. */
export const STARTER_SPELLS: readonly Spell[] = ['blink', 'mend', 'revive', 'bind']

export function startRun(court: Court, roles: readonly Role[], seed: number, opts: { ascension?: number; daily?: number; relic?: RelicId } = {}): Run {
  return {
    ascension: Math.min(Math.max(opts.ascension ?? 0, 0), MAX_ASCENSION), daily: opts.daily ?? 0,
    v: RUN_VERSION, seed: seed >>> 0, court, stage: 1, leader: fresh('leader'), army: roles.map(fresh),
    fallen: [], loadout: STARTER_SPELLS.slice(0, LOADOUT_SIZE).filter((s) => spellPool(court).includes(s)), relics: opts.relic ? [opts.relic] : [], offers: null,
  }
}

/** The leader followed by the army: index `i` is the piece that plays as `<court>-run-<i>`. */
export const roster = (run: Run): RunPiece[] => [run.leader, ...run.army]

const pieceId = (court: Court, i: number) => `${court}-run-${i}`

// ---- the opponent for each stage ----

export interface StageFoe {
  name: string
  blurb: string
  difficulty: Difficulty
  personality: PersonalityId
  board: string
  rules: Partial<MatchConfig>
  army: Role[]
  /** Extra HP on every enemy piece. */
  hpBonus: number
  /** Names of the rules in play, for display. */
  tags: string[]
  boss: boolean
}

const FOE_NAMES = [
  'The Lantern Keeper', 'The Ash Warden', 'The Hollow Duke', 'The Gravel Choir',
  'The Pale Regent', 'The Veil Sisters', 'The Long Night', 'The Eclipse Tyrant',
]
const DIFFICULTIES: readonly Difficulty[] = ['easy', 'easy', 'normal', 'normal', 'normal', 'hard', 'hard', 'hard']
const PERSONALITY_IDS = Object.keys(PERSONALITIES) as PersonalityId[]

interface Modifier {
  label: string
  rules: Partial<MatchConfig>
  /** Only one win condition applies to a match. */
  win?: boolean
}

const MODIFIERS: readonly Modifier[] = [
  { label: 'Capture their Leader', rules: { mode: 'leader' }, win: true },
  { label: 'Score race', rules: { mode: 'score' }, win: true },
  { label: 'King of the Hill', rules: { mode: 'hill' }, win: true },
  { label: 'Day events', rules: { events: true } },
  { label: 'Showdown', rules: { showdown: true } },
  { label: 'Reverse light', rules: { reverse: true } },
  { label: 'Swift day', rules: { day: DAYS.swift } },
  { label: 'Long day', rules: { day: DAYS.long } },
]

/** A seeded stream of values in [0, 1). */
function stream(seed: number) {
  let state = seed >>> 0
  return () => {
    const [value, next] = rngNext(state)
    state = next
    return value
  }
}

const harder = (d: Difficulty): Difficulty => DIFFICULTY_LIST[Math.min(DIFFICULTY_LIST.indexOf(d) + 1, DIFFICULTY_LIST.length - 1)]

const stageSeed = (seed: number, stage: number) => (seed + stage * 7919) >>> 0

/** The opponent of a stage: harder each time, with its personality, board and rules drawn from the run's seed. */
export function stageFoe(seed: number, stage: number, ascension = 0): StageFoe {
  const s = Math.min(Math.max(stage, 1), GAUNTLET_STAGES)
  const roll = stream(stageSeed(seed, s))
  const boss = s === GAUNTLET_STAGES
  const difficulty = ascension >= 3 ? harder(DIFFICULTIES[s - 1]) : DIFFICULTIES[s - 1]
  const personality = boss ? 'caster' : PERSONALITY_IDS[Math.floor(roll() * PERSONALITY_IDS.length)]
  const board = BOARDS[Math.floor(roll() * BOARDS.length)].id
  const wanted = (boss ? 2 : s >= 5 ? 2 : s >= 2 ? 1 : 0) + (ascension >= 4 ? 1 : 0)
  const pool = [...MODIFIERS]
  const chosen: Modifier[] = []
  while (chosen.length < wanted) {
    const m = pool.splice(Math.floor(roll() * pool.length), 1)[0]
    if (m.win && chosen.some((c) => c.win)) continue
    chosen.push(m)
  }
  let rules: Partial<MatchConfig> = Object.assign({}, ...chosen.map((m) => m.rules))
  const tags = chosen.map((m) => m.label)
  if (boss) {
    const eclipseRound = ascension >= 5 ? 14 : 20
    rules = { ...rules, eclipseRound, showdown: true }
    tags.push('Early Eclipse')
  }
  const drafted = aiDraft(stageSeed(seed, s) + 1, difficulty)
  return {
    name: FOE_NAMES[s - 1],
    blurb: `${PERSONALITIES[personality].name} on the ${boardById(board).name} board.`,
    difficulty, personality, board, rules,
    army: drafted.slice(0, Math.min(MAX_DRAFTED, 6 + s)),
    hpBonus: Math.floor((s - 1) / 3) + (ascension >= 1 ? 1 : 0),
    tags, boss,
  }
}

/** The match settings relics switch on. */
export function relicRules(relics: readonly RelicId[]): Partial<MatchConfig> {
  const out: Partial<MatchConfig> = {}
  if (relics.includes('moonwell')) out.recharge = 8
  if (relics.includes('hourglass')) out.day = DAYS.long
  if (relics.includes('banner')) out.promotion = true
  if (relics.includes('sundial')) out.passives = true
  if (relics.includes('omen')) out.events = true
  return out
}

// ---- building a fight ----

const maxHpOf = (p: RunPiece) => ROLE_STATS[p.role].hp + p.bonus + (p.wins >= VETERAN_WINS ? 1 : 0)

/** The opening position of the run's next fight: the persistent army against the stage's opponent. */
export function stageGame(run: Run): GameState {
  const foe = stageFoe(run.seed, run.stage, run.ascension)
  const foeCourt = otherCourt(run.court)
  const seed = stageSeed(run.seed, run.stage)
  const board = boardById(foe.board)
  const mine = arrange(run.army.map((p) => p.role))
  const theirs = arrange(foe.army)
  const rules = { ...foe.rules, ...relicRules(run.relics) }
  const config: MatchConfig = {
    ...DEFAULT_CONFIG, ...rules, seed, beacons: board.beacons, blocked: board.blocked, cells: board.cells, board: board.id, setup: 'gauntlet', growth: true,
    layout: run.court === 'solari' ? mine : theirs,
    umbralLayout: run.court === 'solari' ? theirs : mine,
    loadouts: { [run.court]: run.loadout, [foeCourt]: aiLoadout(seed, foeCourt) } as Record<Court, Spell[]>,
  }
  if (run.relics.includes('dawnstone')) {
    config.eclipseRound = (rules.eclipseRound ?? DEFAULT_CONFIG.eclipseRound) + 8
    config.roundLimit = DEFAULT_CONFIG.roundLimit + 8
  }
  const state = newGame(config)
  // The nth piece of a role in the state is the nth of that role in the army.
  const slots = roster(run)
  const used = new Set<number>()
  const slotFor = (role: Role) => {
    const i = slots.findIndex((r, k) => r.role === role && !used.has(k))
    used.add(i)
    return i
  }
  return {
    ...state,
    pieces: state.pieces.map((p): Piece => {
      if (p.court === run.court) {
        const i = slotFor(p.role)
        const r = slots[i]
        const maxHp = maxHpOf(r)
        return { ...p, id: pieceId(run.court, i), hp: maxHp, maxHp, wins: r.wins, ...(r.perk ? { perk: r.perk } : {}) }
      }
      if (!foe.hpBonus) return p
      return { ...p, hp: p.hp + foe.hpBonus, maxHp: p.maxHp + foe.hpBonus }
    }),
  }
}

// ---- after a fight ----

/** What a surviving piece has become: its role (it may have been promoted), record and perk. */
function carried(piece: Piece, before: RunPiece): RunPiece {
  const wins = piece.wins ?? before.wins
  const bonus = Math.min(MAX_BONUS, Math.max(0, piece.maxHp - ROLE_STATS[piece.role].hp - (wins >= VETERAN_WINS ? 1 : 0)))
  return { role: piece.role, wins, bonus, ...(piece.perk ? { perk: piece.perk } : {}) }
}

/**
 * The run after a won fight: survivors keep what they earned, the fallen are set aside for a rest
 * stop, and a choice of rewards is rolled. `final` is the position the fight ended in.
 */
export function applyVictory(run: Run, final: GameState): Run {
  const slots = roster(run)
  const alive = new Map<number, Piece>()
  for (const p of final.pieces) {
    if (p.court !== run.court) continue
    const m = new RegExp(`^${run.court}-run-(\\d+)$`).exec(p.id)
    if (m && slots[Number(m[1])]) alive.set(Number(m[1]), p)
  }
  // A Leader who fell in a won fight is replaced by a fresh one that keeps its HP rewards.
  const leader = alive.has(0) ? carried(alive.get(0)!, run.leader) : { ...fresh('leader'), bonus: run.leader.bonus }
  const army: RunPiece[] = []
  const lost: RunPiece[] = []
  run.army.forEach((r, k) => {
    const p = alive.get(k + 1)
    if (p) army.push(carried(p, r))
    else lost.push(r)
  })
  const fallen = [...run.fallen, ...lost].sort((a, b) => b.wins - a.wins).slice(0, MAX_FALLEN)
  const next: Run = { ...run, leader, army, fallen, stage: run.stage + 1, offers: null }
  return runWon(next) ? next : { ...next, offers: runReward(next, stageSeed(run.seed, run.stage) ^ 0x5bd1e995) }
}

// ---- rewards ----

export const canAddPiece = (run: Run, role: Role) =>
  run.army.length < MAX_DRAFTED && run.army.filter((p) => p.role === role).length < ROLE_MAX[role]

/** Three rewards to pick from (fewer if little is left to give); a rest stop always offers a fallen piece when there is one. */
export function runReward(run: Run, rng: number): Reward[] {
  const roll = stream(rng)
  const pick = <T,>(items: readonly T[]) => items[Math.floor(roll() * items.length)]
  const slots = roster(run)
  const kinds: (() => Reward | null)[] = [
    () => {
      const roles = DRAFT_ROLES.filter((r) => canAddPiece(run, r))
      return roles.length ? { kind: 'piece', role: pick(roles) } : null
    },
    () => {
      const open = slots.map((p, i) => ({ p, i })).filter(({ p }) => p.bonus < MAX_BONUS)
      return open.length ? { kind: 'hp', target: pick(open).i } : null
    },
    () => {
      const open = slots.map((p, i) => ({ p, i })).filter(({ p }) => !p.perk)
      if (!open.length) return null
      const { p, i } = pick(open)
      return { kind: 'perk', target: i, perk: pick(perkChoices(p.role)) }
    },
    () => {
      const open = spellPool(run.court).filter((s) => !run.loadout.includes(s))
      return run.loadout.length < MAX_SPELLS && open.length ? { kind: 'spell', spell: pick(open) } : null
    },
    () => {
      const open = RELIC_IDS.filter((r) => !run.relics.includes(r))
      return open.length ? { kind: 'relic', relic: pick(open) } : null
    },
  ]
  const offers: Reward[] = []
  if (restStages(run.ascension).includes(run.stage - 1) && run.fallen.length && run.army.length < MAX_DRAFTED) offers.push({ kind: 'revive', target: 0 })
  const order = kinds.map((k, i) => ({ k, key: roll(), i })).sort((a, b) => a.key - b.key)
  for (const { k } of order) {
    if (offers.length >= 3) break
    const reward = k()
    if (reward) offers.push(reward)
  }
  return offers
}

/** The run with one reward taken; the other offers are gone. */
export function applyReward(run: Run, reward: Reward): Run {
  const next: Run = { ...run, offers: null }
  switch (reward.kind) {
    case 'piece':
      return canAddPiece(run, reward.role) ? { ...next, army: [...run.army, fresh(reward.role)] } : next
    case 'hp':
      return withPiece(next, reward.target, (p) => ({ ...p, bonus: Math.min(MAX_BONUS, p.bonus + 1) }))
    case 'perk':
      return withPiece(next, reward.target, (p) => ({ ...p, wins: Math.max(p.wins, ELITE_WINS), perk: reward.perk }))
    case 'spell':
      return run.loadout.length < MAX_SPELLS && !run.loadout.includes(reward.spell) ? { ...next, loadout: [...run.loadout, reward.spell] } : next
    case 'relic':
      return run.relics.includes(reward.relic) ? next : { ...next, relics: [...run.relics, reward.relic] }
    case 'revive': {
      const back = run.fallen[reward.target]
      if (!back || run.army.length >= MAX_DRAFTED) return next
      return { ...next, army: [...run.army, back], fallen: run.fallen.filter((_, i) => i !== reward.target) }
    }
  }
}

function withPiece(run: Run, target: number, f: (p: RunPiece) => RunPiece): Run {
  if (target === 0) return { ...run, leader: f(run.leader) }
  if (!run.army[target - 1]) return run
  return { ...run, army: run.army.map((p, i) => (i === target - 1 ? f(p) : p)) }
}

// ---- run codes and summaries ----

/** A code for a run's seed and ascension; entering it elsewhere starts the same sequence of foes. */
export const runCode = (seed: number, ascension: number) => `G${ascension}-${(seed >>> 0).toString(36)}`

export function parseRunCode(text: string): { seed: number; ascension: number } | null {
  const m = /^G([0-5])-([0-9a-z]{1,7})$/.exec(text.trim().toLowerCase().replace(/^g/, 'G'))
  if (!m) return null
  const seed = parseInt(m[2], 36)
  return seed < 2 ** 32 ? { seed, ascension: Number(m[1]) } : null
}

/** A few lines for a finished run, ready to share. `stage` is the stage lost or abandoned (GAUNTLET_STAGES + 1 when won). */
export function runSummary(run: Run, stage: number, won: boolean): string {
  const reached = Math.min(stage, GAUNTLET_STAGES)
  const strongest = roster(run).filter((p) => p.wins >= VETERAN_WINS).length
  return [
    `Eclipse Court Gauntlet${run.ascension ? `, ascension ${run.ascension}` : ''}${run.daily ? ', daily run' : ''}: ${won ? 'WON' : `fell at stage ${reached}`} of ${GAUNTLET_STAGES}`,
    `Army ${run.army.length + 1}, veterans ${strongest}, relics ${run.relics.length ? run.relics.map((r) => RELICS[r].name).join(', ') : 'none'}, spells ${run.loadout.length}`,
    `Code ${runCode(run.seed, run.ascension)}`,
  ].join('\n')
}
