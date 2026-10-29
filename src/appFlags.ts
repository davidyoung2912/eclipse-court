// Two small device flags the app keeps in localStorage: the lesson done, and Skirmish opening on Classic once.

const TUTORIAL_KEY = 'eclipse-court:tutorial'

export function tutorialSeen(): boolean {
  try {
    return localStorage.getItem(TUTORIAL_KEY) === '1'
  } catch {
    return true
  }
}

/** Forgets that the lesson was done, so the menu offers it again and the checklist's first step is open. */
export function clearTutorialSeen() {
  try {
    localStorage.removeItem(TUTORIAL_KEY)
  } catch {
    // Nothing was stored.
  }
}

export function markTutorialSeen() {
  try {
    localStorage.setItem(TUTORIAL_KEY, '1')
  } catch {
    // Without storage the tutorial is simply offered again next time.
  }
}

/** Set when the tutorial is left; the next Skirmish setup then opens on Classic rules and clears it. */
const CLASSIC_NEXT_KEY = 'eclipse-court:classic-next'

export function classicNext(): boolean {
  try {
    return localStorage.getItem(CLASSIC_NEXT_KEY) === '1'
  } catch {
    return false
  }
}

export function setClassicNext(on: boolean) {
  try {
    if (on) localStorage.setItem(CLASSIC_NEXT_KEY, '1')
    else localStorage.removeItem(CLASSIC_NEXT_KEY)
  } catch {
    // Without storage Skirmish simply opens on Standard.
  }
}
