import { blankDesign, parseDesign, type Design } from './engine/data/editor'

/** The editor's work in progress; kept apart from the campaign's progress. */
const KEY = 'eclipse-court:editor'

function load(): Design {
  try {
    return parseDesign(JSON.parse(localStorage.getItem(KEY) ?? 'null'))
  } catch {
    return blankDesign()
  }
}

let draft = load()

/** The draft being edited; held in memory too, so a device without storage keeps it for the visit. */
export const editorDraft = (): Design => draft

export function saveDraft(next: Design) {
  draft = next
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    // Storage may be full or blocked; the draft still lives in memory.
  }
}
