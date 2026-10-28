/** What Shards buy. Cosmetics only: they change colours, art, sound and animation, never a rule. */
export type CosmeticKind = 'theme' | 'pieces' | 'capture' | 'board' | 'sound' | 'codex'

export interface Cosmetic {
  kind: CosmeticKind
  id: string
  name: string
  text: string
  /** Shards to buy it; 0 is owned from the start unless `goals` is set. */
  cost: number
  /** Piece mastery goals to complete to earn it; it is never sold. */
  goals?: number
}

export const KIND_TITLES: Record<CosmeticKind, string> = {
  theme: 'Board themes',
  pieces: 'Piece sets',
  capture: 'Capture effects',
  board: 'Board effects',
  sound: 'Sound packs',
  codex: 'Codex frames',
}

export const KINDS: readonly CosmeticKind[] = ['theme', 'pieces', 'capture', 'board', 'sound', 'codex']

export const COSMETICS: readonly Cosmetic[] = [
  { kind: 'theme', id: 'obsidian', name: 'Obsidian', text: 'Black glass with a cold white gleam.', cost: 120 },
  { kind: 'theme', id: 'rosegold', name: 'Rose Gold', text: 'Blush metal over deep plum.', cost: 150 },
  { kind: 'theme', id: 'sandstorm', name: 'Sandstorm', text: 'Dune gold and dusk teal.', cost: 150 },

  { kind: 'pieces', id: 'classic', name: 'Stained Glass', text: 'The medallions as first cut.', cost: 0 },
  { kind: 'pieces', id: 'gilded', name: 'Gilded', text: 'Beaten gold and ivory panes.', cost: 100 },
  { kind: 'pieces', id: 'jade', name: 'Jade', text: 'Green stone, pale and dark.', cost: 100 },
  { kind: 'pieces', id: 'mono', name: 'Ink and Bone', text: 'Two courts in plain black and white.', cost: 80 },

  { kind: 'pieces', id: 'aurora', name: 'Aurora', text: 'Panes that drift between green and violet light. Animated.', cost: 280 },
  { kind: 'pieces', id: 'forge', name: 'Forge Glass', text: 'Panes that glow like cooling metal. Animated.', cost: 340 },

  { kind: 'capture', id: 'fade', name: 'Quiet Fall', text: 'A soft ring where a piece falls.', cost: 0 },
  { kind: 'capture', id: 'shatter', name: 'Shatter', text: 'Glass shards fly outward.', cost: 80 },
  { kind: 'capture', id: 'embers', name: 'Embers', text: 'Sparks rise from the square.', cost: 100 },
  { kind: 'capture', id: 'stardust', name: 'Stardust', text: 'A wide, slow burst of light.', cost: 120 },

  { kind: 'capture', id: 'comet', name: 'Comet', text: 'A long trail of pale fire.', cost: 0, goals: 6 },
  { kind: 'capture', id: 'supernova', name: 'Supernova', text: 'A wide golden bloom. Earned by mastering every piece.', cost: 0, goals: 28 },

  { kind: 'board', id: 'still', name: 'Still Board', text: 'The squares as they are.', cost: 0 },
  { kind: 'board', id: 'starlit', name: 'Starlit', text: 'Squares twinkle one after another. Animated.', cost: 240 },
  { kind: 'board', id: 'tidal', name: 'Tidal', text: 'A slow swell rolls across the board. Animated.', cost: 300 },
  { kind: 'board', id: 'cinder', name: 'Cinder Drift', text: 'The glow on lit squares breathes like coals. Animated.', cost: 360 },

  { kind: 'sound', id: 'classic', name: 'Classic', text: 'The original synth voices.', cost: 0 },
  { kind: 'sound', id: 'crystal', name: 'Crystal', text: 'Bright, high and glassy.', cost: 90 },
  { kind: 'sound', id: 'deep', name: 'Deep Hall', text: 'Lower and rounder, like a stone hall.', cost: 90 },
  { kind: 'sound', id: 'chip', name: 'Chiptune', text: 'Hard square-wave beeps.', cost: 110 },

  { kind: 'codex', id: 'plain', name: 'Plain Frame', text: 'The story panel as it is.', cost: 0 },
  { kind: 'codex', id: 'gilt', name: 'Gilt Frame', text: 'A gold border around every scene.', cost: 70 },
  { kind: 'codex', id: 'moon', name: 'Moonlit Frame', text: 'A pale blue border and glow.', cost: 70 },
  { kind: 'codex', id: 'ember', name: 'Emberlit Frame', text: 'A red-orange border and glow.', cost: 90 },
  { kind: 'codex', id: 'laurel', name: 'Laurel Frame', text: 'A green-gold border, for those who have mastered the pieces.', cost: 0, goals: 14 },
]

export const cosmeticsOf = (kind: CosmeticKind) => COSMETICS.filter((c) => c.kind === kind)
export const cosmeticKey = (c: Pick<Cosmetic, 'kind' | 'id'>) => `${c.kind}:${c.id}`
export const findCosmetic = (kind: CosmeticKind, id: string) => COSMETICS.find((c) => c.kind === kind && c.id === id)
/** What each kind starts equipped with: its free first entry. */
export const defaultOf = (kind: CosmeticKind) => cosmeticsOf(kind).find((c) => c.cost === 0 && !c.goals)?.id ?? ''

/** A sound pack: a pitch ratio and, optionally, a wave that replaces the plain tones'. */
export interface Voice {
  pitch: number
  wave?: OscillatorType
}

export const VOICES: Record<string, Voice> = {
  classic: { pitch: 1 },
  crystal: { pitch: 1.5, wave: 'sine' },
  deep: { pitch: 0.7, wave: 'triangle' },
  chip: { pitch: 1, wave: 'square' },
}

/** A capture effect: how many shards of light and what colour. */
export interface CaptureFx {
  parts: number
  colour: string
  reach: number
}

export const CAPTURE_FX: Record<string, CaptureFx> = {
  fade: { parts: 0, colour: '#ffffff', reach: 0.5 },
  shatter: { parts: 8, colour: '#bfe6ff', reach: 0.6 },
  embers: { parts: 6, colour: '#ff9a3c', reach: 0.7 },
  stardust: { parts: 12, colour: '#fff3b8', reach: 0.9 },
  comet: { parts: 7, colour: '#d6ecff', reach: 1.1 },
  supernova: { parts: 16, colour: '#ffd36b', reach: 1.2 },
}

export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legend'

export const RARITY_LABELS: Record<Rarity, string> = { common: 'Common', uncommon: 'Uncommon', rare: 'Rare', epic: 'Epic', legend: 'Legend' }

/** How rare a cosmetic is: earned ones are Legend, sold ones rank by price. */
export function rarityOf(c: Pick<Cosmetic, 'cost' | 'goals'>): Rarity {
  if (c.goals) return 'legend'
  if (c.cost >= 280) return 'epic'
  if (c.cost >= 110) return 'rare'
  if (c.cost > 0) return 'uncommon'
  return 'common'
}
