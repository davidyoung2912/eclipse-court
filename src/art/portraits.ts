import type { CharacterId } from '../engine/data/story'
import { BOSSES } from '../engine/data/bosses'
import type { PersonaId } from '../engine/data/personas'

/** What sits on or behind the head; each is a flat stained-glass shape. */
export type Gear = 'crown' | 'hood' | 'helm' | 'wings' | 'veil' | 'plume' | 'horns' | 'halo' | 'ember'

export interface PortraitSpec {
  /** The three panes of the window behind the figure, cycled around it. */
  glass: readonly [string, string, string]
  skin: string
  cloth: string
  trim: string
  gear: readonly Gear[]
  /** A dark sun behind the head: the Eclipse. */
  eclipse?: boolean
  /** Eyes that glow in place of dark ones. */
  glow?: string
}

const SOLARI_GLASS = ['#f2c55c', '#e8943a', '#fbe39a'] as const
const UMBRAL_GLASS = ['#6a4cc0', '#3b2f8a', '#4aa6b8'] as const

/** One window per named figure and boss; the court's colours set the glass, the gear sets who they are. */
export const PORTRAITS = {
  ysmere: { glass: ['#8a8499', '#4b4668', '#d9c27a'], skin: '#d8cfc2', cloth: '#2a2540', trim: '#ffd77a', gear: ['crown', 'veil'], eclipse: true },
  aurel: { glass: SOLARI_GLASS, skin: '#f0cfa6', cloth: '#b3402f', trim: '#ffd77a', gear: ['halo', 'crown'] },
  nocte: { glass: UMBRAL_GLASS, skin: '#d9c7d8', cloth: '#231a52', trim: '#9ae0e8', gear: ['halo', 'hood'] },
  wren: { glass: SOLARI_GLASS, skin: '#e8bf92', cloth: '#c98a2a', trim: '#fff1b8', gear: ['wings'] },
  tam: { glass: SOLARI_GLASS, skin: '#d9a877', cloth: '#7a2f28', trim: '#e8e1cf', gear: ['helm'] },
  voss: { glass: SOLARI_GLASS, skin: '#e0b48a', cloth: '#5a1f1a', trim: '#ffd77a', gear: ['helm', 'plume'] },
  ilse: { glass: UMBRAL_GLASS, skin: '#cdbfd0', cloth: '#3a2f7a', trim: '#e4d8ff', gear: ['hood'], glow: '#9ae0e8' },
  sable: { glass: UMBRAL_GLASS, skin: '#b9a9c8', cloth: '#14102b', trim: '#9a7cf0', gear: ['wings'], glow: '#4aa6b8' },
  duskmother: { glass: UMBRAL_GLASS, skin: '#d2c0d6', cloth: '#1d1745', trim: '#e4d8ff', gear: ['veil', 'crown'] },
  cassia: { glass: SOLARI_GLASS, skin: '#eec29a', cloth: '#c9602a', trim: '#ffd77a', gear: ['helm', 'ember'] },
  pym: { glass: SOLARI_GLASS, skin: '#e8c4a0', cloth: '#d9cfae', trim: '#8a5a2a', gear: ['halo'] },
  bea: { glass: SOLARI_GLASS, skin: '#d9a877', cloth: '#4a5a7a', trim: '#e8e1cf', gear: ['helm', 'halo'] },
  mudge: { glass: UMBRAL_GLASS, skin: '#7f9a6a', cloth: '#4a3a2a', trim: '#c9b27a', gear: ['hood', 'horns'], glow: '#e8c25a' },
  lowen: { glass: UMBRAL_GLASS, skin: '#c9b6c4', cloth: '#1a1530', trim: '#9a7cf0', gear: ['wings', 'plume'] },
  digby: { glass: UMBRAL_GLASS, skin: '#a8c0a0', cloth: '#5a4a6a', trim: '#e4d8ff', gear: ['plume'], glow: '#b8e08a' },
  quill: { glass: ['#8a8f99', '#4b5160', '#d9b36a'], skin: '#e0c4a8', cloth: '#2f3440', trim: '#d9b36a', gear: ['plume'] },
  regent: { glass: ['#8a8499', '#4b4668', '#d9c27a'], skin: '#cfd6e0', cloth: '#3a3a52', trim: '#d9c27a', gear: ['crown'], glow: '#e4d8ff' },
  'boss-veil-sister': { glass: ['#9a7cf0', '#3b2f8a', '#e4d8ff'], skin: '#d6c8e0', cloth: '#2a1f66', trim: '#e4d8ff', gear: ['veil', 'hood'], glow: '#e4d8ff' },
  'boss-ash-tyrant': { glass: ['#e8943a', '#7a2f28', '#ffd77a'], skin: '#a88469', cloth: '#2b1a18', trim: '#e8943a', gear: ['helm', 'ember'], glow: '#ff9a3a' },
  'boss-hollow-king': { glass: ['#3b2f8a', '#14102b', '#6a4cc0'], skin: '#a9a2b8', cloth: '#14102b', trim: '#9a7cf0', gear: ['horns', 'crown'], glow: '#9a7cf0', eclipse: true },
} as const satisfies Record<string, PortraitSpec>

export type PortraitId = keyof typeof PORTRAITS

/** The ids a window exists for: every named character and every boss. */
export const portraitIds = Object.keys(PORTRAITS) as PortraitId[]

/** A story character's window; they all have one, Ysmere included. */
export const characterPortrait = (id: CharacterId): PortraitId => id

/** A boss's window, or null for a foe without one. */
export const bossPortrait = (id: string): PortraitId | null => (BOSSES.some((b) => b.id === id) && id in PORTRAITS ? (id as PortraitId) : null)

/** An AI persona's window; each has one, named by its id. */
export const personaPortrait = (id: PersonaId): PortraitId => id
