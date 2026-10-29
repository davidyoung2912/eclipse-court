import { aiDraft, aiLoadout } from './aiDraft'
import { PERSONALITIES, type PersonalityId } from './personality'
import { DIFFICULTY_LIST, type Difficulty } from './difficulty'
import { newGame } from '../reducer'
import { rngNext } from '../rng'
import { otherCourt, samePos } from '../rules/board'
import { ELITE_WINS, perkChoices, VETERAN_WINS } from '../rules/growth'
import { DAYS } from '../rules/luminance'
import { LOADOUT_SIZE, spellPool } from '../rules/spells'
import type { Court, GameState, MatchConfig, Mayhem, Perk, Piece, Role, Spell } from '../rules/types'
import { BOARDS, boardById } from './boards'
import { BOSSES, type Boss } from './bosses'
import { buildMap, type MapNode } from './gauntletMap'
import { arrange, DRAFT_ROLES, MAX_DRAFTED, ROLE_MAX } from './draft'
import { DEFAULT_CONFIG } from './matchConfig'
import { ROLE_NAMES, ROLE_STATS } from './roster'

/** Beat this many stages in a row to win the run; the last is a boss. */
export const GAUNTLET_STAGES = 8
/** A Leader's spell book can grow to this many spells. */
export const MAX_SPELLS = 7
/** The most extra HP rewards can add to one piece (before veterancy). */
export const MAX_BONUS = 4
/** The least a bargain can take from a piece: a bonus may fall this far below zero. */
export const MIN_BONUS = -2
const MAX_FALLEN = 6

export const RUN_VERSION = 2

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

/** The stages after which a won fight is followed by a camp's offer to bring a fallen piece back: only with a Waystone, since camps are otherwise nodes on the map. */
export const restStages = (relics: readonly RelicId[] = []): readonly number[] =>
  relics.includes('waystone') ? Array.from({ length: GAUNTLET_STAGES - 1 }, (_, i) => i + 1) : []

export type RelicId =
  | 'moonwell' | 'hourglass' | 'dawnstone' | 'banner' | 'sundial' | 'omen'
  | 'swiftsun' | 'glass' | 'wilddie' | 'cutpurse' | 'harbinger'
  | 'ironheart' | 'lens' | 'waystone' | 'ember' | 'chalice' | 'lamp' | 'seal' | 'deathbell' | 'ashring'

/**
 * Most relics switch on existing match settings, so they bend the rules for both courts. Ironheart, Lens,
 * Waystone, Ember, Chalice and Lamp work on the run between fights instead, and Seal favours only the player.
 */
export const RELICS: Record<RelicId, { name: string; text: string }> = {
  moonwell: { name: 'Moonwell', text: 'Cast spells return after 8 rounds.' },
  hourglass: { name: 'Hourglass', text: 'The light runs a long, 10-round day.' },
  dawnstone: { name: 'Dawnstone', text: 'The Eclipse falls 8 rounds later.' },
  banner: { name: 'Banner of the March', text: 'Footsoldiers that cross the board are promoted.' },
  sundial: { name: 'Sundial', text: 'Court passives are in play: Solari fliers reach further in light, Umbral regenerate in the dark.' },
  omen: { name: 'Omen', text: 'A day event strikes at the start of each day.' },
  swiftsun: { name: 'Swift Sun', text: 'The light runs a short, 6-round day (it cancels an Hourglass).' },
  glass: { name: 'Looking Glass', text: 'The light starts out running the other way round.' },
  wilddie: { name: 'Wild Die', text: 'Every 4 rounds two pieces of one role, one from each court, trade places.' },
  cutpurse: { name: 'Cutpurse’s Charm', text: 'Every 5 rounds a spell leaps from one Leader to the other.' },
  harbinger: { name: 'Harbinger', text: 'Every 3 rounds a pair of mirrored cells appears on empty squares.' },
  ironheart: { name: 'Ironheart', text: 'Your pieces have 1 extra HP in every fight.' },
  lens: { name: 'Scholar’s Lens', text: 'Every spoils screen offers four rewards instead of three.' },
  waystone: { name: 'Waystone', text: 'A camp follows every stage but the boss, even at high ascension.' },
  ember: { name: 'Ember', text: 'The best piece you lose in a won fight is carried back into the army.' },
  chalice: { name: 'Echoing Chalice', text: 'Cast a spell in a won fight and your Leader gains 1 max HP (to the usual cap).' },
  lamp: { name: 'Beacon Lamp', text: 'Each of your pieces standing on a beacon when a fight is won earns an extra win.' },
  seal: { name: 'Conjurer’s Seal', text: 'Your Leader may cast once a turn without ending it. Only you gain this.' },
  deathbell: { name: 'Deathbell', text: 'From round 14 the first duel that kills a piece wins the game for the survivor.' },
  ashring: { name: 'Ashen Ring', text: 'The outer squares turn deadly from the Eclipse on, closing in on the centre.' },
}

/** How a relic opens as a starting relic: by gauntlet runs won, or by reaching an ascension level. */
export type RelicUnlock = { wins: number } | { ascension: number }

export const RELIC_UNLOCK: Record<RelicId, RelicUnlock> = {
  moonwell: { wins: 1 }, hourglass: { wins: 2 }, dawnstone: { wins: 3 }, banner: { wins: 4 }, sundial: { wins: 5 }, omen: { wins: 6 },
  swiftsun: { wins: 7 }, glass: { wins: 8 }, wilddie: { wins: 9 }, cutpurse: { wins: 10 }, harbinger: { wins: 11 },
  ironheart: { ascension: 1 }, lens: { ascension: 1 }, waystone: { ascension: 2 }, ember: { ascension: 2 },
  chalice: { ascension: 3 }, lamp: { ascension: 3 }, seal: { ascension: 4 }, deathbell: { ascension: 4 }, ashring: { ascension: 5 },
}

/** `ascension` is the highest level the player has opened (`unlocked` in the ascension record). */
export const relicUnlocked = (relic: RelicId, won: number, ascension = 0) => {
  const u = RELIC_UNLOCK[relic]
  return 'wins' in u ? won >= u.wins : ascension >= u.ascension
}

/** What it takes to open a relic, in words. */
export const relicUnlockText = (relic: RelicId): string => {
  const u = RELIC_UNLOCK[relic]
  return 'wins' in u ? `Win ${u.wins} gauntlet run${u.wins === 1 ? '' : 's'}` : `Open ascension ${u.ascension}`
}

/** The relics that can open a run once `won` runs have been won and ascension `ascension` is open. */
export const startingRelics = (won: number, ascension = 0): RelicId[] => (Object.keys(RELICS) as RelicId[]).filter((r) => relicUnlocked(r, won, ascension))

const RELIC_IDS = Object.keys(RELICS) as RelicId[]

export type Reward =
  | { kind: 'piece'; role: Role }
  | { kind: 'hp'; target: number }
  | { kind: 'perk'; target: number; perk: Perk }
  | { kind: 'spell'; spell: Spell }
  | { kind: 'relic'; relic: RelicId }
  /** Opens an event screen (see `EVENTS`) instead of giving anything outright. */
  | { kind: 'event'; event: EventId }
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
  /** The event being faced, after it was picked from the offers and until a choice is made. */
  event: EventId | null
  /** Ascension level, 0 to MAX_ASCENSION. */
  ascension: number
  /** The `dailySeed` of the day this is the seeded daily run for, or 0. */
  daily: number
  /** Reroll tokens used so far this run, up to MAX_REROLLS. */
  rerolls: number
  /** The node taken in each layer of the map so far, as an index into that layer. */
  path: number[]
}

/** Reroll tokens a run may spend. */
export const MAX_REROLLS = 2

export const runWon = (run: Run) => run.stage > GAUNTLET_STAGES

const fresh = (role: Role): RunPiece => ({ role, wins: 0, bonus: 0 })

/** The spells a new run begins with. */
export const STARTER_SPELLS: readonly Spell[] = ['blink', 'mend', 'revive', 'bind']

export function startRun(court: Court, roles: readonly Role[], seed: number, opts: { ascension?: number; daily?: number; relic?: RelicId } = {}): Run {
  return {
    ascension: Math.min(Math.max(opts.ascension ?? 0, 0), MAX_ASCENSION), daily: opts.daily ?? 0,
    v: RUN_VERSION, seed: seed >>> 0, court, stage: 1, leader: fresh('leader'), army: roles.map(fresh),
    fallen: [], loadout: STARTER_SPELLS.slice(0, LOADOUT_SIZE).filter((s) => spellPool(court).includes(s)), relics: opts.relic ? [opts.relic] : [], offers: null, event: null, rerolls: 0, path: [],
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
  /** An elite: harder than a plain fight, with a longer list of rewards and double Shards. */
  elite: boolean
}

const FOE_NAMES = [
  'The Lantern Keeper', 'The Ash Warden', 'The Hollow Duke', 'The Gravel Choir',
  'The Pale Regent', 'The Veil Sisters', 'The Long Night',
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

/** The seed of one node of a layer; the first node keeps the stage's own seed. */
const nodeSeed = (seed: number, stage: number, slot: number) => (stageSeed(seed, stage) + slot * 104729) >>> 0

/** A node of the map as a fight sees it: its kind and its place in the layer. */
export interface NodeRef {
  kind: MapNode['kind']
  slot: number
}

/** The ladder boss that closes a run. */
export const runBoss = (seed: number): Boss => BOSSES[Math.floor(stream(stageSeed(seed, GAUNTLET_STAGES) ^ 0xb055)() * BOSSES.length)]

/** A boss's own rules for the court it plays here; the board it names is chosen through the foe's `board`. */
function bossRules(boss: Boss, foeCourt: Court): Partial<MatchConfig> {
  const { board: _board, beacons: _beacons, blocked: _blocked, cells: _cells, ...rest } = boss.rules
  return {
    ...rest,
    ...(rest.freeCast ? { freeCast: foeCourt } : {}),
    ...(rest.edge ? { edge: { ...rest.edge, court: foeCourt } } : {}),
  }
}

/**
 * The opponent of a stage: harder each time, with its personality, board and rules drawn from the run's seed. `node` picks
 * which node of the layer it is (the default is the first, a plain fight); the last stage is a ladder boss playing `foeCourt`.
 */
export function stageFoe(seed: number, stage: number, ascension = 0, node: NodeRef | null = null, foeCourt: Court = 'umbral'): StageFoe {
  const s = Math.min(Math.max(stage, 1), GAUNTLET_STAGES)
  const slot = node?.slot ?? 0
  const roll = stream(nodeSeed(seed, s, slot))
  const boss = s === GAUNTLET_STAGES
  const elite = !boss && node?.kind === 'elite'
  const ladderBoss = boss ? runBoss(seed) : null
  const base = ascension >= 3 ? harder(DIFFICULTIES[s - 1]) : DIFFICULTIES[s - 1]
  const difficulty = elite ? harder(base) : base
  const personality = ladderBoss ? ladderBoss.personality : PERSONALITY_IDS[Math.floor(roll() * PERSONALITY_IDS.length)]
  const board = (ladderBoss?.rules.board ?? BOARDS[Math.floor(roll() * BOARDS.length)].id) as string
  const wanted = (boss ? 2 : s >= 5 ? 2 : s >= 2 ? 1 : 0) + (ascension >= 4 ? 1 : 0) + (elite ? 1 : 0)
  const pool = [...MODIFIERS]
  const chosen: Modifier[] = []
  while (chosen.length < wanted) {
    const m = pool.splice(Math.floor(roll() * pool.length), 1)[0]
    if (m.win && chosen.some((c) => c.win)) continue
    chosen.push(m)
  }
  let rules: Partial<MatchConfig> = Object.assign({}, ...chosen.map((m) => m.rules))
  const tags = chosen.map((m) => m.label)
  if (ladderBoss) {
    const eclipseRound = ascension >= 5 ? 14 : 20
    rules = { ...rules, ...bossRules(ladderBoss, foeCourt), eclipseRound, showdown: true }
    tags.push('Early Eclipse')
  }
  const drafted = aiDraft(nodeSeed(seed, s, slot) + 1, difficulty)
  const name = ladderBoss ? ladderBoss.name : `${elite ? 'Elite: ' : ''}${FOE_NAMES[(s - 1 + slot * 3) % FOE_NAMES.length]}`
  return {
    name,
    blurb: ladderBoss ? ladderBoss.rule : `${PERSONALITIES[personality].name} on the ${boardById(board).name} board.`,
    difficulty, personality, board, rules,
    army: drafted.slice(0, Math.min(MAX_DRAFTED, 6 + s + (elite ? 1 : 0))),
    hpBonus: Math.floor((s - 1) / 3) + (ascension >= 1 ? 1 : 0) + (elite ? 1 : 0),
    tags, boss, elite,
  }
}

// ---- the map ----

/** The layered map of the run: layer `i` holds the nodes to choose from before stage `i + 1`. */
export const runMap = (run: Pick<Run, 'seed' | 'ascension'>): MapNode[][] => buildMap(run.seed, run.ascension, GAUNTLET_STAGES)

/** The node taken in a layer (1-based), if the run has taken one there. */
function nodeTaken(run: Run, layer: number): NodeRef | null {
  const slot = run.path[layer - 1]
  const node = slot === undefined ? undefined : runMap(run)[layer - 1]?.[slot]
  return node ? { kind: node.kind, slot } : null
}

/** The nodes on offer for the run's current stage. */
export const layerNodes = (run: Run): MapNode[] => runMap(run)[Math.min(run.stage, GAUNTLET_STAGES) - 1] ?? []

/** Whether the run is waiting for a node to be chosen: nothing is pending and the layer has no node taken yet. */
export const needsPick = (run: Run) => !runWon(run) && !run.offers && !run.event && run.path.length < run.stage

/** The opponent of the run's current stage, from the node taken for it (a plain fight if none is taken yet). */
export const runFoe = (run: Run): StageFoe => stageFoe(run.seed, run.stage, run.ascension, nodeTaken(run, run.stage), otherCourt(run.court))

/**
 * The run after taking node `slot` of the current layer. A fight, elite or boss waits to be fought; an event opens its
 * screen and a camp deals its offers at once, both moving on to the next stage.
 */
export function enterNode(run: Run, slot: number): Run {
  const node = needsPick(run) ? layerNodes(run)[slot] : undefined
  if (!node) return run
  const taken: Run = { ...run, path: [...run.path, slot] }
  if (node.kind !== 'event' && node.kind !== 'rest') return taken
  const next: Run = { ...taken, stage: run.stage + 1 }
  if (node.kind === 'rest') return { ...next, offers: runReward(next, stageSeed(run.seed, run.stage) ^ 0x5bd1e995) }
  const open = EVENT_IDS.filter((e) => eventAvailable(next, e))
  if (open.length) return { ...next, event: open[Math.floor(stream(stageSeed(run.seed, run.stage) ^ 0xe7e47)() * open.length)] }
  return { ...next, offers: runReward(next, stageSeed(run.seed, run.stage) ^ 0x5bd1e995) }
}

/** The match settings relics switch on; `court` is the player's, for the relics that favour only them. */
export function relicRules(relics: readonly RelicId[], court?: Court): Partial<MatchConfig> {
  const out: Partial<MatchConfig> = {}
  if (relics.includes('moonwell')) out.recharge = 8
  if (relics.includes('hourglass') !== relics.includes('swiftsun')) out.day = relics.includes('hourglass') ? DAYS.long : DAYS.swift
  if (relics.includes('banner')) out.promotion = true
  if (relics.includes('sundial')) out.passives = true
  if (relics.includes('omen')) out.events = true
  if (relics.includes('glass')) out.reverse = true
  if (relics.includes('deathbell')) out.suddenDeath = 14
  if (relics.includes('ashring')) out.showdown = true
  if (relics.includes('seal') && court) out.freeCast = court
  const mayhem: Mayhem[] = []
  if (relics.includes('harbinger')) mayhem.push('spawns')
  if (relics.includes('cutpurse')) mayhem.push('thefts')
  if (relics.includes('wilddie')) mayhem.push('swaps')
  if (mayhem.length) out.mayhem = mayhem
  return out
}

// ---- building a fight ----

/** Extra HP every piece has in a fight from relics; it is not kept when the fight ends. */
const relicHp = (relics: readonly RelicId[]) => (relics.includes('ironheart') ? 1 : 0)

const maxHpOf = (p: RunPiece, relics: readonly RelicId[]) => ROLE_STATS[p.role].hp + p.bonus + (p.wins >= VETERAN_WINS ? 1 : 0) + relicHp(relics)

/** The opening position of the run's next fight: the persistent army against the stage's opponent. */
export function stageGame(run: Run): GameState {
  const foe = runFoe(run)
  const foeCourt = otherCourt(run.court)
  const seed = stageSeed(run.seed, run.stage)
  const board = boardById(foe.board)
  const mine = arrange(run.army.map((p) => p.role))
  const theirs = arrange(foe.army)
  const rules = { ...foe.rules, ...relicRules(run.relics, run.court) }
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
        const maxHp = maxHpOf(r, run.relics)
        return { ...p, id: pieceId(run.court, i), hp: maxHp, maxHp, wins: r.wins, ...(r.perk ? { perk: r.perk } : {}) }
      }
      if (!foe.hpBonus) return p
      return { ...p, hp: p.hp + foe.hpBonus, maxHp: p.maxHp + foe.hpBonus }
    }),
  }
}

// ---- after a fight ----

/** What a surviving piece has become: its role (it may have been promoted), record and perk. */
function carried(piece: Piece, before: RunPiece, relics: readonly RelicId[]): RunPiece {
  const wins = piece.wins ?? before.wins
  const bonus = Math.min(MAX_BONUS, Math.max(MIN_BONUS, piece.maxHp - ROLE_STATS[piece.role].hp - (wins >= VETERAN_WINS ? 1 : 0) - relicHp(relics)))
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
  const lamp = (c: RunPiece, p: Piece): RunPiece =>
    run.relics.includes('lamp') && final.config.beacons.some((b) => samePos(b, p.pos)) ? { ...c, wins: Math.min(99, c.wins + 1) } : c
  // A Leader who fell in a won fight is replaced by a fresh one that keeps its HP rewards.
  const held = alive.get(0)
  let leader = held ? lamp(carried(held, run.leader, run.relics), held) : { ...fresh('leader'), bonus: run.leader.bonus }
  if (run.relics.includes('chalice') && final.lastCast[run.court]) leader = { ...leader, bonus: Math.min(MAX_BONUS, leader.bonus + 1) }
  const army: RunPiece[] = []
  const lost: RunPiece[] = []
  run.army.forEach((r, k) => {
    const p = alive.get(k + 1)
    if (p) army.push(lamp(carried(p, r, run.relics), p))
    else lost.push(r)
  })
  lost.sort((a, b) => b.wins - a.wins)
  if (run.relics.includes('ember') && lost.length) army.push(lost.shift()!)
  const fallen = [...run.fallen, ...lost].sort((a, b) => b.wins - a.wins).slice(0, MAX_FALLEN)
  const next: Run = { ...run, leader, army, fallen, stage: run.stage + 1, offers: null, event: null }
  return runWon(next) ? next : { ...next, offers: runReward(next, stageSeed(run.seed, run.stage) ^ 0x5bd1e995) }
}

// ---- rewards ----

export const canAddPiece = (run: Run, role: Role) =>
  run.army.length < MAX_DRAFTED && run.army.filter((p) => p.role === role).length < ROLE_MAX[role]

/**
 * Three rewards to pick from (four with a Lens or after an elite; fewer if little is left to give). A camp node, or a won fight
 * with a Waystone, always offers a fallen piece when there is one.
 */
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
    () => {
      const open = EVENT_IDS.filter((e) => eventAvailable(run, e))
      return open.length ? { kind: 'event', event: pick(open) } : null
    },
  ]
  const offers: Reward[] = []
  const done = nodeTaken(run, run.stage - 1)
  const width = (run.relics.includes('lens') ? 4 : 3) + (done?.kind === 'elite' ? 1 : 0)
  const camp = done?.kind === 'rest' || (done?.kind !== 'event' && restStages(run.relics).includes(run.stage - 1))
  if (camp && run.fallen.length && run.army.length < MAX_DRAFTED) offers.push({ kind: 'revive', target: 0 })
  const order = kinds.map((k, i) => ({ k, key: roll(), i })).sort((a, b) => a.key - b.key)
  for (const { k } of order) {
    if (offers.length >= width) break
    const reward = k()
    if (reward) offers.push(reward)
  }
  return offers
}

export const canReroll = (run: Run) => !!run.offers && run.rerolls < MAX_REROLLS

/** The run with a fresh set of offers, drawn from a seed of the stage and the reroll count so a run code still reproduces it. */
export function rerollOffers(run: Run): Run {
  if (!canReroll(run)) return run
  const rerolls = run.rerolls + 1
  return { ...run, rerolls, offers: runReward(run, (stageSeed(run.seed, run.stage - 1) ^ 0x5bd1e995) + rerolls * 0x9e3779b1) }
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
    case 'event':
      return eventAvailable(run, reward.event) ? { ...next, event: reward.event } : next
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

// ---- events ----

export type EventId = 'altar' | 'pact' | 'shrine'

/** Event screens: a choice with a risk, reached by picking an event as the reward. */
export const EVENTS: Record<EventId, { name: string; text: string }> = {
  altar: { name: 'The Bone Altar', text: 'Give up a piece for good and take a relic.' },
  pact: { name: 'The Moon Pact', text: 'Trade your Leader’s max HP for a spell.' },
  shrine: { name: 'The Wayside Shrine', text: 'Pray: a coin decides between a blessing and a loss.' },
}

const EVENT_IDS = Object.keys(EVENTS) as EventId[]

/** One seeded stream per stage and event, so the same run meets the same outcomes. */
const eventStream = (run: Run, salt: number) => stream(stageSeed(run.seed, run.stage - 1) ^ salt)

/** The relic the altar would give. */
export function altarRelic(run: Run): RelicId | null {
  const open = RELIC_IDS.filter((r) => !run.relics.includes(r))
  return open.length ? open[Math.floor(eventStream(run, 0xa17a2)() * open.length)] : null
}

/** The spell the pact would give. */
export function pactSpell(run: Run): Spell | null {
  const open = spellPool(run.court).filter((s) => !run.loadout.includes(s))
  return run.loadout.length < MAX_SPELLS && open.length ? open[Math.floor(eventStream(run, 0x9ac7)() * open.length)] : null
}

/** What the shrine's coin decides: a perk for the strongest piece without one, or the strongest non-Leader piece lost. */
export function shrineBoon(run: Run): boolean {
  return eventStream(run, 0x5121e)() < 0.5
}

const shrinePerk = (run: Run) => {
  const open = roster(run).map((p, i) => ({ p, i })).filter(({ p }) => !p.perk)
  return open.sort((a, b) => b.p.wins - a.p.wins || a.i - b.i)[0] ?? null
}

/** An event is offered only when it could do something. */
export function eventAvailable(run: Run, event: EventId): boolean {
  switch (event) {
    case 'altar': return run.army.length > 0 && altarRelic(run) !== null
    case 'pact': return pactSpell(run) !== null && run.leader.bonus > MIN_BONUS
    case 'shrine': return run.army.length > 0 && shrinePerk(run) !== null
  }
}

export interface EventChoice {
  title: string
  text: string
}

/** The buttons of an event screen; the last is always to walk away. */
export function eventChoices(run: Run, event: EventId): EventChoice[] {
  const names = ROLE_NAMES[run.court]
  const leave: EventChoice = { title: 'Walk away', text: 'Nothing changes.' }
  switch (event) {
    case 'altar': {
      const relic = altarRelic(run)
      return [
        ...run.army.map((p): EventChoice => ({ title: `Give up the ${names[p.role]}`, text: `${p.wins} win${p.wins === 1 ? '' : 's'}; it is gone for good. You gain ${relic ? RELICS[relic].name : 'nothing'}.` })),
        leave,
      ]
    }
    case 'pact': {
      const spell = pactSpell(run)
      return [{ title: `Sign: ${spell ?? 'a spell'}`, text: 'Your Leader loses 1 max HP for the rest of the run (at most 2 can be lost this way) and learns the spell.' }, leave]
    }
    case 'shrine':
      return [{ title: 'Pray', text: 'Even odds: your strongest piece without a perk becomes an Elite with one, or your strongest piece besides the Leader is lost for good.' }, leave]
  }
}

/** The run after choice `choice` of the event it faces, and a line saying what happened. */
export function resolveEvent(run: Run, choice: number): { run: Run; text: string } {
  const event = run.event
  const done: Run = { ...run, event: null }
  if (!event || choice < 0 || choice >= eventChoices(run, event).length) return { run: done, text: 'You walk on.' }
  const names = ROLE_NAMES[run.court]
  switch (event) {
    case 'altar': {
      const relic = altarRelic(run)
      const gone = run.army[choice]
      if (!gone || !relic) return { run: done, text: 'You walk on.' }
      return { run: { ...done, army: run.army.filter((_, i) => i !== choice), relics: [...run.relics, relic] }, text: `The ${names[gone.role]} is gone; you take ${RELICS[relic].name}.` }
    }
    case 'pact': {
      const spell = pactSpell(run)
      if (choice !== 0 || !spell || run.leader.bonus <= MIN_BONUS) return { run: done, text: 'You walk on.' }
      return { run: { ...done, leader: { ...run.leader, bonus: run.leader.bonus - 1 }, loadout: [...run.loadout, spell] }, text: `Your Leader gives up 1 max HP and learns ${spell}.` }
    }
    case 'shrine': {
      if (choice !== 0) return { run: done, text: 'You walk on.' }
      if (shrineBoon(run)) {
        const pick = shrinePerk(run)
        if (!pick) return { run: done, text: 'The shrine is quiet.' }
        const perk = perkChoices(pick.p.role)[0]
        const applied = withPiece(done, pick.i, (p) => ({ ...p, wins: Math.max(p.wins, ELITE_WINS), perk }))
        return { run: applied, text: `Blessed: the ${names[pick.p.role]} becomes an Elite with ${perk}.` }
      }
      const victim = run.army.map((p, i) => ({ p, i })).sort((a, b) => b.p.wins - a.p.wins || a.i - b.i)[0]
      if (!victim) return { run: done, text: 'The shrine is quiet.' }
      return {
        run: { ...done, army: run.army.filter((_, i) => i !== victim.i), fallen: [...run.fallen, victim.p].sort((a, b) => b.wins - a.wins).slice(0, MAX_FALLEN) },
        text: `Cursed: the ${names[victim.p.role]} is lost.`,
      }
    }
  }
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
