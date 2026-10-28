import { useEffect, useRef, useState } from 'react'
import { countUpMs, countUpValue } from '../appMotion'
import { getSettings } from '../settings'

/** A figure that counts from its previous value to `value` whenever it changes; it shows `value` at once under reduced motion and on first render. */
export function useCountUp(value: number): number {
  const [shown, setShown] = useState(value)
  const shownRef = useRef(value)
  useEffect(() => {
    const from = shownRef.current
    if (from === value) return
    if (getSettings().reduceMotion) {
      shownRef.current = value
      const sync = requestAnimationFrame(() => setShown(value))
      return () => cancelAnimationFrame(sync)
    }
    const start = performance.now()
    let frame = 0
    const tick = (now: number) => {
      shownRef.current = countUpValue(from, value, now - start)
      setShown(shownRef.current)
      if (now - start < countUpMs(from, value)) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [value])
  return getSettings().reduceMotion ? value : shown
}
