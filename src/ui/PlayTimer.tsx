import { useEffect, useRef, useState } from 'react'
import { Icon } from './menus/icons'

/** Minutes and seconds, with hours once there are any. */
export function formatTime(total: number): string {
  const s = Math.floor(total) % 60
  const m = Math.floor(total / 60) % 60
  const h = Math.floor(total / 3600)
  const two = (n: number) => String(n).padStart(2, '0')
  return h > 0 ? `${h}:${two(m)}:${two(s)}` : `${m}:${two(s)}`
}

interface Props {
  /** Receives whole seconds played since the last call: every half minute and when the screen closes. */
  onFlush: (seconds: number) => void
}

/** Shows the time spent on this play screen and reports it for the lifetime total; time with the page hidden is not counted. */
export function PlayTimer({ onFlush }: Props) {
  const [shown, setShown] = useState(0)
  const flush = useRef(onFlush)
  flush.current = onFlush

  useEffect(() => {
    let last = Date.now()
    /** Visible milliseconds not yet reported, and all visible milliseconds on this screen. */
    let owed = 0
    let elapsed = 0
    const sync = () => {
      const now = Date.now()
      // A long gap means the device slept, which is not play.
      if (!document.hidden) {
        const gap = Math.min(now - last, 5000)
        owed += gap
        elapsed += gap
      }
      last = now
    }
    const send = (all: boolean) => {
      const seconds = all ? Math.round(owed / 1000) : Math.floor(owed / 1000)
      if (seconds > 0) flush.current(seconds)
      owed -= seconds * 1000
    }
    const tick = setInterval(() => {
      sync()
      setShown(Math.floor(elapsed / 1000))
    }, 1000)
    const save = setInterval(() => { sync(); send(false) }, 30000)
    return () => {
      clearInterval(tick)
      clearInterval(save)
      sync()
      send(true)
    }
  }, [])

  return <div className="play-timer" role="timer" aria-label="Play time"><Icon name="clock" />{formatTime(shown)}</div>
}
