import type { Court, Pos } from '../../engine/rules/types'
import { arcPoint, PICKUP_DOTS, PICKUP_FLIGHT_MS, PICKUP_STEP_MS, toScreen } from '../../spellFx'

const COLOUR: Record<Court, string> = { solari: '#ffd36b', umbral: '#b79bff' }

/** A trail of light that flies from a beacon square to the objective line in the HUD. */
export function flyBeacon(pos: Pos, court: Court, flip: boolean, size: number) {
  const board = document.querySelector('.board')
  const hud = document.querySelector('.objective') ?? board
  if (!board || !hud) return
  const rect = board.getBoundingClientRect()
  const goal = hud.getBoundingClientRect()
  const { cx, cy } = toScreen(pos, flip, size)
  const from = { x: rect.left + (cx / size) * rect.width, y: rect.top + (cy / size) * rect.height }
  const to = { x: goal.left + goal.width / 2, y: goal.top + goal.height / 2 }
  for (let i = 0; i < PICKUP_DOTS; i++) {
    const dot = document.createElement('i')
    const px = 16 - i * 3
    dot.setAttribute('aria-hidden', 'true')
    Object.assign(dot.style, {
      position: 'fixed', left: '0', top: '0', width: `${px}px`, height: `${px}px`, marginLeft: `${-px / 2}px`, marginTop: `${-px / 2}px`,
      borderRadius: '50%', pointerEvents: 'none', zIndex: '60', background: COLOUR[court], boxShadow: `0 0 12px 3px ${COLOUR[court]}`,
    })
    document.body.appendChild(dot)
    const frames = Array.from({ length: 9 }, (_, k) => {
      const p = arcPoint(from, to, k / 8)
      return { transform: `translate(${p.x}px, ${p.y}px) scale(${1 - (k / 8) * 0.6})`, opacity: k === 8 ? 0 : 1 - i * 0.2 }
    })
    const flight = dot.animate?.(frames, { duration: PICKUP_FLIGHT_MS, delay: i * PICKUP_STEP_MS, easing: 'ease-in', fill: 'both' })
    if (flight) flight.onfinish = () => dot.remove()
    else dot.remove()
  }
}
