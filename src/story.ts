import { CHAPTERS } from './engine/data/story'

/** Which story chapters have been read; kept apart from the campaign's progress. */
const KEY = 'eclipse-court:story'

type Listener = () => void
const listeners = new Set<Listener>()

function read(): string[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(KEY) ?? '[]')
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : []
  } catch {
    return []
  }
}

/** Held in memory too, so a device without storage still remembers for the visit. */
let done = new Set(read())

export const chapterRead = (id: string) => done.has(id)

export function markChapterRead(id: string) {
  if (done.has(id)) return
  done = new Set(done).add(id)
  try {
    localStorage.setItem(KEY, JSON.stringify([...done]))
  } catch {
    // Without storage the chapter simply reads as new next visit.
  }
  listeners.forEach((l) => l())
}

export function resetStory() {
  done = new Set()
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

/** Identity changes whenever the set does, for `useSyncExternalStore`. */
export const storySnapshot = () => done

/** Chapters open in order: the first from the start, each other once the one before it has been read. */
export const chapterUnlocked = (index: number, readIds: ReadonlySet<string>) =>
  index === 0 || readIds.has(CHAPTERS[index - 1].id)

/** The one line the main menu's Story card shows. */
export const storySummary = (readIds: ReadonlySet<string>) => {
  const count = CHAPTERS.filter((c) => readIds.has(c.id)).length
  return count === 0 ? 'The tale of the two courts' : `${count} of ${CHAPTERS.length} chapters read`
}
