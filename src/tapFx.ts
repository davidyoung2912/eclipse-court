/** Tap ripple and hover sheen on buttons, and the menu's light parallax. They are DOM overlays that never take a click and vanish when done. */
import { parallaxShift, rippleSpot, RIPPLE_MS, SHEEN_MS } from './appMotion'
import { cueDue, uiCueFor } from './audio/cues'
import { sfx } from './audio/synth'
import { getSettings } from './settings'

/** The buttons that get the tap and hover treatment; other controls (sliders, tabs in the board) stay plain. */
const TARGETS = '.buttons button, .menu-buttons button, .mode-card, .today-row button, .utility button, .choice, .spell, .suggested button'

function overlay(button: HTMLElement, kind: 'ripple' | 'sheen', ms: number, x?: number, y?: number) {
  if (getComputedStyle(button).position === 'static') button.style.position = 'relative'
  const el = document.createElement('i')
  el.className = `fx-${kind}`
  el.setAttribute('aria-hidden', 'true')
  if (x !== undefined && y !== undefined) {
    el.style.setProperty('--rx', `${x}%`)
    el.style.setProperty('--ry', `${y}%`)
  }
  button.appendChild(el)
  window.setTimeout(() => el.remove(), ms)
}

/** Starts the effects; returns a function that stops them. */
export function installTapFx(): () => void {
  let lastCue = -Infinity
  const onDown = (e: PointerEvent) => {
    const button = (e.target as Element | null)?.closest<HTMLElement>(TARGETS)
    if (!button) return
    const disabled = (button as HTMLButtonElement).disabled || button.getAttribute('aria-disabled') === 'true'
    if (cueDue(e.timeStamp, lastCue)) {
      lastCue = e.timeStamp
      sfx[uiCueFor({ primary: button.classList.contains('primary'), disabled })]()
    }
    if (getSettings().reduceMotion || disabled) return
    const spot = rippleSpot(button.getBoundingClientRect(), e.clientX, e.clientY)
    overlay(button, 'ripple', RIPPLE_MS, spot.x, spot.y)
  }
  const onOver = (e: PointerEvent) => {
    if (e.pointerType !== 'mouse' || getSettings().reduceMotion || !getSettings().buttonSheen) return
    const button = (e.target as Element | null)?.closest<HTMLElement>(TARGETS)
    if (!button || (button as HTMLButtonElement).disabled) return
    if (e.relatedTarget instanceof Node && button.contains(e.relatedTarget)) return
    overlay(button, 'sheen', SHEEN_MS)
  }
  let frame = 0
  const onMove = (e: PointerEvent) => {
    if (frame || e.pointerType === 'touch' || getSettings().reduceMotion) return
    frame = requestAnimationFrame(() => {
      frame = 0
      const { dx, dy } = parallaxShift(e.clientX, e.clientY, window.innerWidth, window.innerHeight)
      if (!document.querySelector('.main-menu')) return
      const root = document.documentElement.style
      root.setProperty('--px', `${dx.toFixed(1)}px`)
      root.setProperty('--py', `${dy.toFixed(1)}px`)
    })
  }
  document.addEventListener('pointerdown', onDown, true)
  document.addEventListener('pointerover', onOver, true)
  window.addEventListener('pointermove', onMove, { passive: true })
  return () => {
    document.removeEventListener('pointerdown', onDown, true)
    document.removeEventListener('pointerover', onOver, true)
    window.removeEventListener('pointermove', onMove)
    cancelAnimationFrame(frame)
  }
}
