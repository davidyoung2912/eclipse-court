import { startingPieces } from './data/roster'
import { rngNext } from './rng'
import { BEACONS, isBeacon, samePos } from './rules/board'
import { DAY, duelMods, squareLuminance } from './rules/luminance'
import { legalMoves, pieceAt } from './rules/moves'
import type { Action, Court, DuelOutcome, GameState, Piece } from './rules/types'
import { matchup } from './data/matchups'
import { ROLE_STATS } from './data/roster'
import { applySpell, canCast, leaderOf, SPELLS } from './rules/spells'

export const ECLIPSE_ROUND = 30
/**
 * Pieces sitting on beacons are immune to Eclipse attrition and heal there, so two sides can dig in
 * forever. Soak tests found games running past round 200; once this many rounds have passed the
 * game is settled on beacons held, then total HP.
 */
export const ROUND_LIMIT = 50

export function newGame(seed = 1): GameState {
  return {
    pieces: startingPieces(),
    captured: [],
    turn: 'solari',
    round: 1,
    phase: 0,
    dir: 1,
    eclipse: false,
    spells: { solari: [...SPELLS], umbral: [...SPELLS] },
    winner: null,
    rng: seed >>> 0,
    lastDuel: null,
  }
}

const other = (c: Court): Court => (c === 'solari' ? 'umbral' : 'solari')

/**
 * Stand-in duel: a race to kill, scaled by luminance and a little seeded luck.
 * The real-time duel engine replaces this by passing `duel` on the move action.
 */
export function stubDuel(
  attacker: Piece,
  defender: Piece,
  lum: number,
  roll: number,
): DuelOutcome {
  const aMods = duelMods(attacker.court, lum)
  const dMods = duelMods(defender.court, lum)
  const aPower = ROLE_STATS[attacker.role].power * aMods.dealt * dMods.taken
  const dPower = ROLE_STATS[defender.role].power * dMods.dealt * aMods.taken
  const luck = 0.75 + roll * 0.5
  const tAttackerKills = defender.hp / (aPower * luck)
  const tDefenderKills = attacker.hp / dPower
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

const isFresh = (p: Piece) => p.hp === p.maxHp

/**
 * Odds of a duel. Two full-health pieces use the simulated matchup table; if either is wounded the
 * table (which assumes full health) does not apply, so the stub duel across evenly spaced rolls
 * stands in.
 */
export function estimateOdds(attacker: Piece, defender: Piece, lum: number, samples = 21): Odds {
  if (isFresh(attacker) && isFresh(defender)) {
    const m = matchup(attacker, defender, lum)
    return { attacker: m.attacker, defender: m.defender, other: Math.max(0, 1 - m.attacker - m.defender) }
  }
  let a = 0
  let d = 0
  for (let i = 0; i < samples; i++) {
    const o = stubDuel(attacker, defender, lum, (i + 0.5) / samples)
    if (o.defenderHp <= 0 && o.attackerHp > 0) a++
    else if (o.attackerHp <= 0 && o.defenderHp > 0) d++
  }
  return { attacker: a / samples, defender: d / samples, other: 1 - (a + d) / samples }
}

function eliminationWinner(state: GameState): GameState['winner'] {
  const solari = state.pieces.some((p) => p.court === 'solari')
  const umbral = state.pieces.some((p) => p.court === 'umbral')
  if (solari && umbral) return null
  return solari ? 'solari' : umbral ? 'umbral' : 'draw'
}

function evaluateWin(state: GameState, mover: Court): GameState['winner'] {
  const eliminated = eliminationWinner(state)
  if (eliminated) return eliminated
  const holdsAll = BEACONS.every((b) => pieceAt(state, b)?.court === mover)
  return holdsAll ? mover : null
}

/** End of a round: healing, Eclipse attrition, then the luminance steps. */
function endRound(state: GameState): GameState {
  const eclipse = state.eclipse
  const survivors: Piece[] = []
  const dead: Piece[] = []
  const auras = state.pieces.filter((p) => p.role === 'aura')
  for (const p of state.pieces) {
    let { hp, rest } = p
    // An Aura soothes the allies standing next to it.
    if (auras.some((a) => a.id !== p.id && a.court === p.court && Math.max(Math.abs(a.pos.x - p.pos.x), Math.abs(a.pos.y - p.pos.y)) === 1)) hp += 1
    const onBeacon = isBeacon(p.pos)
    if (p.moved) rest = 0
    else {
      rest += 1
      if (rest % 2 === 0) hp += 1
    }
    if (onBeacon) hp += 1
    hp = Math.min(hp, p.maxHp)
    if (eclipse && !onBeacon) hp -= 1
    const next = { ...p, hp, rest, moved: false }
    ;(hp > 0 ? survivors : dead).push(next)
  }
  const round = state.round + 1
  return {
    ...state,
    pieces: survivors,
    captured: [...state.captured, ...dead],
    round,
    phase: eclipse ? state.phase : (state.phase + state.dir + DAY.length) % DAY.length,
    eclipse: eclipse || round > ECLIPSE_ROUND,
  }
}

function adjudicate(state: GameState): GameState['winner'] {
  const held: Record<Court, number> = { solari: 0, umbral: 0 }
  const hp: Record<Court, number> = { solari: 0, umbral: 0 }
  for (const b of BEACONS) {
    const occ = pieceAt(state, b)
    if (occ) held[occ.court]++
  }
  for (const p of state.pieces) hp[p.court] += p.hp
  if (held.solari !== held.umbral) return held.solari > held.umbral ? 'solari' : 'umbral'
  if (hp.solari !== hp.umbral) return hp.solari > hp.umbral ? 'solari' : 'umbral'
  return 'draw'
}

function finishTurn(state: GameState): GameState {
  const mover = state.turn
  const winner = evaluateWin(state, mover)
  if (winner) return { ...state, winner }
  // A Bind lasts until the bound court's own turn has passed.
  const pieces = state.pieces.map((p) => (p.court === mover && p.bound ? { ...p, bound: false } : p))
  let next: GameState = { ...state, pieces, turn: other(mover) }
  if (mover === 'umbral') {
    next = endRound(next)
    next = { ...next, winner: eliminationWinner(next) ?? (next.round > ROUND_LIMIT ? adjudicate(next) : null) }
  }
  return next
}

/** A cast costs the Leader 1 HP and the whole turn; each spell works once per game. */
function cast(state: GameState, a: Extract<Action, { type: 'cast' }>): GameState {
  const court = state.turn
  const leader = leaderOf(state, court)
  if (!leader || !canCast(state, court, a.spell)) return state
  const applied = applySpell(state, court, a.spell, a.pieceId, a.to)
  if (!applied) return state
  const pieces = applied.pieces.map((p) => (p.id === leader.id ? { ...p, hp: p.hp - 1, moved: true } : p))
  const spells = { ...applied.spells, [court]: applied.spells[court].filter((s) => s !== a.spell) }
  return finishTurn({ ...applied, pieces, spells, lastDuel: null })
}

/** Pure, deterministic transition. Illegal actions return the state unchanged. */
export function reduce(state: GameState, action: Action): GameState {
  if (state.winner) return state
  if (action.type === 'pass') return finishTurn(state)
  if (action.type === 'cast') return cast(state, action)

  const piece = state.pieces.find((p) => p.id === action.pieceId)
  if (!piece || piece.court !== state.turn) return state
  if (!legalMoves(state, piece).some((m) => samePos(m, action.to))) return state

  const target = pieceAt(state, action.to)
  if (!target) {
    const pieces = state.pieces.map((p) =>
      p.id === piece.id ? { ...p, pos: action.to, moved: true } : p,
    )
    return finishTurn({ ...state, pieces, lastDuel: null })
  }

  const lum = squareLuminance(state, action.to)
  let rng = state.rng
  let outcome = action.duel
  if (!outcome) {
    const [roll, nextRng] = rngNext(rng)
    rng = nextRng
    outcome = stubDuel(piece, target, lum, roll)
  }
  const { attackerHp, defenderHp } = outcome
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
      else
        pieces.push({
          ...p,
          hp: attackerHp,
          moved: true,
          pos: defenderHp <= 0 ? action.to : p.pos,
        })
    } else if (p.id === target.id) {
      if (defenderHp <= 0) captured.push({ ...p, hp: 0 })
      else pieces.push({ ...p, hp: defenderHp })
    } else pieces.push(p)
  }
  return finishTurn({ ...state, pieces, captured, rng, lastDuel })
}
