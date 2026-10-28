import { useEffect, useState } from 'react'
import { sizeOf } from '../../engine/rules/board'
import { KILL_HOLD_MS, KILL_PLAY_MS, KILL_PUSH_MS, KILL_ZOOM, killCamMs, killOrigin, type KillShot } from '../../killCam'
import { Board } from './Board'

const NO_MOVES: never[] = []
const noop = () => {}

/**
 * After a win, the final capture again in slow motion: the camera pushes in on the square, the capture plays, and a vignette
 * closes in. A tap, Escape or the Skip button ends it early.
 */
export function KillCam({ shot, flip, onDone }: { shot: KillShot; flip: boolean; onDone: () => void }) {
  const [played, setPlayed] = useState(false)
  useEffect(() => {
    const play = setTimeout(() => setPlayed(true), KILL_PUSH_MS)
    const done = setTimeout(onDone, killCamMs(false))
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') onDone() }
    window.addEventListener('keydown', key)
    return () => { clearTimeout(play); clearTimeout(done); window.removeEventListener('keydown', key) }
  }, [onDone])
  const origin = killOrigin(shot.at, sizeOf(shot.after.config), flip)
  return (
    <div className="kill-cam" role="dialog" aria-label="Final capture replay" onClick={onDone}
      style={{ ['--kill-zoom' as string]: KILL_ZOOM, ['--kill-push' as string]: `${KILL_PUSH_MS}ms`, ['--kill-play' as string]: `${KILL_PLAY_MS}ms`, ['--kill-hold' as string]: `${KILL_HOLD_MS}ms` }}>
      <div className="kill-stage" style={{ transformOrigin: `${origin.x}% ${origin.y}%` }}>
        <Board state={played ? shot.after : shot.before} selected={null} moves={NO_MOVES} onSquare={noop} flip={flip} />
      </div>
      <div className="kill-vignette" />
      <button className="kill-skip" onClick={onDone}>Skip</button>
    </div>
  )
}
