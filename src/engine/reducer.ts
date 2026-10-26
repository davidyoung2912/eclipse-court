import { startingPieces } from './data/roster'
import { rngNext } from './rng'
import { BEACONS, isBeacon, samePos } from './rules/board'
import { DAY, duelMods, squareLuminance } from './rules/luminance'
import { legalMoves, pieceAt } from './rules/moves'
import type { Action, Court, DuelOutcome, GameState, Piece } from './rules/types'
import { ROLE_STATS } from './data/roster'

export const ECLIPSE_ROUND = 30

export function newGame(seed = 1): GameState {
  return {
    pieces: startingPieces(),
    captured: [],
    turn: 'solari',
    round: 1,
    phase: 0,
    dir: 1,
    eclipse: false,
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
  for (const p of state.pieces) {
    let { hp, rest } = p
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

function finishTurn(state: GameState): GameState {
  const mover = state.turn
  const winner = evaluateWin(state, mover)
  if (winner) return { ...state, winner }
  let next: GameState = { ...state, turn: other(mover) }
  if (mover === 'umbral') {
    next = endRound(next)
    next = { ...next, winner: eliminationWinner(next) }
  }
  return next
}

/** Pure, deterministic transition. Illegal actions return the state unchanged. */
export function reduce(state: GameState, action: Action): GameState {
  if (state.winner) return state
  if (action.type === 'pass') return finishTurn(state)

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
