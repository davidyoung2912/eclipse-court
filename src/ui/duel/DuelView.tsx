import { useEffect, useRef, useState } from 'react'
import { createDuelAi } from '../../ai/duelAi'
import { sfx, startDuelDrums } from '../../audio/synth'
import { profileForSkill } from '../../ai/profile'
import { createDuel, DEFAULT_CONFIG, duelOutcome, stepDuel } from '../../engine/duel/sim'
import { ARENA_H, ARENA_W, DT, DUEL_SECONDS, NO_INPUT, type DuelInput, type DuelState } from '../../engine/duel/types'
import type { DuelOutcome, Piece } from '../../engine/rules/types'

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
  options: DuelOptions
  /** Which fighter the player steers: 0 attacks from the bottom, 1 defends and is shown at the bottom too. */
  playerSide?: 0 | 1
  /** Duel skill (0..1) of the AI fighter. */
  opponentSkill: number
  seed: number
  onDone: (outcome: DuelOutcome) => void
}

const STICK_RADIUS = 56
const HIT_STOP = 0.07
const END_DELAY = 1.1
const COLORS = { solari: '#e8b64a', umbral: '#7a5cc8' }

function draw(ctx: CanvasRenderingContext2D, s: DuelState, w: number, h: number, shake: number) {
  const scale = Math.min(w / ARENA_W, h / ARENA_H)
  const ox = (w - ARENA_W * scale) / 2 + (Math.random() - 0.5) * shake
  const oy = (h - ARENA_H * scale) / 2 + (Math.random() - 0.5) * shake
  const X = (x: number) => ox + x * scale
  const Y = (y: number) => oy + y * scale
  ctx.clearRect(0, 0, w, h)
  ctx.fillStyle = '#0c0920'
  ctx.fillRect(X(0), Y(0), ARENA_W * scale, ARENA_H * scale)
  const aw = ARENA_W * s.arena
  const ah = ARENA_H * s.arena
  ctx.fillStyle = '#251d52'
  ctx.fillRect(X((ARENA_W - aw) / 2), Y((ARENA_H - ah) / 2), aw * scale, ah * scale)
  ctx.strokeStyle = s.arena < 1 ? '#ff5a5a' : '#7a5cc8'
  ctx.lineWidth = 2
  ctx.strokeRect(X((ARENA_W - aw) / 2), Y((ARENA_H - ah) / 2), aw * scale, ah * scale)

  for (const p of s.projectiles) {
    if (p.kind === 'lob') {
      ctx.strokeStyle = 'rgba(255,255,255,0.5)'
      ctx.beginPath()
      ctx.arc(X(p.target.x), Y(p.target.y), 0.9 * scale, 0, Math.PI * 2)
      ctx.stroke()
    }
    ctx.fillStyle = COLORS[s.fighters[p.owner].court]
    ctx.beginPath()
    ctx.arc(X(p.pos.x), Y(p.pos.y), 0.15 * scale, 0, Math.PI * 2)
    ctx.fill()
  }

  for (const f of s.fighters) {
    ctx.fillStyle = COLORS[f.court]
    ctx.beginPath()
    ctx.arc(X(f.pos.x), Y(f.pos.y), f.radius * scale, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = '#fff'
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.moveTo(X(f.pos.x), Y(f.pos.y))
    ctx.lineTo(X(f.pos.x + Math.cos(f.facing) * f.radius * 1.4), Y(f.pos.y + Math.sin(f.facing) * f.radius * 1.4))
    ctx.stroke()
    if (f.charge > 0) {
      ctx.strokeStyle = '#fff'
      ctx.beginPath()
      ctx.arc(X(f.pos.x), Y(f.pos.y), (f.radius + 0.2) * scale, -Math.PI / 2, -Math.PI / 2 + Math.min(1, f.charge) * Math.PI * 2)
      ctx.stroke()
    }
    const bw = 1.4 * scale
    ctx.fillStyle = '#000'
    ctx.fillRect(X(f.pos.x) - bw / 2, Y(f.pos.y - f.radius - 0.35), bw, 5)
    ctx.fillStyle = '#6fe08a'
    ctx.fillRect(X(f.pos.x) - bw / 2, Y(f.pos.y - f.radius - 0.35), bw * Math.max(0, f.hp / f.maxHp), 5)
  }
}

export function DuelView({ attacker, defender, luminance, options, playerSide = 0, opponentSkill, seed, onDone }: Props) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const input = useRef<DuelInput>({ ...NO_INPUT })
  const optionsRef = useRef(options)
  const [stick, setStick] = useState<{ ox: number; oy: number; x: number; y: number } | null>(null)
  const [held, setHeld] = useState(false)
  const [time, setTime] = useState(DUEL_SECONDS)
  const [banner, setBanner] = useState('')
  const stickPointer = useRef<number | null>(null)
  const doneRef = useRef(onDone)

  useEffect(() => {
    optionsRef.current = options
    doneRef.current = onDone
  })

  useEffect(() => {
    const cfg = { aimCone: optionsRef.current.aimAssist ? DEFAULT_CONFIG.aimCone : 0 }
    const state = createDuel(attacker, defender, luminance, cfg)
    const ai = createDuelAi(profileForSkill(opponentSkill), seed)
    const foeSide = (1 - playerSide) as 0 | 1
    // The defender is drawn upside down so the player's fighter is always at the bottom of the screen.
    const flip = playerSide === 1
    let raf = 0
    let last = performance.now()
    let acc = 0
    let freeze = 0
    let shake = 0
    let endTimer = -1
    let hudTick = 0
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

      if (freeze > 0) freeze -= dt
      else acc += dt
      while (acc >= DT && !state.done && freeze <= 0) {
        acc -= DT
        const mine = flip ? { ...input.current, mx: -input.current.mx, my: -input.current.my } : input.current
        const inputs: [DuelInput, DuelInput] = [NO_INPUT, NO_INPUT]
        inputs[playerSide] = mine
        inputs[foeSide] = ai(state, foeSide)
        const events = stepDuel(state, inputs)
        for (const e of events) {
          if (e.type === 'swing') sfx.swing()
          else if (e.type === 'shoot') sfx.shoot()
          else if (e.type === 'slam') sfx.slam()
          else if (e.type === 'hit') {
            sfx.hit(e.damage)
            freeze = HIT_STOP
            shake = Math.min(14, 4 + e.damage * 3)
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
      draw(ctx, state, w, h, shake)
      hudTick += dt
      if (hudTick > 0.1) {
        hudTick = 0
        setTime(Math.max(0, DUEL_SECONDS - state.t))
      }
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => {
      cancelAnimationFrame(raf)
      drums.stop()
    }
  }, [attacker, defender, luminance, playerSide, opponentSkill, seed])

  const onStickDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (stickPointer.current !== null) return
    stickPointer.current = e.pointerId
    e.currentTarget.setPointerCapture(e.pointerId)
    setStick({ ox: e.clientX, oy: e.clientY, x: e.clientX, y: e.clientY })
  }
  const onStickMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerId !== stickPointer.current) return
    setStick((s) => {
      if (!s) return s
      const dx = e.clientX - s.ox
      const dy = e.clientY - s.oy
      const len = Math.hypot(dx, dy)
      const k = len > STICK_RADIUS ? STICK_RADIUS / len : 1
      input.current = { ...input.current, mx: (dx * k) / STICK_RADIUS, my: (dy * k) / STICK_RADIUS }
      return { ...s, x: s.ox + dx * k, y: s.oy + dy * k }
    })
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

  return (
    <div className="duel">
      <div className="duel-hud">
        <span>{attacker.court === 'solari' ? 'Solari' : 'Umbral'} attacks{playerSide === 1 ? ' — defend!' : ''}</span>
        <span>{Math.ceil(time)}s</span>
      </div>
      <canvas ref={canvas} className="duel-canvas" />
      {banner && <div className="duel-banner">{banner}</div>}
      <div className="duel-touch">
        <div className="stick-zone" onPointerDown={onStickDown} onPointerMove={onStickMove}
          onPointerUp={onStickUp} onPointerCancel={onStickUp} style={{ left: options.mirror ? '40%' : 0 }}>
          {stick && (
            <>
              <div className="stick-base" style={{ left: stick.ox, top: stick.oy }} />
              <div className="stick-knob" style={{ left: stick.x, top: stick.y }} />
            </>
          )}
        </div>
        <button
          className={`attack-btn${held ? ' held' : ''}`}
          style={options.mirror ? { left: 16 } : { right: 16 }}
          onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); setAttack(true) }}
          onPointerUp={() => setAttack(false)}
          onPointerCancel={() => setAttack(false)}
        >
          Attack
        </button>
      </div>
    </div>
  )
}
