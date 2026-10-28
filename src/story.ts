import { BONDS, CHAPTERS, CHARACTERS, type Beat, type Bond, type CharacterId, type CharacterState, type EndingId } from './engine/data/story'

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
  /** Every ending the player has chosen, so choosing another later does not take an earlier one away. */
  endings: ReadonlySet<EndingId>
}

const EMPTY: StoryState = { read: new Set(), characters: {}, losses: {}, ending: null, endings: new Set() }

const ENDINGS: readonly string[] = ['solarch', 'duskmother', 'shared', 'free']

const STATES: readonly string[] = ['ready', 'wounded', 'fallen']

function parse(raw: unknown): StoryState {
  // The first version stored just the list of read chapters.
  if (Array.isArray(raw)) return { ...EMPTY, read: new Set(raw.filter((x): x is string => typeof x === 'string')) }
  const o = (raw ?? {}) as Partial<Record<'read' | 'characters' | 'losses' | 'ending' | 'endings', unknown>>
  const characters: CharacterStates = {}
  if (o.characters && typeof o.characters === 'object')
    for (const [id, state] of Object.entries(o.characters))
      if (id in CHARACTERS && typeof state === 'string' && STATES.includes(state)) characters[id as CharacterId] = state as CharacterState
  const losses: Record<string, number> = {}
  if (o.losses && typeof o.losses === 'object')
    for (const [id, n] of Object.entries(o.losses)) if (typeof n === 'number' && Number.isInteger(n) && n > 0) losses[id] = n
  const read = Array.isArray(o.read) ? o.read.filter((x): x is string => typeof x === 'string') : []
  const ending = typeof o.ending === 'string' && ENDINGS.includes(o.ending) ? (o.ending as EndingId) : null
  // Stories saved before endings were collected only know the latest one.
  const seen = Array.isArray(o.endings) ? o.endings.filter((x): x is EndingId => typeof x === 'string' && ENDINGS.includes(x)) : []
  return { read: new Set(read), characters, losses, ending, endings: new Set(ending ? [...seen, ending] : seen) }
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
    localStorage.setItem(KEY, JSON.stringify({ read: [...next.read], characters: next.characters, losses: next.losses, ending: next.ending, endings: [...next.endings] }))
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
  commit({ ...state, ending, endings: new Set(state.endings).add(ending) })
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

/** Bonds are remembered in the read set under their own prefix, so they never collide with a chapter id. */
const bondKey = (id: string) => `bond:${id}`

export const bondRead = (s: Pick<StoryState, 'read'>, id: string) => s.read.has(bondKey(id))

export function markBondRead(id: string) {
  if (state.read.has(bondKey(id))) return
  commit({ ...state, read: new Set(state.read).add(bondKey(id)) })
}

/** Bonds whose chapter has been read, in the order they were written. */
export const availableBonds = (s: Pick<StoryState, 'read'>): Bond[] => BONDS.filter((b) => s.read.has(b.after))

/** The groups the Story page folds its achievements into. */
export const ACHIEVEMENT_GROUPS = ['The Tale', 'Trials', 'Company', 'Bonds', 'Endings'] as const
export type AchievementGroup = (typeof ACHIEVEMENT_GROUPS)[number]

export interface Achievement {
  id: string
  group: AchievementGroup
  title: string
  text: string
  earned: boolean
}

/** Worked out from the saved story each time, so nothing extra is stored. */
export function achievements(s: StoryState): Achievement[] {
  const final = endingChapter()
  const done = (id: string) => s.read.has(id)
  const battles = CHAPTERS.filter((c) => c.battle)
  const lost = (id: string) => s.losses[id] ?? 0
  const flawless = (list: readonly (typeof CHAPTERS)[number][]) => list.length > 0 && list.every((c) => done(c.id) && lost(c.id) === 0)
  const actBattles = (act: number) => battles.filter((c) => c.act === act)
  const met = metCharacters(s)
  const metSide = (court: 'solari' | 'umbral') => {
    const side = (Object.keys(CHARACTERS) as CharacterId[]).filter((id) => CHARACTERS[id].portrait?.court === court)
    return side.length > 0 && side.every((id) => met.includes(id))
  }
  const bondsRead = BONDS.filter((b) => bondRead(s, b.id)).length
  const ended = (id: EndingId) => s.endings.has(id)
  const G = ACHIEVEMENT_GROUPS
  const defs: [AchievementGroup, string, string, string, boolean][] = [
    [G[0], 'stilling', 'The Stilling', 'Read the Prologue.', done('prologue')],
    [G[0], 'first-road', 'The Road Begins', 'Finish the first chapter of Act I.', done(CHAPTERS.find((c) => c.act === 1)?.id ?? '')],
    [G[0], 'sky', 'The Sky Darkens', 'Finish Act I.', done('darkening-sky')],
    [G[0], 'raised', 'Called Back', 'Finish Act II.', done('long-dusk')],
    [G[0], 'halfway', 'Halfway Home', 'Read half of the chapters.', CHAPTERS.filter((c) => done(c.id)).length * 2 >= CHAPTERS.length],
    [G[0], 'sanctum', 'The Sanctum', 'Finish the last chapter.', !!final && done(final.id)],
    [G[0], 'whole-tale', 'The Whole Tale', 'Read every chapter.', CHAPTERS.every((c) => done(c.id))],
    [G[1], 'clean', 'Clean Hands', 'Win the final battle without losing it first.', !!final && done(final.id) && cleanVictory(s, final.id)],
    [G[1], 'flawless-1', 'Sure Footing', 'Win every Act I battle without a loss.', flawless(actBattles(1))],
    [G[1], 'flawless-2', 'Steady Hands', 'Win every Act II battle without a loss.', flawless(actBattles(2))],
    [G[1], 'flawless-3', 'Unbowed', 'Win every Act III battle without a loss.', flawless(actBattles(3))],
    [G[1], 'untouched', 'Untouched', 'Win every battle of the tale without a single loss.', flawless(battles)],
    [G[1], 'second-wind', 'Second Wind', 'Win a battle you have lost before.', battles.some((c) => done(c.id) && lost(c.id) > 0)],
    [G[1], 'hard-lessons', 'Hard Lessons', 'Lose ten battles in total.', Object.values(s.losses).reduce((a, n) => a + n, 0) >= 10],
    [G[1], 'stubborn', 'Stubborn', 'Lose a chapter\'s battle three times, and still return.', CHAPTERS.some((c) => lost(c.id) >= 3 && done(c.id))],
    [G[2], 'full-roster', 'Full Roster', 'Meet every character.', met.length >= (Object.keys(CHARACTERS) as CharacterId[]).filter((id) => CHARACTERS[id].portrait).length],
    [G[2], 'sunward', 'Sunward', 'Meet every character of the Solari court.', metSide('solari')],
    [G[2], 'duskward', 'Duskward', 'Meet every character of the Umbral court.', metSide('umbral')],
    [G[2], 'standing-tall', 'Standing Tall', 'Finish the last battle with no one fallen.', !!final && done(final.id) && Object.values(s.characters).every((c) => c !== 'fallen')],
    [G[3], 'first-bond', 'First Confidence', 'Read a bond scene.', bondsRead >= 1],
    [G[3], 'trusted', 'Trusted Circle', 'Read three bond scenes.', bondsRead >= 3],
    [G[3], 'close-company', 'Close Company', 'Read every bond scene.', BONDS.every((b) => bondRead(s, b.id))],
    [G[4], 'resolved', 'Who Keeps the Hour', 'Choose an ending.', s.ending !== null],
    [G[4], 'end-solarch', 'The Sun Holds', 'Let the Solarch keep the Hour.', ended('solarch')],
    [G[4], 'end-duskmother', 'The Dusk Holds', 'Let the Duskmother keep the Hour.', ended('duskmother')],
    [G[4], 'end-shared', 'Two Courts, One Hour', 'Share the Hour.', ended('shared')],
    [G[4], 'end-free', 'The Queen Freed', 'Free the Queen.', ended('free')],
    [G[4], 'every-ending', 'Every Hour', 'Choose all four endings.', ended('solarch') && ended('duskmother') && ended('shared') && ended('free')],
  ]
  return defs.map(([group, id, title, text, earned]) => ({ id, group, title, text, earned }))
}
