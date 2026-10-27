import { CHAPTERS, CHARACTERS, type Beat, type CharacterId, type CharacterState, type EndingId } from './engine/data/story'

/** Which story chapters have been read and what became of the named characters; kept apart from the campaign's progress. */
const KEY = 'eclipse-court:story'

type Listener = () => void
const listeners = new Set<Listener>()

export type CharacterStates = Partial<Record<CharacterId, CharacterState>>

export interface StoryState {
  read: ReadonlySet<string>
  /** A character not listed is ready. */
  characters: CharacterStates
  /** How many times each chapter's battle has been lost. */
  losses: Readonly<Record<string, number>>
  /** Who keeps the Hour, once the player has chosen. */
  ending: EndingId | null
}

const EMPTY: StoryState = { read: new Set(), characters: {}, losses: {}, ending: null }

const ENDINGS: readonly string[] = ['solarch', 'duskmother', 'shared', 'free']

const STATES: readonly string[] = ['ready', 'wounded', 'fallen']

function parse(raw: unknown): StoryState {
  // The first version stored just the list of read chapters.
  if (Array.isArray(raw)) return { ...EMPTY, read: new Set(raw.filter((x): x is string => typeof x === 'string')) }
  const o = (raw ?? {}) as Partial<Record<'read' | 'characters' | 'losses' | 'ending', unknown>>
  const characters: CharacterStates = {}
  if (o.characters && typeof o.characters === 'object')
    for (const [id, state] of Object.entries(o.characters))
      if (id in CHARACTERS && typeof state === 'string' && STATES.includes(state)) characters[id as CharacterId] = state as CharacterState
  const losses: Record<string, number> = {}
  if (o.losses && typeof o.losses === 'object')
    for (const [id, n] of Object.entries(o.losses)) if (typeof n === 'number' && Number.isInteger(n) && n > 0) losses[id] = n
  const read = Array.isArray(o.read) ? o.read.filter((x): x is string => typeof x === 'string') : []
  const ending = typeof o.ending === 'string' && ENDINGS.includes(o.ending) ? (o.ending as EndingId) : null
  return { read: new Set(read), characters, losses, ending }
}

function load(): StoryState {
  try {
    return parse(JSON.parse(localStorage.getItem(KEY) ?? 'null'))
  } catch {
    return EMPTY
  }
}

/** Held in memory too, so a device without storage still remembers for the visit. */
let state = load()

function commit(next: StoryState) {
  state = next
  try {
    localStorage.setItem(KEY, JSON.stringify({ read: [...next.read], characters: next.characters, losses: next.losses, ending: next.ending }))
  } catch {
    // Without storage the story simply starts over next visit.
  }
  listeners.forEach((l) => l())
}

export const chapterRead = (id: string) => state.read.has(id)

export function markChapterRead(id: string) {
  if (state.read.has(id)) return
  commit({ ...state, read: new Set(state.read).add(id) })
}

/** A won battle: the chapter is done and the characters' states are replaced by the ones it left them in. */
export function recordStoryWin(id: string, characters: CharacterStates) {
  commit({ ...state, read: new Set(state.read).add(id), characters })
}

/** A lost battle changes no one's state, so losing and retrying can never leave the story stuck. */
export function recordStoryLoss(id: string) {
  commit({ ...state, losses: { ...state.losses, [id]: (state.losses[id] ?? 0) + 1 } })
}

/** The player's choice at the end of the story; choosing again replaces it. */
export function recordEnding(ending: EndingId) {
  commit({ ...state, ending })
}

export function resetStory() {
  state = EMPTY
  try {
    localStorage.removeItem(KEY)
  } catch {
    // Nothing was stored.
  }
  listeners.forEach((l) => l())
}

export const subscribeStory = (l: Listener) => {
  listeners.add(l)
  return () => { listeners.delete(l) }
}

/** Identity changes whenever the story does, for `useSyncExternalStore`. */
export const storySnapshot = () => state

export const characterState = (s: Pick<StoryState, 'characters'>, id: CharacterId): CharacterState => s.characters[id] ?? 'ready'

/** The beats that apply to the story so far, those with a condition kept only when it holds. */
export const visibleBeats = (beats: readonly Beat[], s: StoryState) =>
  beats.filter((b) => {
    if (!b.when) return true
    return 'character' in b.when ? characterState(s, b.when.character) === b.when.state : (s.losses[b.when.lostBefore] ?? 0) > 0
  })

/** Everyone the player has met: a speaker or a bound piece in a chapter already read. */
export function metCharacters(s: StoryState): CharacterId[] {
  const met = new Set<CharacterId>()
  const take = (beats: readonly Beat[]) => beats.forEach((b) => { if (b.kind === 'say') met.add(b.who) })
  for (const c of CHAPTERS) {
    if (!s.read.has(c.id)) continue
    take(c.beats)
    if (c.battle) {
      take(c.battle.won)
      Object.keys(c.battle.bind).forEach((id) => met.add(id as CharacterId))
    }
  }
  return (Object.keys(CHARACTERS) as CharacterId[]).filter((id) => met.has(id))
}



/** Chapters open in order: the first from the start, each other once the one before it has been read. */
export const chapterUnlocked = (index: number, readIds: ReadonlySet<string>) =>
  index === 0 || readIds.has(CHAPTERS[index - 1].id)

/** The chapter whose battle ends the story, with the choice that follows it. */
export const endingChapter = () => CHAPTERS.find((c) => c.ending)

/** Whether an ending that needs a clean victory is open: its chapter's battle was never lost. */
export const cleanVictory = (s: Pick<StoryState, 'losses'>, chapterId: string) => (s.losses[chapterId] ?? 0) === 0

/** The one line the main menu's Story card shows. */
export const storySummary = (readIds: ReadonlySet<string>) => {
  const count = CHAPTERS.filter((c) => readIds.has(c.id)).length
  return count === 0 ? 'The tale of the two courts' : `${count} of ${CHAPTERS.length} chapters read`
}
