import type { Court, Role } from '../../rules/types'

export type CharacterId = 'ysmere' | 'aurel' | 'nocte' | 'wren' | 'tam' | 'voss' | 'ilse' | 'sable'

export interface Character {
  id: CharacterId
  name: string
  /** A few words on who they are, shown beside the name. */
  title: string
  /** The portrait is that court's piece of this role; Ysmere belongs to neither court and has none. */
  portrait: { court: Court; role: Role } | null
  /** A small habit or gift, shown on the cast screen. Flavour only: it never changes how a piece plays. */
  trait: string
}

/** Where a named character stands: ready for anything, hurt and starting the next fight weaker, or gone for good. */
export type CharacterState = 'ready' | 'wounded' | 'fallen'

/** A line is shown only when this holds, so later chapters can answer what happened earlier. */
export type Condition =
  | { character: CharacterId; state: CharacterState }
  /** The player lost this chapter's battle at least once before winning it. */
  | { lostBefore: string }

/** One step of a chapter, shown on its own and advanced by the player. */
export type Beat = { when?: Condition } & (
  | { kind: 'narrate'; text: string }
  | { kind: 'say'; who: CharacterId; text: string }
)

/** A fight that closes a chapter: a scenario with named characters standing in for some of Solari's or Umbral's pieces. */
export interface StoryBattle {
  /** The id of a scenario in `scenarios.ts`; the player is Solari, as there. */
  scenario: string
  /** Which piece (by its id in the scenario) each character is. */
  bind: Partial<Record<CharacterId, string>>
  /** Characters who die for good if their piece is taken in a win; anyone else is only wounded. */
  mortal?: readonly CharacterId[]
  won: readonly Beat[]
  lost: readonly Beat[]
}

export type Act = 'prologue' | 1 | 2 | 3

export interface Chapter {
  /** Stable key under which reading is remembered; never reuse one for a different chapter. */
  id: string
  act: Act
  title: string
  blurb: string
  beats: readonly Beat[]
  battle?: StoryBattle
}
