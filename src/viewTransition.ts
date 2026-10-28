import { flushSync } from 'react-dom'
import { getSettings } from './settings'

type Doc = Document & { startViewTransition?: (update: () => void) => unknown }

/** Whether the browser can cross-fade between screens (View Transitions); screens fall back to their own entrance animation when not. */
export const canTransition = (): boolean => typeof document !== 'undefined' && typeof (document as Doc).startViewTransition === 'function'

/** Marks the page so the CSS hands the screen entrance over to the browser's transition. */
export function markTransitions() {
  if (canTransition()) document.documentElement.dataset.vt = 'on'
}

/** Runs a screen change inside a view transition when one is available and motion is allowed; `update` must commit its state synchronously. */
export function withTransition(update: () => void) {
  if (!canTransition() || getSettings().reduceMotion) return update()
  ;(document as Doc).startViewTransition!(() => flushSync(update))
}
