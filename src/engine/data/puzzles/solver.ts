import { chooseAction } from '../../../ai/strategy'
import { stubDuel, reduce } from '../../reducer'
import { squareLuminance } from '../../rules/luminance'
import { legalMoves, pieceAt } from '../../rules/moves'
import { canCast, spellTargets } from '../../rules/spells'
import type { Action, GameState } from '../../rules/types'
import type { Puzzle } from './helpers'

/** How the other side answers while the solver looks for wins. */
export type Rival = 'pass' | 'ai'

/** Every action Solari could take: moves (an attack carries the stub duel's middling result), casts with each target, and a pass. */
export function playerActions(state: GameState): Action[] {
  const out: Action[] = []
  for (const piece of state.pieces) {
    if (piece.court !== state.turn) continue
    for (const to of legalMoves(state, piece)) {
      const target = pieceAt(state, to)
      out.push(target
        ? { type: 'move', pieceId: piece.id, to, duel: stubDuel(piece, target, squareLuminance(state, to), 0.5) }
        : { type: 'move', pieceId: piece.id, to })
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

/** The rival's reply, as the puzzle screen plays it; an attack by the rival leaves both pieces standing, so authors avoid positions where one happens. */
export function rivalReply(state: GameState, puzzle: Pick<Puzzle, 'difficulty'>, rival: Rival, seedShift = 0): Action {
  if (rival === 'pass') return { type: 'pass' }
  const reply = chooseAction(state, puzzle.difficulty, state.rng + state.round + seedShift)
  return reply.type === 'move' && pieceAt(state, reply.to)
    ? { ...reply, duel: { attackerHp: 1, defenderHp: 1 } }
    : reply
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
export function solve(start: GameState, puzzle: Pick<Puzzle, 'difficulty'>, maxTurns: number, rival: Rival, cap = 8): Solved {
  let frontier = new Map<string, { state: GameState; line: Action[] }>([[keyOf(start), { state: start, line: [] }]])
  let nodes = 0
  for (let turn = 1; turn <= maxTurns; turn++) {
    const lines: Action[][] = []
    const next = new Map<string, { state: GameState; line: Action[] }>()
    for (const { state, line } of frontier.values()) {
      for (const action of playerActions(state)) {
        nodes++
        const after = reduce(state, action)
        if (after === state) continue
        if (after.winner === 'solari') { lines.push([...line, action]); continue }
        if (after.winner || turn === maxTurns) continue
        const reply = reduce(after, rivalReply(after, puzzle, rival))
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
