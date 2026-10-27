import { chooseAction } from '../../../ai/strategy'
import { stubDuel, reduce } from '../../reducer'
import { squareLuminance } from '../../rules/luminance'
import { legalMoves, pieceAt } from '../../rules/moves'
import { canCast, spellTargets } from '../../rules/spells'
import type { Action, GameState } from '../../rules/types'
import type { Puzzle } from './helpers'

/** How the other side answers while the solver looks for wins. */
export type Rival = 'pass' | 'ai'

/** The rolls the stub duel is tried at; a puzzle fight must come out the same at all of them. */
export const DUEL_LUCK = [0, 0.25, 0.5, 0.75, 1] as const

/** Every action Solari could take: moves (an attack carries the stub duel's result, and only decided fights are offered), casts with each target, and a pass. */
export function playerActions(state: GameState): Action[] {
  const out: Action[] = []
  for (const piece of state.pieces) {
    if (piece.court !== state.turn) continue
    for (const to of legalMoves(state, piece)) {
      const target = pieceAt(state, to)
      if (!target) { out.push({ type: 'move', pieceId: piece.id, to }); continue }
      // A fight that luck could swing either way is not something a puzzle can ask of the player.
      const lum = squareLuminance(state, to)
      const results = DUEL_LUCK.map((roll) => stubDuel(piece, target, lum, roll))
      if (results.every((r) => r.defenderHp <= 0) || results.every((r) => r.attackerHp <= 0))
        out.push({ type: 'move', pieceId: piece.id, to, duel: results[2] })
    }
  }
  for (const spell of state.spells[state.turn]) {
    if (!canCast(state, state.turn, spell)) continue
    const t = spellTargets(state, state.turn, spell)
    if (t.none) out.push({ type: 'cast', spell })
    else if (spell === 'exchange') {
      for (const id of t.pieces) {
        const rest = spellTargets(state, state.turn, spell, id).pieces
        for (const other of rest) out.push({ type: 'cast', spell, pieceId: id, to: state.pieces.find((p) => p.id === other)!.pos })
      }
    } else if (t.pieces.length) for (const id of t.pieces) out.push({ type: 'cast', spell, pieceId: id })
    else for (const to of t.squares) out.push({ type: 'cast', spell, to })
  }
  out.push({ type: 'pass' })
  return out
}

/**
 * The rival's reply, as the puzzle screen plays it. An attack it makes is settled by the stub duel, but only when luck cannot change the
 * result; a fight that could go either way returns null, since a puzzle cannot promise how the player's duel will end.
 */
export function rivalReply(state: GameState, puzzle: Pick<Puzzle, 'difficulty'>, rival: Rival, seedShift = 0): Action | null {
  if (rival === 'pass') return { type: 'pass' }
  const reply = chooseAction(state, puzzle.difficulty, state.rng + state.round + seedShift)
  if (reply.type !== 'move') return reply
  const defender = pieceAt(state, reply.to)
  if (!defender) return reply
  const attacker = state.pieces.find((p) => p.id === reply.pieceId)!
  const lum = squareLuminance(state, reply.to)
  const results = DUEL_LUCK.map((roll) => stubDuel(attacker, defender, lum, roll))
  return results.every((r) => r.defenderHp <= 0) || results.every((r) => r.attackerHp <= 0) ? { ...reply, duel: results[2] } : null
}

/** A key for a position that ignores how it was reached, so move orders that agree are searched once. */
function keyOf(s: GameState): string {
  const pieces = s.pieces.map((p) => `${p.id}@${p.pos.x},${p.pos.y}:${p.hp}${p.bound ? 'b' : ''}${p.shrouded ? 's' : ''}`).sort().join(' ')
  return `${pieces}|${s.captured.map((p) => p.id).join()}|${s.spells.solari.join()}|${s.phase}${s.dir}${s.hold}|${s.lastCast.solari}|${s.lastCast.umbral}|${s.round}`
}

export interface Solved {
  /** Fewest turns in which Solari wins, or null if none within the limit. */
  turns: number | null
  /** The winning lines of that length, up to `cap` of them. */
  lines: Action[][]
  /** Distinct first actions across all winning lines. */
  firsts: number
  /** Positions searched. */
  nodes: number
}

/** Breadth-first search over Solari's turns, up to `maxTurns`; the rival answers by `rival`. */
export function solve(start: GameState, puzzle: Pick<Puzzle, 'difficulty'>, maxTurns: number, rival: Rival, cap = 8, maxNodes = Infinity): Solved {
  let frontier = new Map<string, { state: GameState; line: Action[] }>([[keyOf(start), { state: start, line: [] }]])
  let nodes = 0
  for (let turn = 1; turn <= maxTurns; turn++) {
    const lines: Action[][] = []
    const next = new Map<string, { state: GameState; line: Action[] }>()
    for (const { state, line } of frontier.values()) {
      for (const action of playerActions(state)) {
        if (++nodes > maxNodes) return { turns: null, lines: [], firsts: 0, nodes }
        const after = reduce(state, action)
        if (after === state) continue
        if (after.winner === 'solari') { lines.push([...line, action]); continue }
        if (after.winner || turn === maxTurns) continue
        const answer = rivalReply(after, puzzle, rival)
        // A rival attack that luck could swing either way is not something a puzzle can promise, so those lines are not counted.
        if (!answer) continue
        const reply = reduce(after, answer)
        if (reply.winner) continue
        const key = keyOf(reply)
        if (!next.has(key)) next.set(key, { state: reply, line: [...line, action] })
      }
    }
    if (lines.length) {
      const firsts = new Set(lines.map((l) => JSON.stringify(l[0])))
      return { turns: turn, lines: lines.slice(0, cap), firsts: firsts.size, nodes }
    }
    frontier = next
  }
  return { turns: null, lines: [], firsts: 0, nodes }
}

/** An action as the code that would write it into a puzzle file. */
export function actionCode(a: Action): string {
  const sq = (p: { x: number; y: number }) => `${p.x}, ${p.y}`
  if (a.type === 'pass') return `{ type: 'pass' }`
  if (a.type === 'move') {
    const duel = a.duel ? `, duel: { attackerHp: ${a.duel.attackerHp}, defenderHp: ${a.duel.defenderHp} }` : ''
    return a.duel ? `{ type: 'move', pieceId: '${a.pieceId}', to: at(${sq(a.to)})${duel} }` : `move('${a.pieceId}', ${sq(a.to)})`
  }
  const parts = [a.pieceId && `piece: '${a.pieceId}'`, a.to && `to: at(${sq(a.to)})`].filter(Boolean).join(', ')
  return parts ? `cast('${a.spell}', { ${parts} })` : `cast('${a.spell}')`
}
