import { useEffect, useRef, useState } from 'react'
import { createDuelAi } from '../../ai/duelAi'
import { sfx, startDuelDrums } from '../../audio/synth'
import { ROLE_NAMES } from '../../engine/data/roster'
import { ROLE_INFO } from '../../engine/data/pieceInfo'
import { getSettings } from '../../settings'
import { Icon } from '../menus/icons'
import { profileForSkill } from '../../ai/profile'
import { createDuel, DEFAULT_CONFIG, duelOutcome, stepDuel } from '../../engine/duel/duel'
import { DT, DUEL_SECONDS, NO_INPUT, type DuelEvent, type DuelInput } from '../../engine/duel/types'
import type { DuelCells } from '../../engine/rules/cells'
import type { CellEffect, DuelOutcome, Piece } from '../../engine/rules/types'
import { createFx, drawDuel, updateFx } from './duelFx'

export interface DuelOptions {
  /** Swap the attack button to the left side of the screen. */
  mirror: boolean
  aimAssist: boolean
  haptics: boolean
}

interface Props {
  attacker: Piece
  defender: Piece
  luminance: number
  /** Special cells under the two fighters, if any. */
  cells?: DuelCells
  /** The board the fight is on, and the cell effects under the attacker and defender, for the arena's look. */
  boardId?: string
  cellEffects?: [CellEffect | null, CellEffect | null]
  options: DuelOptions
  /** Which fighter the player steers: 0 attacks from the bottom, 1 defends and is shown at the bottom too. */
  playerSide?: 0 | 1
  /** Duel skill (0..1) of the AI fighter. */
  opponentSkill: number
  /** How readily (0..1) the AI fighter presses its attack. */
  opponentAggression?: number
  seed: number
  onDone: (outcome: DuelOutcome) => void
}

const STICK_RADIUS = 56
/** The AI's walking speed grows by this share of its base per second, so stalling gets harder (about +36% by the time limit). */
const FOE_SPEED_RAMP = 0.018
/** How quickly the mouse's virtual stick drifts back to centre, per second. */
const MOUSE_RETURN = 5
const HIT_STOP = 0.07
const END_DELAY = 1.1
/** Fraction of normal speed the live duel plays at; the simulation itself (and so the odds) is unchanged. */
const SLOWDOWN = 0.55

export function DuelView({ attacker, defender, luminance, cells, boardId, cellEffects, options, playerSide = 0, opponentSkill, opponentAggression = 1, seed, onDone }: Props) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const input = useRef<DuelInput>({ ...NO_INPUT })
  const optionsRef = useRef(options)
  const lookRef = useRef({ boardId, cellEffects })
  const [stick, setStick] = useState<{ ox: number; oy: number; x: number; y: number } | null>(null)
  const [held, setHeld] = useState(false)
  const [time, setTime] = useState(DUEL_SECONDS)
  const [banner, setBanner] = useState('')
  const stickPointer = useRef<number | null>(null)
  const stickOrigin = useRef({ ox: 0, oy: 0 })
  const doneRef = useRef(onDone)
  const stage = useRef<HTMLDivElement>(null)
  /** Mouse steering: the virtual stick offset in pixels, active while the pointer is locked to the stage. */
  const mouse = useRef({ x: 0, y: 0, locked: false })
  const [desktop] = useState(() => typeof matchMedia === 'function' && matchMedia('(pointer: fine)').matches)
  const [locked, setLocked] = useState(false)

  useEffect(() => {
    optionsRef.current = options
    lookRef.current = { boardId, cellEffects }
    doneRef.current = onDone
  })

  useEffect(() => {
    const el = stage.current
    if (!desktop || !el) return
    const lockChange = () => {
      const on = document.pointerLockElement === el
      mouse.current = { x: 0, y: 0, locked: on }
      if (!on) input.current = { ...NO_INPUT }
      setLocked(on)
      setHeld(false)
    }
    const move = (e: MouseEvent) => {
      if (!mouse.current.locked) return
      let x = mouse.current.x + e.movementX
      let y = mouse.current.y + e.movementY
      const len = Math.hypot(x, y)
      if (len > STICK_RADIUS) { x = (x * STICK_RADIUS) / len; y = (y * STICK_RADIUS) / len }
      mouse.current.x = x
      mouse.current.y = y
    }
    const up = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse' || e.button !== 0 || !mouse.current.locked) return
      input.current = { ...input.current, attack: false }
      setHeld(false)
    }
    document.addEventListener('pointerlockchange', lockChange)
    document.addEventListener('mousemove', move)
    window.addEventListener('pointerup', up)
    // The click that started the fight may still count as a user gesture; if not, the player clicks the arena.
    try { void Promise.resolve(el.requestPointerLock()).catch(() => {}) } catch { /* needs a click */ }
    return () => {
      document.removeEventListener('pointerlockchange', lockChange)
      document.removeEventListener('mousemove', move)
      window.removeEventListener('pointerup', up)
      if (document.pointerLockElement === el) document.exitPointerLock()
      input.current = { ...NO_INPUT }
    }
  }, [desktop])

  useEffect(() => {
    const foeSide = (1 - playerSide) as 0 | 1
    const cfg = { aimCone: optionsRef.current.aimAssist ? DEFAULT_CONFIG.aimCone : 0, foeSpeedRamp: { side: foeSide, perSecond: FOE_SPEED_RAMP } }
    const state = createDuel(attacker, defender, luminance, cfg, cells)
    const ai = createDuelAi(profileForSkill(opponentSkill, opponentAggression), seed)
    // The defender is drawn upside down so the player's fighter is always at the bottom of the screen.
    const flip = playerSide === 1
    let raf = 0
    let last = performance.now()
    let acc = 0
    let freeze = 0
    let shake = 0
    let endTimer = -1
    let hudTick = 0
    const fx = createFx({
      luminance, boardId: lookRef.current.boardId, cells: lookRef.current.cellEffects ?? [null, null], reduceMotion: getSettings().reduceMotion,
      courts: [attacker.court, defender.court],
    })
    const drums = startDuelDrums()
    sfx.duelStart()
    const el = canvas.current!
    const ctx = el.getContext('2d')!

    const frame = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000)
      last = now
      const dpr = window.devicePixelRatio || 1
      const w = el.clientWidth
      const h = el.clientHeight
      if (el.width !== Math.round(w * dpr) || el.height !== Math.round(h * dpr)) {
        el.width = Math.round(w * dpr)
        el.height = Math.round(h * dpr)
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      if (flip) ctx.transform(-1, 0, 0, -1, w, h)

      if (mouse.current.locked) {
        // The mouse drives a virtual stick that drifts back to centre, so moving it steers and stopping it stops you.
        const k = Math.exp(-dt * MOUSE_RETURN)
        mouse.current.x *= k
        mouse.current.y *= k
        input.current = { ...input.current, mx: mouse.current.x / STICK_RADIUS, my: mouse.current.y / STICK_RADIUS }
      }
      if (freeze > 0) freeze -= dt
      else acc += dt * SLOWDOWN
      const events: DuelEvent[] = []
      while (acc >= DT && !state.done && freeze <= 0) {
        acc -= DT
        const mine = flip ? { ...input.current, mx: -input.current.mx, my: -input.current.my } : input.current
        const inputs: [DuelInput, DuelInput] = [NO_INPUT, NO_INPUT]
        inputs[playerSide] = mine
        inputs[foeSide] = ai(state, foeSide)
        const stepped = stepDuel(state, inputs)
        events.push(...stepped)
        for (const e of stepped) {
          if (e.type === 'swing') sfx.swing()
          else if (e.type === 'shoot') sfx.shoot()
          else if (e.type === 'slam') sfx.slam()
          else if (e.type === 'hit') {
            sfx.hit(e.damage)
            freeze = HIT_STOP
            shake = getSettings().reduceMotion ? 0 : Math.min(14, 4 + e.damage * 3)
            if (optionsRef.current.haptics) navigator.vibrate?.(e.damage >= 2 ? 40 : 18)
          } else if (e.type === 'suddenDeath') setBanner('Sudden death!')
        }
      }
      if (state.done && endTimer < 0) {
        const out = duelOutcome(state)
        const [mineHp, foeHp] = playerSide === 0 ? [out.attackerHp, out.defenderHp] : [out.defenderHp, out.attackerHp]
        setBanner(mineHp > 0 && foeHp <= 0 ? 'Victory' : mineHp <= 0 && foeHp > 0 ? 'Defeat' : mineHp <= 0 ? 'Both fall' : 'Draw')
        if (mineHp > 0 && foeHp <= 0) sfx.win()
        else if (mineHp <= 0) sfx.lose()
        drums.stop()
        endTimer = END_DELAY
      }
      if (endTimer >= 0) {
        endTimer -= dt
        if (endTimer < 0) {
          doneRef.current(duelOutcome(state))
          return
        }
      }
      drums.setIntensity(state.t / DUEL_SECONDS)
      shake = Math.max(0, shake - dt * 40)
      updateFx(fx, state, dt, events)
      drawDuel(ctx, fx, state, w, h, dpr, shake, flip)
      hudTick += dt
      if (hudTick > 0.1) {
        hudTick = 0
        setTime(Math.max(0, DUEL_SECONDS - state.t) / SLOWDOWN)
      }
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => {
      cancelAnimationFrame(raf)
      drums.stop()
    }
  }, [attacker, defender, luminance, cells, playerSide, opponentSkill, opponentAggression, seed])

  const onStickDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (stickPointer.current !== null) return
    stickPointer.current = e.pointerId
    e.currentTarget.setPointerCapture(e.pointerId)
    const box = e.currentTarget.getBoundingClientRect()
    const ox = e.clientX - box.left
    const oy = e.clientY - box.top
    stickOrigin.current = { ox, oy }
    setStick({ ox, oy, x: ox, y: oy })
  }
  // Everything is read from the event here, not inside a state updater: React may run an updater after the
  // event is over, when `currentTarget` is already null (which crashed touch screens).
  const onStickMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerId !== stickPointer.current) return
    const { ox, oy } = stickOrigin.current
    const box = e.currentTarget.getBoundingClientRect()
    const dx = e.clientX - box.left - ox
    const dy = e.clientY - box.top - oy
    const len = Math.hypot(dx, dy)
    const k = len > STICK_RADIUS ? STICK_RADIUS / len : 1
    input.current = { ...input.current, mx: (dx * k) / STICK_RADIUS, my: (dy * k) / STICK_RADIUS }
    setStick({ ox, oy, x: ox + dx * k, y: oy + dy * k })
  }
  const onStickUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerId !== stickPointer.current) return
    stickPointer.current = null
    input.current = { ...input.current, mx: 0, my: 0 }
    setStick(null)
  }
  const setAttack = (on: boolean) => {
    input.current = { ...input.current, attack: on }
    setHeld(on)
  }

  const onStagePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!desktop || e.pointerType !== 'mouse' || e.button !== 0) return
    if (!mouse.current.locked) {
      try { void Promise.resolve(e.currentTarget.requestPointerLock()).catch(() => {}) } catch { /* ignored */ }
      return
    }
    setAttack(true)
  }

  const named = (p: Piece) => `${ROLE_NAMES[p.court][p.role]}`
  const court = (p: Piece) => (p.court === 'solari' ? 'Solari' : 'Umbral')
  const mine = playerSide === 0 ? attacker : defender
  const foe = playerSide === 0 ? defender : attacker
  const light = luminance > 0 ? `Light +${luminance}` : luminance < 0 ? `Light ${luminance}` : 'Neutral light'

  return (
    <div className="duel">
      <div className="duel-frame">
        <header className="duel-head">
          <h2>{named(mine)} <span>vs</span> {named(foe)}</h2>
          <p>
            {court(mine)} {ROLE_INFO[mine.role].label} {playerSide === 0 ? 'attacks' : 'defends against'} {court(foe)} {ROLE_INFO[foe.role].label}
            {' · '}{light}{playerSide === 1 ? ' · hold your ground!' : ''}
          </p>
          <div className="duel-timer" aria-label="Time left">{Math.ceil(time)}s</div>
        </header>
        <div className="duel-stage" ref={stage} onPointerDown={onStagePointerDown}>
          <canvas ref={canvas} className="duel-canvas" />
          {banner && <div className="duel-banner">{banner}</div>}
          {desktop && (
            <p className={`duel-mouse-hint${locked ? '' : ' prompt'}`}>
              {locked ? 'Move the mouse to steer · hold left click to attack · Esc frees the mouse' : 'Click the arena to take control with the mouse'}
            </p>
          )}
        </div>
        <div className="duel-controls">
          <div className={`duel-pad${options.mirror ? ' mirror' : ''}`}>
            <div className="stick-zone" onPointerDown={onStickDown} onPointerMove={onStickMove}
              onPointerUp={onStickUp} onPointerCancel={onStickUp}>
              {!stick && <span className="stick-idle">Drag to move</span>}
              {stick && (
                <>
                  <div className="stick-base" style={{ left: stick.ox, top: stick.oy }} />
                  <div className="stick-knob" style={{ left: stick.x, top: stick.y }} />
                </>
              )}
            </div>
            <button
              className={`attack-btn${held ? ' held' : ''}`}
              onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); setAttack(true) }}
              onPointerUp={() => setAttack(false)}
              onPointerCancel={() => setAttack(false)}
            >
              <Icon name="swords" />
              Attack
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
