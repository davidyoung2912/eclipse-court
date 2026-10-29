import { rngNext } from '../rng'

/** What a node of the map holds: a fight, a harder fight that pays more, an event screen, a camp, or the final boss. */
export type NodeKind = 'fight' | 'elite' | 'event' | 'rest' | 'boss'

export interface MapNode {
  kind: NodeKind
}

/** Display names of the node kinds. */
export const NODE_NAMES: Record<NodeKind, string> = { fight: 'Fight', elite: 'Elite', event: 'Event', rest: 'Camp', boss: 'Boss' }

/** The earliest layer an elite can stand on. */
export const ELITE_FROM = 3

const WEIGHTS: readonly { kind: NodeKind; weight: number }[] = [
  { kind: 'fight', weight: 5 },
  { kind: 'elite', weight: 2 },
  { kind: 'event', weight: 2 },
  { kind: 'rest', weight: 1.5 },
]

/**
 * The layered map of a run, built from its seed alone so a run code reproduces it. Layer `i` (1-based) is the choice
 * offered before stage `i`: two or three nodes, every layer holding at least one fight or elite. The first layer is
 * fights only, the last is the boss alone, and the layer before the boss always has a camp unless ascension 2 has
 * taken the camps away.
 */
export function buildMap(seed: number, ascension: number, layers: number): MapNode[][] {
  let state = (seed ^ 0x6a09e667) >>> 0
  const roll = () => {
    const [value, next] = rngNext(state)
    state = next
    return value
  }
  const camps = ascension < 2
  return Array.from({ length: layers }, (_, i): MapNode[] => {
    const layer = i + 1
    if (layer === layers) return [{ kind: 'boss' }]
    const width = roll() < 0.4 ? 3 : 2
    const allowed = WEIGHTS.filter((w) => (w.kind !== 'elite' || layer >= ELITE_FROM) && (w.kind !== 'rest' || (camps && layer > 1)) && (layer > 1 || w.kind === 'fight'))
    const draw = (from: readonly { kind: NodeKind; weight: number }[]): NodeKind => {
      let at = roll() * from.reduce((n, w) => n + w.weight, 0)
      for (const w of from) {
        at -= w.weight
        if (at < 0) return w.kind
      }
      return from[from.length - 1].kind
    }
    const kinds: NodeKind[] = [draw(allowed.filter((w) => w.kind === 'fight' || w.kind === 'elite'))]
    while (kinds.length < width) kinds.push(draw(allowed))
    if (camps && layer === layers - 1 && !kinds.includes('rest')) kinds[kinds.length - 1] = 'rest'
    // A shuffle, so the guaranteed fight is not always on the left.
    const order = kinds.map((kind) => ({ kind, key: roll() })).sort((a, b) => a.key - b.key)
    return order.map(({ kind }) => ({ kind }))
  })
}
