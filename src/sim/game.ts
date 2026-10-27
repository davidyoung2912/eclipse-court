import { autoDuel } from '../ai/autoDuel'
import { DIFFICULTY, type Difficulty } from '../ai/profile'
import { chooseAction } from '../ai/strategy'
import { newGame, reduce } from '../engine/reducer'
import { duelCells } from '../engine/rules/cells'
import { squareLuminance } from '../engine/rules/luminance'
import { pieceAt } from '../engine/rules/moves'
import type { Court, GameState, MatchConfig } from '../engine/rules/types'

export interface GameResult {
  state: GameState
  actions: number
  duels: number
  /** Broken invariants found along the way; empty for a healthy game. */
  problems: string[]
}

/** Square occupancy and HP bounds, which no legal sequence of actions may break. */
export function checkInvariants(state: GameState): string[] {
  const problems: string[] = []
  const seen = new Set<string>()
  for (const p of state.pieces) {
    const key = `${p.pos.x},${p.pos.y}`
    if (seen.has(key)) problems.push(`two pieces on ${key}`)
    seen.add(key)
    if (p.pos.x < 0 || p.pos.x > 6 || p.pos.y < 0 || p.pos.y > 6) problems.push(`${p.id} off the board`)
    if (!(p.hp > 0 && p.hp <= p.maxHp)) problems.push(`${p.id} has ${p.hp}/${p.maxHp} HP`)
  }
  for (const c of ['solari', 'umbral'] as Court[])
    if (state.pieces.filter((p) => p.court === c && p.role === 'leader').length > 1) problems.push(`two ${c} leaders`)
  return problems
}

/**
 * Plays one AI-vs-AI game to the end. Captures are settled by real duels between duel AIs at each
 * side's difficulty skill. Gives up (winner stays null) after `maxActions`.
 */
export function playGame(seed: number, solari: Difficulty, umbral: Difficulty, maxActions = 400, config: Partial<MatchConfig> = {}): GameResult {
  return playFrom(newGame({ ...config, seed }), seed, solari, umbral, maxActions)
}

/** Plays a game on from a given position, in the same way as `playGame`. */
export function playFrom(start: GameState, seed: number, solari: Difficulty, umbral: Difficulty, maxActions = 400): GameResult {
  const level: Record<Court, Difficulty> = { solari, umbral }
  let state = start
  let actions = 0
  let duels = 0
  const problems: string[] = []
  while (!state.winner && actions < maxActions) {
    const action = chooseAction(state, level[state.turn], seed * 1009 + actions)
    let next = action
    if (action.type === 'move') {
      const target = pieceAt(state, action.to)
      const mover = state.pieces.find((p) => p.id === action.pieceId)
      if (target && mover) {
        const skills: [number, number] = [DIFFICULTY[level[mover.court]].skill, DIFFICULTY[level[target.court]].skill]
        next = { ...action, duel: autoDuel(mover, target, squareLuminance(state, action.to), skills, seed + actions, undefined, duelCells(state, mover, target)) }
        duels++
      }
    }
    state = reduce(state, next)
    actions++
    problems.push(...checkInvariants(state))
    if (problems.length) break
  }
  return { state, actions, duels, problems }
}
