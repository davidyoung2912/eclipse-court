import { DEFAULT_CONFIG, matchConfig } from './data/matchConfig'
import { startingPieces } from './data/roster'
import { rngNext } from './rng'
import { centerOf, chebyshev, sizeOf, isBeacon, otherCourt, samePos } from './rules/board'
import { cellAt, cellHpChange, duelCells, NEUTRAL_CELL, type DuelCells } from './rules/cells'
import { eventAt, HILL_TURNS, modeOf, objectiveRounds, SCORE_TARGET, SHRINK_DAMAGE, safeRadius } from './rules/events'
import { isStock, perkMods, promote, recordWin } from './rules/growth'
import { duelMods, squareLuminance } from './rules/luminance'
import { legalMoves, pieceAt } from './rules/moves'
import type { Action, Court, DuelOutcome, GameState, MatchConfig, Piece } from './rules/types'
import { matchup } from './data/matchups'
import { ROLE_STATS } from './data/roster'
import { applySpell, canCast, leaderOf, loadoutOf, SPELL_INFO } from './rules/spells'

/** The classic match's pacing; a match's own values live in `state.config`. */
export const ECLIPSE_ROUND = DEFAULT_CONFIG.eclipseRound
/**
 * Pieces sitting on beacons are immune to Eclipse attrition and heal there, so two sides can dig in
 * forever. Soak tests found games running past round 200; once this many rounds have passed the
 * game is settled on beacons held, then total HP.
 */
export const ROUND_LIMIT = DEFAULT_CONFIG.roundLimit

/** A fresh match: a seed for the classic setup, or a full set of settings. */
export function newGame(setup: number | Partial<MatchConfig> = 1): GameState {
  const config = matchConfig(typeof setup === 'number' ? { seed: setup } : setup)
  return {
    config,
    pieces: startingPieces(config.layout, config.umbralLayout, sizeOf(config)),
    captured: [],
    turn: 'solari',
    round: 1,
    // The Hill opens with the light rising from dusk; at full dark the first court to sit on the centre could not be dislodged.
    phase: modeOf(config) === 'hill' ? Math.floor(config.day.length / 4) : 0,
    dir: config.reverse ? -1 : 1,
    eclipse: false,
    spells: { solari: [...loadoutOf(config, 'solari')], umbral: [...loadoutOf(config, 'umbral')] },
    recharging: { solari: [], umbral: [] },
    lastCast: { solari: null, umbral: null },
    hold: 0,
    score: { solari: 0, umbral: 0 },
    streak: { solari: 0, umbral: 0 },
    winner: null,
    rng: config.seed,
    lastDuel: null,
  }
}

/**
 * Stand-in duel: a race to kill, scaled by luminance and a little seeded luck.
 * The real-time duel engine replaces this by passing `duel` on the move action.
 */
export function stubDuel(
  attacker: Piece,
  defender: Piece,
  lum: number,
  roll: number,
  cells?: DuelCells,
): DuelOutcome {
  const aMods = duelMods(attacker.court, lum)
  const dMods = duelMods(defender.court, lum)
  const aPerk = perkMods(attacker)
  const dPerk = perkMods(defender)
  const aCell = cells?.attacker ?? NEUTRAL_CELL
  const dCell = cells?.defender ?? NEUTRAL_CELL
  const aPower = ROLE_STATS[attacker.role].power * aMods.dealt * dMods.taken * aPerk.dealt * dPerk.taken * aCell.dealt * dCell.taken
  const dPower = ROLE_STATS[defender.role].power * dMods.dealt * aMods.taken * dPerk.dealt * aPerk.taken * dCell.dealt * aCell.taken
  const luck = 0.75 + roll * 0.5
  // An invincible fighter takes nothing, so the other side never finishes the kill.
  const tAttackerKills = aPower > 0 ? defender.hp / (aPower * luck) : Infinity
  const tDefenderKills = dPower > 0 ? attacker.hp / dPower : Infinity
  if (tAttackerKills === Infinity && tDefenderKills === Infinity) return { attackerHp: attacker.hp, defenderHp: defender.hp }
  if (Math.abs(tAttackerKills - tDefenderKills) < 1e-6)
    return { attackerHp: attacker.hp, defenderHp: defender.hp }
  if (tAttackerKills < tDefenderKills)
    return {
      attackerHp: Math.max(1, Math.ceil(attacker.hp - tAttackerKills * dPower)),
      defenderHp: 0,
    }
  return {
    attackerHp: 0,
    defenderHp: Math.max(1, Math.ceil(defender.hp - tDefenderKills * aPower * luck)),
  }
}

export interface Odds {
  /** Chance (0..1) the attacker wins, the defender wins, or both fall / neither dies. */
  attacker: number
  defender: number
  other: number
}

const isFresh = (p: Piece) => p.hp === p.maxHp && isStock(p)

/**
 * Odds of a duel. Two full-health pieces use the simulated matchup table; if either is wounded the
 * table (which assumes full health) does not apply, so the stub duel across evenly spaced rolls
 * stands in.
 */
export function estimateOdds(attacker: Piece, defender: Piece, lum: number, samples = 21, cells?: DuelCells): Odds {
  // The matchup table assumes plain squares, so a duel on special cells is sampled instead.
  if (!cells && isFresh(attacker) && isFresh(defender)) {
    const m = matchup(attacker, defender, lum)
    return { attacker: m.attacker, defender: m.defender, other: Math.max(0, 1 - m.attacker - m.defender) }
  }
  let a = 0
  let d = 0
  for (let i = 0; i < samples; i++) {
    const o = stubDuel(attacker, defender, lum, (i + 0.5) / samples, cells)
    if (o.defenderHp <= 0 && o.attackerHp > 0) a++
    else if (o.attackerHp <= 0 && o.defenderHp > 0) d++
  }
  return { attacker: a / samples, defender: d / samples, other: 1 - (a + d) / samples }
}

/** A side wiped out or, in Leader Capture, robbed of its Leader; both at once is a draw. A scenario ends when Solari's Leader falls. */
function eliminationWinner(state: GameState): GameState['winner'] {
  const has = (c: Court, leaderOnly: boolean) => state.pieces.some((p) => p.court === c && (!leaderOnly || p.role === 'leader'))
  const leaderOnly = modeOf(state.config) === 'leader'
  const solari = has('solari', leaderOnly || !!state.config.objective)
  const umbral = has('umbral', leaderOnly)
  if (solari && umbral) return null
  return solari ? 'solari' : umbral ? 'umbral' : 'draw'
}

/** The square whose holder builds a streak: the marked beacon of a Hold scenario, otherwise the centre. */
const hillSquare = (config: MatchConfig) => (config.objective?.kind === 'hold' ? config.objective.at : centerOf(sizeOf(config)))
const holdsHill = (state: GameState, court: Court) => pieceAt(state, hillSquare(state.config))?.court === court

/** Beacons held by each court. */
function beaconsHeld(state: GameState): Record<Court, number> {
  const held: Record<Court, number> = { solari: 0, umbral: 0 }
  for (const b of state.config.beacons) {
    const occ = pieceAt(state, b)
    if (occ) held[occ.court]++
  }
  return held
}

/** End of a round: healing, Eclipse attrition, then the luminance steps. */
function endRound(state: GameState): GameState {
  const eclipse = state.eclipse
  const survivors: Piece[] = []
  const dead: Piece[] = []
  const auras = state.pieces.filter((p) => p.role === 'aura')
  const heals = eventAt(state.config, state.round) !== 'blight'
  const radius = safeRadius(state)
  for (const p of state.pieces) {
    let { hp, rest } = p
    // An Aura soothes the allies standing next to it.
    if (heals && auras.some((a) => a.id !== p.id && a.court === p.court && chebyshev(a.pos, p.pos) === 1)) hp += 1
    const onBeacon = isBeacon(p.pos, state.config.beacons)
    if (p.moved) rest = 0
    else {
      rest += 1
      if (heals && rest % 2 === 0) hp += 1
    }
    if (heals && onBeacon) hp += 1
    if (heals && p.perk === 'vigour') hp += 1
    const cell = cellAt(state.config, p.pos)
    const cellHp = cellHpChange(cell, p.maxHp)
    if (heals && cellHp > 0) hp += cellHp
    // Umbral passive: the dark mends them while the light still cycles.
    if (heals && state.config.passives && p.court === 'umbral' && !eclipse && squareLuminance(state, p.pos) < 0) hp += 1
    hp = Math.min(hp, p.maxHp)
    if (cellHp < 0) hp += cellHp
    if (eclipse && !onBeacon) hp -= 1
    // The showdown: whatever stands outside the safe zone is hurt, beacon or not.
    if (radius !== null && chebyshev(p.pos, centerOf(sizeOf(state.config))) > radius) hp -= SHRINK_DAMAGE
    const next = { ...p, hp, rest, moved: false }
    ;(hp > 0 ? survivors : dead).push(next)
  }
  const round = state.round + 1
  // Spells that recharge come back to their Leaders.
  const back = (court: Court) => state.recharging[court].filter((r) => r.ready <= round).map((r) => r.spell)
  const spells = {
    solari: [...state.spells.solari, ...back('solari')],
    umbral: [...state.spells.umbral, ...back('umbral')],
  }
  const waiting = (court: Court) => state.recharging[court].filter((r) => r.ready > round)
  const held = beaconsHeld({ ...state, pieces: survivors })
  const score = modeOf(state.config) === 'score'
    ? { solari: state.score.solari + held.solari, umbral: state.score.umbral + held.umbral }
    : state.score
  return {
    ...state,
    score,
    pieces: survivors,
    captured: [...state.captured, ...dead],
    spells,
    recharging: { solari: waiting('solari'), umbral: waiting('umbral') },
    hold: Math.max(0, state.hold - 1),
    round,
    phase: eclipse || state.hold > 0 ? state.phase : (state.phase + state.dir + state.config.day.length) % state.config.day.length,
    eclipse: eclipse || round > state.config.eclipseRound,
  }
}

function adjudicate(state: GameState): GameState['winner'] {
  const held = beaconsHeld(state)
  const hp: Record<Court, number> = { solari: 0, umbral: 0 }
  for (const p of state.pieces) hp[p.court] += p.hp
  if (modeOf(state.config) === 'score' && state.score.solari !== state.score.umbral)
    return state.score.solari > state.score.umbral ? 'solari' : 'umbral'
  if (held.solari !== held.umbral) return held.solari > held.umbral ? 'solari' : 'umbral'
  if (hp.solari !== hp.umbral) return hp.solari > hp.umbral ? 'solari' : 'umbral'
  return 'draw'
}

/** The winner, if any, once `mover` has finished a turn. Hill streaks are updated by the caller. */
function evaluateWin(state: GameState, mover: Court, streak: number): GameState['winner'] {
  const eliminated = eliminationWinner(state)
  if (eliminated) return eliminated
  const { objective } = state.config
  if (objective) {
    if (mover !== 'solari') return null
    if (objective.kind === 'escort' && samePos(leaderOf(state, 'solari')?.pos ?? { x: -1, y: -1 }, objective.goal)) return 'solari'
    if (objective.kind === 'hold' && streak >= objective.turns) return 'solari'
    return null
  }
  const mode = modeOf(state.config)
  if (mode === 'beacons' && state.config.beacons.every((b) => pieceAt(state, b)?.court === mover)) return mover
  if (mode === 'hill' && streak >= HILL_TURNS) return mover
  return null
}

/** A scenario that has run its course: Survive is won by lasting, the others lost by running out of rounds. */
function objectiveWinner(state: GameState): GameState['winner'] {
  const { objective } = state.config
  if (!objective || state.round <= objectiveRounds(objective)) return null
  return objective.kind === 'survive' ? 'solari' : 'umbral'
}

/** Score Race: the first court to the target wins, the higher score if both arrive together. */
function scoreWinner(state: GameState): GameState['winner'] {
  if (modeOf(state.config) !== 'score') return null
  const { solari, umbral } = state.score
  if (Math.max(solari, umbral) < SCORE_TARGET || solari === umbral) return null
  return solari > umbral ? 'solari' : 'umbral'
}

function finishTurn(state: GameState): GameState {
  const mover = state.turn
  const streak = { ...state.streak, [mover]: holdsHill(state, mover) ? state.streak[mover] + 1 : 0 }
  const winner = evaluateWin(state, mover, streak[mover])
  if (winner) return { ...state, streak, winner }
  // A Bind lasts until the bound court's own turn has passed; a Shroud until its caster's next turn.
  const clears = (p: Piece) => (p.court === mover ? p.bound : p.shrouded)
  const pieces = state.pieces.some(clears)
    ? state.pieces.map((p) => {
        if (p.court === mover && p.bound) return { ...p, bound: false }
        return p.court !== mover && p.shrouded ? { ...p, shrouded: false } : p
      })
    : state.pieces
  let next: GameState = { ...state, pieces, streak, turn: otherCourt(mover) }
  if (mover === 'umbral') {
    next = endRound(next)
    next = { ...next, winner: eliminationWinner(next) ?? scoreWinner(next) ?? objectiveWinner(next) ?? (next.round > next.config.roundLimit ? adjudicate(next) : null) }
  }
  return next
}

/** A cast costs the Leader HP and the whole turn; each spell works once per game unless the match recharges. */
function cast(state: GameState, a: Extract<Action, { type: 'cast' }>): GameState {
  const court = state.turn
  const leader = leaderOf(state, court)
  if (!leader || !canCast(state, court, a.spell)) return state
  const applied = applySpell(state, court, a.spell, a.pieceId, a.to)
  if (!applied) return state
  const cost = SPELL_INFO[a.spell].cost
  const pieces = applied.pieces.map((p) => (p.id === leader.id ? { ...p, hp: p.hp - cost, moved: true } : p))
  const spells = { ...applied.spells, [court]: applied.spells[court].filter((s) => s !== a.spell) }
  const { recharge } = state.config
  const recharging = recharge
    ? { ...applied.recharging, [court]: [...applied.recharging[court], { spell: a.spell, ready: state.round + recharge }] }
    : applied.recharging
  const lastCast = { ...applied.lastCast, [court]: a.spell }
  return finishTurn({ ...applied, pieces, spells, recharging, lastCast, lastDuel: null })
}

/** Pure, deterministic transition. Illegal actions return the state unchanged. */
export function reduce(state: GameState, action: Action): GameState {
  if (state.winner) return state
  if (action.type === 'pass') return finishTurn(state)
  if (action.type === 'cast') return cast(state, action)

  const piece = state.pieces.find((p) => p.id === action.pieceId)
  if (!piece || piece.court !== state.turn) return state
  if (!legalMoves(state, piece).some((m) => samePos(m, action.to))) return state
  return applyMove(state, piece, action)
}

/**
 * `reduce` for a move already known to be legal, such as one the AI search just generated from
 * `legalMoves`; skips the legality check. Anything else goes through `reduce`.
 */
export function reduceLegal(state: GameState, action: Action): GameState {
  if (state.winner || action.type !== 'move') return reduce(state, action)
  const piece = state.pieces.find((p) => p.id === action.pieceId)
  return piece ? applyMove(state, piece, action) : state
}

function applyMove(state: GameState, piece: Piece, action: Extract<Action, { type: 'move' }>): GameState {
  const target = pieceAt(state, action.to)
  if (!target) {
    const pieces = state.pieces.map((p) =>
      p.id === piece.id ? promote(state.config, { ...p, pos: action.to, moved: true }, action.promote) : p,
    )
    return finishTurn({ ...state, pieces, lastDuel: null })
  }

  const lum = squareLuminance(state, action.to)
  let rng = state.rng
  let outcome = action.duel
  if (!outcome) {
    const [roll, nextRng] = rngNext(rng)
    rng = nextRng
    outcome = stubDuel(piece, target, lum, roll, duelCells(state, piece, target))
  }
  const { attackerHp, defenderHp } = outcome
  const { config } = state
  const lastDuel = {
    attackerId: piece.id,
    defenderId: target.id,
    at: action.to,
    luminance: lum,
    ...outcome,
  }

  const pieces: Piece[] = []
  const captured = [...state.captured]
  for (const p of state.pieces) {
    if (p.id === piece.id) {
      if (attackerHp <= 0) captured.push({ ...p, hp: 0 })
      else {
        const moved = { ...p, hp: attackerHp, moved: true, pos: defenderHp <= 0 ? action.to : p.pos }
        pieces.push(defenderHp <= 0 ? promote(config, recordWin(config, moved, action.perk), action.promote) : moved)
      }
    } else if (p.id === target.id) {
      if (defenderHp <= 0) captured.push({ ...p, hp: 0 })
      else pieces.push(attackerHp <= 0 ? recordWin(config, { ...p, hp: defenderHp }) : { ...p, hp: defenderHp })
    } else pieces.push(p)
  }
  return finishTurn({ ...state, pieces, captured, rng, lastDuel })
}
