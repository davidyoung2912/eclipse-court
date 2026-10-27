import { reduceLegal, stubDuel } from '../engine/reducer'
import { rngNext } from '../engine/rng'
import { duelCells, type DuelCells } from '../engine/rules/cells'
import { CENTER, chebyshev, COURTS, isBeacon, otherCourt } from '../engine/rules/board'
import { modeOf, safeRadius } from '../engine/rules/events'
import { squareLuminance } from '../engine/rules/luminance'
import { legalMoves, pieceAt } from '../engine/rules/moves'
import { ALL_SPELLS, canCast, leaderOf, spellTargets } from '../engine/rules/spells'
import type { Action, Court, DuelOutcome, GameState, Piece, Pos } from '../engine/rules/types'
import { matchup } from '../engine/data/matchups'
import { PERSONALITIES, type Personality, type PersonalityId } from '../engine/data/personality'
import { DIFFICULTY, type Difficulty } from './profile'

const NEUTRAL = PERSONALITIES.balanced

const WIN = 1e5

const VALUE: Record<Piece['role'], number> = {
  footsoldier: 3, flier: 5, marksman: 5, bruiser: 8, charger: 6, aura: 5, leader: 12,
}


/** Rolls that stand in for the duel's spread of outcomes when a wounded piece is involved. */
const ROLLS = [0.15, 0.5, 0.85]

export interface Branch {
  duel: DuelOutcome
  weight: number
}

/**
 * Possible duel results with their chances. Full-health pairings use the simulated matchup table;
 * wounded pieces fall back to the stub duel, which does account for current HP.
 */
export function duelBranches(attacker: Piece, defender: Piece, lum: number, cells?: DuelCells): Branch[] {
  if (!cells && attacker.hp === attacker.maxHp && defender.hp === defender.maxHp) {
    const m = matchup(attacker, defender, lum)
    const hold = Math.max(0, 1 - m.attacker - m.defender)
    const keep = (frac: number, max: number) => Math.max(1, Math.round(frac * max))
    return [
      { duel: { attackerHp: keep(m.attackerKeeps, attacker.maxHp), defenderHp: 0 }, weight: m.attacker },
      { duel: { attackerHp: 0, defenderHp: keep(m.defenderKeeps, defender.maxHp) }, weight: m.defender },
      { duel: { attackerHp: attacker.hp, defenderHp: defender.hp }, weight: hold },
    ].filter((b) => b.weight > 0)
  }
  return ROLLS.map((r) => ({ duel: stubDuel(attacker, defender, lum, r, cells), weight: 1 / ROLLS.length }))
}

/** Static score of a position for `court`; positive is good. */
export function evaluate(state: GameState, court: Court, w: Personality = NEUTRAL): number {
  if (state.winner) return state.winner === 'draw' ? 0 : state.winner === court ? WIN - state.round : -WIN + state.round
  let score = 0
  const held: Record<Court, number> = { solari: 0, umbral: 0 }
  // Beacons each court does not yet hold, found once rather than per piece.
  const open: Record<Court, Pos[]> = { solari: [], umbral: [] }
  for (const b of state.config.beacons) {
    const holder = pieceAt(state, b)?.court
    if (holder) held[holder]++
    for (const c of COURTS) if (holder !== c) open[c].push(b)
  }
  const foe = otherCourt(court)
  const mode = modeOf(state.config)
  const { objective } = state.config
  const hillAt = objective?.kind === 'hold' ? objective.at : CENTER
  const hill = mode === 'hill' || objective?.kind === 'hold'
  // What the mode rewards: beacons for Beacons and Score Race, the centre for the Hill, little for Leader Capture.
  score += (held[court] - held[foe]) * (mode === 'leader' ? 1.5 : 4) * w.beacon
  if (mode === 'beacons') {
    if (held[court] >= 4) score += 10
    if (held[foe] >= 4) score -= 10
  } else if (mode === 'score') score += (state.score[court] - state.score[foe]) * 3
  if (hill) {
    const holder = pieceAt(state, hillAt)?.court
    for (const c of COURTS) {
      const sign = c === court ? 1 : -1
      score += sign * ((holder === c ? 6 : 0) + state.streak[c] ** 2 * 6)
    }
  }
  if (objective?.kind === 'escort') {
    // Solari wants its Leader near the goal, and Umbral wants it kept away.
    const lead = state.pieces.find((p) => p.court === 'solari' && p.role === 'leader')
    if (lead) score += (court === 'solari' ? 1 : -1) * (10 - Math.abs(lead.pos.x - objective.goal.x) - Math.abs(lead.pos.y - objective.goal.y)) * 1.5
  }
  const radius = safeRadius(state)

  for (const p of state.pieces) {
    const sign = p.court === court ? 1 : -1
    // Veterans and Elites are worth more than recruits of the same role.
    const value = ((mode === 'leader' && p.role === 'leader') || (objective && p.court === 'solari' && p.role === 'leader') ? 40 : VALUE[p.role]) * (1 + ((p.wins ?? 0) >= 2 ? 0.1 : 0) + (p.perk ? 0.15 : 0))
    score += sign * value * (0.4 + 0.6 * (p.hp / p.maxHp)) * (sign > 0 ? w.guard : w.attack)
    // Outside the closing safe zone a piece is about to be hurt, and the mover cannot save them all.
    if (radius !== null && chebyshev(p.pos, CENTER) > radius) score -= sign * VALUE[p.role] * 0.8
    if (p.bound) score -= sign * VALUE[p.role] * 0.4
    if (p.shrouded) score += sign * VALUE[p.role] * 0.15
    // Pull towards the beacons nobody on its own side holds yet (the centre, on the Hill).
    if (hill && p.role !== 'leader') {
      score += sign * 0.25 * (12 - Math.abs(hillAt.x - p.pos.x) - Math.abs(hillAt.y - p.pos.y))
    } else if (open[p.court].length && p.role !== 'leader') {
      let near = Infinity
      for (const b of open[p.court]) near = Math.min(near, Math.abs(b.x - p.pos.x) + Math.abs(b.y - p.pos.y))
      score += sign * 0.15 * (12 - near) * w.beacon
    }
    // A Footsoldier is worth more once it can cross the board and be promoted.
    if (state.config.promotion && p.role === 'footsoldier') score += sign * 0.3 * (p.court === 'solari' ? p.pos.x : 6 - p.pos.x)
    // Standing in light that favours its court.
    const lum = squareLuminance(state, p.pos)
    score += sign * 0.3 * (p.court === 'solari' ? lum : -lum)
  }
  return score
}

function moveActions(state: GameState, court: Court): Action[] {
  const out: Action[] = []
  for (const piece of state.pieces) {
    if (piece.court !== court) continue
    for (const to of legalMoves(state, piece)) out.push({ type: 'move', pieceId: piece.id, to })
  }
  return out
}

/** A handful of sensible spell casts; searching every target of every spell is not worth the time. */
function spellActions(state: GameState, court: Court): Action[] {
  const out: Action[] = []
  const worst = <T>(xs: T[], key: (x: T) => number, n: number) => [...xs].sort((a, b) => key(b) - key(a)).slice(0, n)
  for (const spell of ALL_SPELLS) {
    if (!canCast(state, court, spell)) continue
    const t = spellTargets(state, court, spell)
    const piece = (id: string) => state.pieces.find((p) => p.id === id)!
    // Mirror aims like the spell it copies.
    const kind = spell === 'mirror' ? state.lastCast[otherCourt(court)] : spell
    const leader = leaderOf(state, court)
    if (t.none) out.push({ type: 'cast', spell })
    else if (kind === 'mend')
      for (const p of worst(t.pieces.map(piece), (p) => p.maxHp - p.hp, 2)) out.push({ type: 'cast', spell, pieceId: p.id })
    else if (kind === 'bind')
      for (const p of worst(t.pieces.map(piece), (p) => VALUE[p.role], 3)) out.push({ type: 'cast', spell, pieceId: p.id })
    else if (kind === 'shroud')
      for (const p of worst(t.pieces.map(piece), (p) => VALUE[p.role] * (p.hp / p.maxHp), 2)) out.push({ type: 'cast', spell, pieceId: p.id })
    else if (kind === 'sacrifice') {
      // Only worth a piece when the Leader is badly hurt; give up the cheapest.
      if (leader && leader.maxHp - leader.hp >= 3)
        for (const p of worst(t.pieces.map(piece), (p) => -VALUE[p.role], 1)) out.push({ type: 'cast', spell, pieceId: p.id })
    } else if (kind === 'blink') {
      const spots = t.squares.filter((s) => isBeacon(s, state.config.beacons))
      for (const to of worst(spots, (s) => -(Math.abs(s.x - (leader?.pos.x ?? 0)) + Math.abs(s.y - (leader?.pos.y ?? 0))), 2))
        out.push({ type: 'cast', spell, to })
    } else if (kind === 'conjure' || kind === 'revive') {
      const to = t.squares[0]
      if (to) out.push({ type: 'cast', spell, to })
    }
    // Swap and Exchange are left to human players.
  }
  return out
}

/** Cheap ordering so the beam keeps captures, beacon grabs and big pieces first. */
function moveHint(state: GameState, mover: Piece, to: Pos): number {
  const target = pieceAt(state, to)
  let h = 0
  if (target) h += 10 + VALUE[target.role] - 0.5 * VALUE[mover.role]
  if (isBeacon(to, state.config.beacons)) h += 6
  if (isBeacon(mover.pos, state.config.beacons)) h -= 3
  return h
}

function hint(state: GameState, a: Action): number {
  if (a.type !== 'move') return -1
  return moveHint(state, state.pieces.find((p) => p.id === a.pieceId)!, a.to)
}

/** Every move for `court` (and a pass) with its ordering hint, best first. */
function rankedMoves(state: GameState, court: Court, beam: number): Action[] {
  const ranked: [Action, number][] = []
  for (const piece of state.pieces) {
    if (piece.court !== court) continue
    for (const to of legalMoves(state, piece)) ranked.push([{ type: 'move', pieceId: piece.id, to }, moveHint(state, piece, to)])
  }
  ranked.push([{ type: 'pass' }, -1])
  return ranked.sort((x, y) => y[1] - x[1]).slice(0, beam).map((r) => r[0])
}

/**
 * Value of taking `action` from `state`, averaging over duel outcomes if it is an attack.
 * `alpha` and `beta` bound the search below a quiet move; an attack's average needs each outcome
 * exact, so its replies are searched with the full window.
 */
function valueOf(state: GameState, action: Action, court: Court, depth: number, beam: number, w: Personality, alpha: number, beta: number): number {
  if (action.type === 'move') {
    const target = pieceAt(state, action.to)
    if (target) {
      const mover = state.pieces.find((p) => p.id === action.pieceId)!
      const branches = duelBranches(mover, target, squareLuminance(state, action.to), duelCells(state, mover, target))
      let sum = 0
      for (const { duel, weight } of branches)
        sum += weight * search(reduceLegal(state, { ...action, duel }), court, depth - 1, beam, w, -Infinity, Infinity)
      return sum
    }
  }
  return search(reduceLegal(state, action), court, depth - 1, beam, w, alpha, beta)
}

/** Minimax with alpha-beta pruning; the value it returns is exact whenever it lies inside the window. */
function search(state: GameState, court: Court, depth: number, beam: number, w: Personality, alpha: number, beta: number): number {
  if (state.winner || depth <= 0) return evaluate(state, court, w)
  const picked = rankedMoves(state, state.turn, beam)
  const mine = state.turn === court
  let best = mine ? -Infinity : Infinity
  for (const a of picked) {
    const v = valueOf(state, a, court, depth, beam, w, alpha, beta)
    if (mine) {
      best = Math.max(best, v)
      alpha = Math.max(alpha, best)
    } else {
      best = Math.min(best, v)
      beta = Math.min(beta, best)
    }
    if (alpha >= beta) break
  }
  return best
}

/**
 * Picks the AI court's action: a depth-limited search that scores positions on material, beacon
 * control and light (weighted by the personality), treating each attack as a chance node over duel outcomes. Weaker difficulties
 * search less deeply and blur their scores with seeded noise.
 */
export function chooseAction(state: GameState, difficulty: Difficulty, seed: number, personality: PersonalityId = 'balanced'): Action {
  const { depth, beam, noise } = DIFFICULTY[difficulty]
  const w = PERSONALITIES[personality]
  const court = state.turn
  const candidates = [...moveActions(state, court), ...spellActions(state, court), { type: 'pass' } as Action]
  // Noise is drawn per candidate in generation order, so the choice does not depend on search order.
  let rng = seed >>> 0
  const jitters = candidates.map((a) => {
    const [r, next] = rngNext(rng)
    rng = next
    return (r - 0.5) * 2 * noise + (a.type === 'pass' ? -0.5 : 0)
  })
  // Searching the promising candidates first raises the bound sooner, so the rest are cut short.
  const order = candidates.map((a, i) => [i, hint(state, a)] as const).sort((x, y) => y[1] - x[1])
  let best = 0
  let bestScore = -Infinity
  for (const [i] of order) {
    const a = candidates[i]
    const bonus = a.type === 'cast' ? w.spells : 0
    // Only a score above the best so far can win, so the search may stop once this move is shown to fall short of it.
    const floor = bestScore - bonus - jitters[i] - 1e-6
    let score = valueOf(state, a, court, depth, beam, w, floor, Infinity) + bonus
    score += jitters[i]
    // Equal scores go to the earlier candidate, as when they were searched in order.
    if (score > bestScore || (score === bestScore && i < best)) {
      bestScore = score
      best = i
    }
  }
  return candidates[best]
}
