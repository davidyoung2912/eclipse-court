import type { Court, Role } from '../../rules/types'

export type CharacterId = 'ysmere' | 'aurel' | 'nocte' | 'wren' | 'tam' | 'voss' | 'ilse' | 'sable'

export interface Character {
  id: CharacterId
  name: string
  /** A few words on who they are, shown beside the name. */
  title: string
  /** The portrait is that court's piece of this role; Ysmere belongs to neither court and has none. */
  portrait: { court: Court; role: Role } | null
}

/** One step of a chapter, shown on its own and advanced by the player. */
export type Beat =
  | { kind: 'narrate'; text: string }
  | { kind: 'say'; who: CharacterId; text: string }

export type Act = 'prologue' | 1 | 2 | 3

export interface Chapter {
  /** Stable key under which reading is remembered; never reuse one for a different chapter. */
  id: string
  act: Act
  title: string
  blurb: string
  beats: readonly Beat[]
}
