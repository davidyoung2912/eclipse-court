import type { Challenge } from '../challenge'
import { defaultBeacons, inBounds, isBlocked, samePos } from '../rules/board'
import { CELL_EFFECTS } from '../rules/cells'
import { HILL_TURNS } from '../rules/events'
import type { BoardSize, CellEffect, CellSquare, Court, MatchConfig, MatchMode, Objective, Placement, Pos, Role } from '../rules/types'
import { matchConfig } from './matchConfig'
import { DEFAULT_LAYOUT, GRAND_LAYOUT } from './roster'

/** How a custom match is won. The last three are puzzle goals: they are always Solari's. */
export type EditorGoal = 'beacons' | 'leader' | 'hill' | 'survive' | 'escort' | 'hold'

export const EDITOR_GOALS: readonly EditorGoal[] = ['beacons', 'leader', 'hill', 'survive', 'escort', 'hold']

export const GOAL_INFO: Record<EditorGoal, { name: string; text: string }> = {
  beacons: { name: 'Hold the beacons', text: 'Hold every beacon at the end of a round, or take every enemy piece.' },
  leader: { name: 'Slay the Leader', text: 'Defeat the enemy Leader.' },
  hill: { name: 'Hold the centre', text: `King of the Hill: keep the middle square for ${HILL_TURNS} turns in a row.` },
  survive: { name: 'Survive', text: 'Puzzle: keep the Solarch alive for a number of rounds.' },
  escort: { name: 'Escort', text: 'Puzzle: carry the Solarch to the goal square within a number of rounds.' },
  hold: { name: 'Hold a square', text: 'Puzzle: stand on the goal square for a number of turns in a row, within a round limit.' },
}

/** Puzzle goals are Solari's alone. */
export const isPuzzleGoal = (goal: EditorGoal) => goal === 'survive' || goal === 'escort' || goal === 'hold'

export const ROUNDS_MAX = 40
export const TURNS_MAX = 20

/** Everything the editor holds: a board, its pieces and how it is won. Umbral pieces are in board coordinates, as drawn. */
export interface Design {
  size: BoardSize
  beacons: Pos[]
  blocked: Pos[]
  cells: CellSquare[]
  solari: Placement[]
  umbral: Placement[]
  /** Umbral's army is Solari's mirrored, and `umbral` is ignored. */
  mirror: boolean
  goal: EditorGoal
  /** Survive: rounds to last. Escort and Hold: the round limit. */
  rounds: number
  /** Hold: turns in a row. */
  turns: number
  /** Escort: the goal square. Hold: the square to keep. */
  target: Pos | null
  /** The court a recipient of a non-puzzle match is invited to take. */
  side: Court
}

export type Tool =
  | { kind: 'wall' | 'beacon' | 'target' | 'erase' }
  | { kind: 'cell'; effect: CellEffect }
  | { kind: 'piece'; court: Court; role: Role }

export const ROLES: readonly Role[] = ['leader', 'aura', 'bruiser', 'charger', 'marksman', 'flier', 'footsoldier']

/** The classic board with the classic army, mirrored: the usual starting point. */
export function blankDesign(size: BoardSize = 7): Design {
  return {
    size, beacons: [...defaultBeacons(size)], blocked: [], cells: [],
    solari: (size === 9 ? GRAND_LAYOUT : DEFAULT_LAYOUT).map((p) => ({ ...p })), umbral: [], mirror: true,
    goal: 'beacons', rounds: 10, turns: 3, target: null, side: 'solari',
  }
}

const same = (a: Pos) => (b: Pos) => samePos(a, b)
const mirrorX = (x: number, size: number) => size - 1 - x

/** Umbral's pieces as they stand on the board. */
export const umbralPieces = (d: Design): Placement[] => (d.mirror ? d.solari.map((p) => ({ ...p, x: mirrorX(p.x, d.size) })) : d.umbral)

/** Solari's pieces as they stand on the board. */
export const solariPieces = (d: Design): Placement[] => d.solari

const without = <T extends { pos: Pos }>(list: T[], at: Pos) => list.filter((c) => !samePos(c.pos, at))
const withoutPiece = (list: Placement[], at: Pos) => list.filter((p) => !samePos(p, at))

/** Whether a Solari piece may be placed at `at`: in a mirrored army it must stay on its own side of the middle column. */
export const canPlace = (d: Design, court: Court, at: Pos) => {
  if (!inBounds(at, d.size)) return false
  if (!d.mirror) return true
  return court === 'solari' && at.x < (d.size - 1) / 2
}

/** The design after a tap with `tool` on `at`; a tap that does nothing returns the same design. */
export function applyTool(d: Design, tool: Tool, at: Pos): Design {
  if (!inBounds(at, d.size)) return d
  const clearSquare = (n: Design): Design => ({
    ...n,
    beacons: n.beacons.filter((b) => !samePos(b, at)),
    cells: without(n.cells, at),
    solari: withoutPiece(n.solari, at),
    umbral: withoutPiece(n.umbral, at),
    target: n.target && samePos(n.target, at) ? null : n.target,
  })
  switch (tool.kind) {
    case 'erase':
      return clearSquare({ ...d, blocked: d.blocked.filter((b) => !samePos(b, at)) })
    case 'wall':
      return d.blocked.some(same(at))
        ? { ...d, blocked: d.blocked.filter((b) => !samePos(b, at)) }
        : { ...clearSquare(d), blocked: [...d.blocked, at] }
    case 'beacon':
      if (isBlocked(d, at)) return d
      return { ...d, beacons: d.beacons.some(same(at)) ? d.beacons.filter((b) => !samePos(b, at)) : [...d.beacons, at] }
    case 'target':
      if (isBlocked(d, at)) return d
      return { ...d, target: d.target && samePos(d.target, at) ? null : at }
    case 'cell': {
      if (isBlocked(d, at)) return d
      const existing = d.cells.find((c) => samePos(c.pos, at))
      const rest = without(d.cells, at)
      return { ...d, cells: existing?.effect === tool.effect ? rest : [...rest, { pos: at, effect: tool.effect }] }
    }
    case 'piece': {
      if (isBlocked(d, at) || !canPlace(d, tool.court, at)) return d
      const key = tool.court === 'solari' ? 'solari' : 'umbral'
      const stripped = { ...d, solari: withoutPiece(d.solari, at), umbral: withoutPiece(d.umbral, at) }
      // Tapping the piece that is already there takes it away.
      if (d[key].some((p) => samePos(p, at) && p.role === tool.role)) return stripped
      return { ...stripped, [key]: [...stripped[key], { role: tool.role, x: at.x, y: at.y }] }
    }
  }
}

/** Switches mirroring. Turning it off keeps the mirrored army as a starting point for Umbral's own. */
export function setMirror(d: Design, mirror: boolean): Design {
  if (d.mirror === mirror) return d
  if (mirror) return { ...d, mirror, umbral: [], solari: d.solari.filter((p) => p.x < (d.size - 1) / 2) }
  return { ...d, mirror, umbral: umbralPieces(d) }
}

/** The same design on a board of another size; anything that would fall off the board is dropped. */
export function resize(d: Design, size: BoardSize): Design {
  if (d.size === size) return d
  if (size === 9) {
    // The 7x7 layout is moved to the middle of the wider board: a column in from the side, and everything past the middle
    // line (the far army, the far beacon) out to the new far edge.
    const grow = ({ x, y }: Pos): Pos => ({ x: x < 3 ? x : x === 3 ? 4 : x + 2, y: y + 1 })
    return {
      ...d, size,
      beacons: d.beacons.map(grow), blocked: d.blocked.map(grow), cells: d.cells.map((c) => ({ ...c, pos: grow(c.pos) })),
      solari: d.solari.map((p) => ({ ...p, ...grow(p) })), umbral: d.umbral.map((p) => ({ ...p, ...grow(p) })), target: d.target && grow(d.target),
    }
  }
  const fits = (p: Pos) => inBounds(p, size)
  return {
    ...d, size,
    beacons: d.beacons.filter(fits), blocked: d.blocked.filter(fits), cells: d.cells.filter((c) => fits(c.pos)),
    solari: d.solari.filter(fits), umbral: d.umbral.filter(fits), target: d.target && fits(d.target) ? d.target : null,
  }
}

/** Takes every piece, wall, cell and beacon off the board, keeping its size and goal. */
export const clearBoard = (d: Design): Design => ({ ...d, beacons: [], blocked: [], cells: [], solari: [], umbral: [], target: null })

/** What stops this design from being played, in words; empty means it can be tested and shared. */
export function problems(d: Design): string[] {
  const out: string[] = []
  const sides: [string, Placement[]][] = [['Solari', solariPieces(d)], ['Umbral', umbralPieces(d)]]
  for (const [name, pieces] of sides) {
    const leaders = pieces.filter((p) => p.role === 'leader').length
    if (leaders === 0) out.push(`${name} needs a Leader.`)
    if (leaders > 1) out.push(`${name} has ${leaders} Leaders; use one.`)
  }
  const all = [...solariPieces(d), ...umbralPieces(d)]
  if (all.some((p) => isBlocked(d, p))) out.push('A piece stands on a wall.')
  if (all.some((p, i) => all.findIndex((o) => samePos(o, p)) !== i)) out.push('Two pieces share a square.')
  if (d.goal === 'beacons' && d.beacons.length === 0) out.push('Holding the beacons needs at least one beacon.')
  if ((d.goal === 'escort' || d.goal === 'hold') && !d.target) out.push(d.goal === 'escort' ? 'Place the goal square for the escort.' : 'Place the square to hold.')
  if (d.goal === 'escort' && d.target && all.some((p) => samePos(p, d.target!))) out.push('The goal square must start empty.')
  if (d.goal === 'survive' && (d.rounds < 1 || d.rounds > ROUNDS_MAX)) out.push(`Survive between 1 and ${ROUNDS_MAX} rounds.`)
  if ((d.goal === 'escort' || d.goal === 'hold') && (d.rounds < 1 || d.rounds > ROUNDS_MAX)) out.push(`The round limit is between 1 and ${ROUNDS_MAX}.`)
  if (d.goal === 'hold' && (d.turns < 1 || d.turns > TURNS_MAX)) out.push(`Hold for between 1 and ${TURNS_MAX} turns.`)
  if (d.goal === 'hold' && d.turns > d.rounds) out.push('The round limit is shorter than the turns to hold.')
  return out
}

/** The court a recipient plays: puzzle goals are Solari's. */
export const sideOf = (d: Design): Court => (isPuzzleGoal(d.goal) ? 'solari' : d.side)

function objectiveOf(d: Design): Objective | undefined {
  if (d.goal === 'survive') return { kind: 'survive', rounds: d.rounds }
  if (d.goal === 'escort' && d.target) return { kind: 'escort', goal: d.target, limit: d.rounds }
  if (d.goal === 'hold' && d.target) return { kind: 'hold', at: d.target, turns: d.turns, limit: d.rounds }
  return undefined
}

/** The match a valid design describes. Custom matches are marked with the board and setup name `custom`. */
export function designConfig(d: Design, seed: number): MatchConfig {
  const mode: MatchMode | undefined = d.goal === 'leader' || d.goal === 'hill' ? d.goal : undefined
  const objective = objectiveOf(d)
  return matchConfig({
    seed, size: d.size === 9 ? 9 : undefined,
    beacons: d.beacons, blocked: d.blocked, cells: d.cells.length ? d.cells : undefined,
    layout: d.solari, umbralLayout: d.mirror ? undefined : d.umbral.map((p) => ({ ...p, x: mirrorX(p.x, d.size) })),
    mode, objective, setup: 'custom', board: 'custom',
  })
}

/** A challenge from a valid design, or null while it has problems. */
export function designChallenge(d: Design, seed: number): Challenge | null {
  return problems(d).length ? null : { config: designConfig(d, seed), side: sideOf(d) }
}

/** Whether a match came out of the editor. */
export const isCustom = (config: Pick<MatchConfig, 'board'>) => config.board === 'custom'

/** The design behind a match, so a shared board can be opened and changed. Rules the editor has no control for are dropped. */
export function designFromConfig(config: MatchConfig, side: Court = 'solari'): Design {
  const size: BoardSize = config.size === 9 ? 9 : 7
  const o = config.objective
  const goal: EditorGoal = o ? o.kind : config.mode === 'leader' || config.mode === 'hill' ? config.mode : 'beacons'
  return {
    size,
    beacons: config.beacons.map((p) => ({ ...p })), blocked: (config.blocked ?? []).map((p) => ({ ...p })),
    cells: (config.cells ?? []).map((c) => ({ pos: { ...c.pos }, effect: c.effect })),
    solari: config.layout.map((p) => ({ ...p })),
    umbral: (config.umbralLayout ?? []).map((p) => ({ ...p, x: mirrorX(p.x, size) })),
    mirror: !config.umbralLayout,
    goal,
    rounds: o ? (o.kind === 'survive' ? o.rounds : o.limit) : 10,
    turns: o?.kind === 'hold' ? o.turns : 3,
    target: o?.kind === 'escort' ? { ...o.goal } : o?.kind === 'hold' ? { ...o.at } : null,
    side,
  }
}

const isRole = (r: unknown): r is Role => ROLES.includes(r as Role)
const isCell = (e: unknown): e is CellEffect => (CELL_EFFECTS as readonly unknown[]).includes(e)
const isCourt = (c: unknown): c is Court => c === 'solari' || c === 'umbral'
const int = (v: unknown, min: number, max: number, fallback: number) => (typeof v === 'number' && Number.isInteger(v) && v >= min && v <= max ? v : fallback)

/** A saved draft read back into a design; anything unreadable falls back to the blank board. */
export function parseDesign(raw: unknown): Design {
  const o = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const size: BoardSize = o.size === 9 ? 9 : 7
  const base = blankDesign(size)
  const pos = (p: unknown): Pos | null => {
    const q = p as Partial<Pos> | null
    return q && typeof q === 'object' && Number.isInteger(q.x) && Number.isInteger(q.y) && inBounds(q as Pos, size) ? { x: q.x!, y: q.y! } : null
  }
  const list = <T,>(v: unknown, read: (item: unknown) => T | null): T[] => (Array.isArray(v) ? v.map(read).filter((x): x is T => x !== null).slice(0, size * size) : [])
  const piece = (p: unknown): Placement | null => {
    const at = pos(p)
    const role = (p as { role?: unknown } | null)?.role
    return at && isRole(role) ? { role, ...at } : null
  }
  const cell = (c: unknown): CellSquare | null => {
    const at = pos((c as { pos?: unknown } | null)?.pos)
    const effect = (c as { effect?: unknown } | null)?.effect
    return at && isCell(effect) ? { pos: at, effect } : null
  }
  const goal = EDITOR_GOALS.includes(o.goal as EditorGoal) ? (o.goal as EditorGoal) : base.goal
  if (!Array.isArray(o.solari)) return base
  return {
    size, beacons: list(o.beacons, pos), blocked: list(o.blocked, pos), cells: list(o.cells, cell),
    solari: list(o.solari, piece), umbral: list(o.umbral, piece), mirror: o.mirror !== false, goal,
    rounds: int(o.rounds, 1, ROUNDS_MAX, base.rounds), turns: int(o.turns, 1, TURNS_MAX, base.turns),
    target: pos(o.target), side: isCourt(o.side) ? o.side : 'solari',
  }
}
