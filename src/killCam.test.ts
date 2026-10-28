import { describe, expect, it } from 'vitest'
import { newGame } from './engine/reducer'
import type { Step } from './engine/log'
import { KILL_HOLD_MS, KILL_PLAY_MS, KILL_PUSH_MS, killCamMs, killOrigin, killShotOf } from './killCam'

const base = newGame(1)
const won = (winner: 'solari' | 'draw' | null, drop: boolean): Step[] => {
  const after = { ...base, winner, pieces: drop ? base.pieces.slice(1) : base.pieces }
  return [{ state: base, action: null }, { state: after, action: { type: 'pass' } as never }]
}

describe('kill-cam', () => {
  it('replays the final capture of a won game', () => {
    const shot = killShotOf(won('solari', true))!
    expect(shot.before).toBe(base)
    expect(shot.at).toEqual(base.pieces[0].pos)
  })

  it('has nothing to replay without a decisive capture', () => {
    expect(killShotOf(won('solari', false))).toBeNull()
    expect(killShotOf(won('draw', true))).toBeNull()
    expect(killShotOf(won(null, true))).toBeNull()
    expect(killShotOf([{ state: base, action: null }])).toBeNull()
  })

  it('holds the screen for the push, the capture and the hold, but not under reduced motion', () => {
    expect(killCamMs(false)).toBe(KILL_PUSH_MS + KILL_PLAY_MS + KILL_HOLD_MS)
    expect(killCamMs(true)).toBe(0)
  })

  it('aims the zoom at the square, turned with the board', () => {
    expect(killOrigin({ x: 0, y: 0 }, 4, false)).toEqual({ x: 12.5, y: 87.5 })
    expect(killOrigin({ x: 0, y: 0 }, 4, true)).toEqual({ x: 87.5, y: 12.5 })
  })
})
