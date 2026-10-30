import { useEffect, useRef, useState } from 'react'
import { createDuelAi } from '../../ai/duelAi'
import { setMuffled, sfx, startDuelDrums } from '../../audio/synth'
import { ROLE_NAMES } from '../../engine/data/roster'
import { ROLE_INFO } from '../../engine/data/pieceInfo'
import { ASSIST_SLOW_SECONDS, ASSIST_SLOWDOWN, DUEL_PACE, flashesReduced, getSettings } from '../../settings'
import { HAPTIC_PATTERNS, hitHaptic } from '../../haptics'
import { Icon } from '../menus/icons'
import { AUTO_DUEL_SKILL, profileForSkill } from '../../ai/profile'
import { createDuel, DEFAULT_CONFIG, duelOutcome, stepDuel } from '../../engine/duel/duel'
import { DT, DUEL_SECONDS, NO_INPUT, type DuelEvent, type DuelInput } from '../../engine/duel/types'
import type { DuelCells } from '../../engine/rules/cells'
import type { CellEffect, DuelOutcome, Piece } from '../../engine/rules/types'
import { hitStopFor, KO_END_DELAY, KO_SLOW, KO_SLOW_SECONDS } from '../../duelImpact'
import { comboHit, comboPitch, comboTick, NO_COMBO } from '../../duelPresentation'
import { createFx, drawDuel, updateFx } from './duelFx'
import { DuelBriefing } from './DuelBriefing'
import { TipCard } from '../tips/TipCard'
import { useTipsPending } from '../tips/useTipQueue'
import { t } from '../../i18n'

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
  /** Scales how fast the AI fighter speeds up over the fight (1 is the standard ramp). */
  foeRamp?: number
  /** Duel assist: a longer aim line, bigger hit markers and a slower last few seconds. */
  assist?: boolean
  seed: number
  onDone: (outcome: DuelOutcome) => void
}

const STICK_RADIUS = 36
/** The AI's walking speed grows by this share of its base per second, so stalling gets harder (about +36% by the time limit). */
const FOE_SPEED_RAMP = 0.018
/** The mouse's virtual stick: pixels of travel for full speed, and the share of raw movement that counts. */
const MOUSE_RADIUS = 90
const MOUSE_SENS = 0.7
/** Movement against the stick's current push counts this much extra, so reversing is quick instead of a fight with the drift. */
const MOUSE_BRAKE = 2.5
/** After the mouse stops, the stick holds for this long (seconds), then drifts back to centre at MOUSE_RETURN per second. */
const MOUSE_HOLD = 0.3
const MOUSE_RETURN = 2.2
/** Stick pushes this small (share of full) are ignored so a nudge of the hand does not steer. */
const MOUSE_DEADZONE = 0.08
const END_DELAY = 1.1
/** The pre-fight countdown: each of these shows for COUNT_STEP_MS, then the fight begins. */
const COUNTDOWN = ['3', '2', '1', 'Go!']
const COUNT_STEP_MS = 750
/** The stats briefing leads the countdown for this long (tap to skip). */
const BRIEF_MS = 3200

export function DuelView({ attacker, defender, luminance, cells, boardId, cellEffects, options, playerSide = 0, opponentSkill, opponentAggression = 1, foeRamp = 1, assist = false, seed, onDone }: Props) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const input = useRef<DuelInput>({ ...NO_INPUT })
  const optionsRef = useRef(options)
  const lookRef = useRef({ boardId, cellEffects })
  const [stick, setStick] = useState<{ x: number; y: number } | null>(null)
  const [held, setHeld] = useState(false)
  const [time, setTime] = useState(DUEL_SECONDS)
  const [banner, setBanner] = useState('')
  const stickPointer = useRef<number | null>(null)
  const doneRef = useRef(onDone)
  const stage = useRef<HTMLDivElement>(null)
  /** Mouse steering: the virtual stick offset in pixels, active while the pointer is locked to the stage. */
  const mouse = useRef({ x: 0, y: 0, idle: 0, locked: false })
  const [desktop] = useState(() => typeof matchMedia === 'function' && matchMedia('(pointer: fine)').matches)
  const [locked, setLocked] = useState(false)
  const [count, setCount] = useState(0)
  const [briefing, setBriefing] = useState(true)
  /** The guidance cards show over the arena before the fight; nothing starts (countdown, clock, music, mouse capture) until they are read. */
  const tipPages = ['duel', desktop ? 'duel-mouse' : 'duel-touch', playerSide === 1 && 'duel-defend', (!!cells || !!cellEffects?.some(Boolean)) && 'duel-cells'] as const
  const waiting = useTipsPending(tipPages)
  /** The arena is built and drawn behind the guidance cards; the sound waits for them to be read. */
  const waitingRef = useRef(waiting)
  useEffect(() => { waitingRef.current = waiting }, [waiting])
  /** The simulation holds still until the countdown has run out. */
  const started = useRef(false)
  /** Set by Skip: the rest of the fight is played out at once with the duel AI at the player's controls. */
  const skipping = useRef(false)

  useEffect(() => {
    if (waiting || !briefing) return
    const t = setTimeout(() => setBriefing(false), BRIEF_MS)
    return () => clearTimeout(t)
  }, [waiting, briefing])

  useEffect(() => {
    if (waiting || briefing) return
    started.current = false
    const timers = COUNTDOWN.map((_, i) => setTimeout(() => {
      if (i + 1 < COUNTDOWN.length) setCount(i + 1)
      else { started.current = true; setCount(COUNTDOWN.length) }
    }, (i + 1) * COUNT_STEP_MS))
    return () => timers.forEach(clearTimeout)
  }, [attacker, defender, seed, waiting, briefing])

  useEffect(() => {
    optionsRef.current = options
    lookRef.current = { boardId, cellEffects }
    doneRef.current = onDone
  })

  useEffect(() => {
    const el = stage.current
    if (!desktop || !el || waiting) return
    const lockChange = () => {
      const on = document.pointerLockElement === el
      mouse.current = { x: 0, y: 0, idle: 0, locked: on }
      if (!on) input.current = { ...NO_INPUT }
      setLocked(on)
      setHeld(false)
    }
    const move = (e: MouseEvent) => {
      if (!mouse.current.locked) return
      const dx = e.movementX * MOUSE_SENS
      const dy = e.movementY * MOUSE_SENS
      const { x: sx, y: sy } = mouse.current
      const sl = Math.hypot(sx, sy)
      // The part of the move that opposes the current push is boosted, so turning back cancels the drift fast.
      const along = sl > 0 ? (dx * sx + dy * sy) / sl : 0
      const boost = along < 0 ? (MOUSE_BRAKE - 1) * along / sl : 0
      let x = sx + dx + sx * boost
      let y = sy + dy + sy * boost
      const len = Math.hypot(x, y)
      if (len > MOUSE_RADIUS) { x = (x * MOUSE_RADIUS) / len; y = (y * MOUSE_RADIUS) / len }
      mouse.current.x = x
      mouse.current.y = y
      mouse.current.idle = 0
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
  }, [desktop, waiting])

  useEffect(() => {
    const foeSide = (1 - playerSide) as 0 | 1
    const pace = DUEL_PACE[getSettings().duelSpeed]
    const myAi = createDuelAi(profileForSkill(AUTO_DUEL_SKILL, 1), seed + 1)
    skipping.current = false
    const cfg = { aimCone: optionsRef.current.aimAssist ? DEFAULT_CONFIG.aimCone : 0, foeSpeedRamp: { side: foeSide, perSecond: FOE_SPEED_RAMP * foeRamp }, pickups: { seed: seed ^ 0x9e3779b9 } }
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
    let combo = NO_COMBO
    let muffled = false
    const fx = createFx({
      luminance, boardId: lookRef.current.boardId, cells: lookRef.current.cellEffects ?? [null, null], reduceMotion: getSettings().reduceMotion, reduceFlashes: flashesReduced(),
      courts: [attacker.court, defender.court], mineSide: playerSide, assistSide: assist ? playerSide : undefined,
    })
    let drums: ReturnType<typeof startDuelDrums> | null = null
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
        // The mouse drives a virtual stick that holds briefly, then drifts back to centre: a flick sends you gliding on.
        mouse.current.idle += dt
        if (mouse.current.idle > MOUSE_HOLD) {
          const k = Math.exp(-dt * MOUSE_RETURN)
          mouse.current.x *= k
          mouse.current.y *= k
        }
        const sx = mouse.current.x / MOUSE_RADIUS
        const sy = mouse.current.y / MOUSE_RADIUS
        const sl = Math.hypot(sx, sy)
        const live = sl <= MOUSE_DEADZONE ? 0 : (sl - MOUSE_DEADZONE) / (1 - MOUSE_DEADZONE) / sl
        input.current = { ...input.current, mx: sx * live, my: sy * live }
      }
      if (freeze > 0) freeze -= dt
      else if (started.current) acc += dt * (assist && DUEL_SECONDS - state.t <= ASSIST_SLOW_SECONDS ? pace * ASSIST_SLOWDOWN : pace)
      const events: DuelEvent[] = []
      if (skipping.current) {
        while (!state.done) {
          const inputs: [DuelInput, DuelInput] = [NO_INPUT, NO_INPUT]
          inputs[playerSide] = myAi(state, playerSide)
          inputs[foeSide] = ai(state, foeSide)
          stepDuel(state, inputs)
        }
        acc = 0
        freeze = 0
      }
      while (acc >= DT && !state.done && freeze <= 0) {
        acc -= DT
        const mine = flip ? { ...input.current, mx: -input.current.mx, my: -input.current.my } : input.current
        const inputs: [DuelInput, DuelInput] = [NO_INPUT, NO_INPUT]
        inputs[playerSide] = mouse.current.locked
          // With the mouse you always face the foe, so steering never turns you away and every attack lands where you look.
          ? { ...mine, aim: Math.atan2(state.fighters[foeSide].pos.y - state.fighters[playerSide].pos.y, state.fighters[foeSide].pos.x - state.fighters[playerSide].pos.x) }
          : mine
        inputs[foeSide] = ai(state, foeSide)
        const stepped = stepDuel(state, inputs)
        events.push(...stepped)
        for (const e of stepped) {
          if (e.type === 'swing') sfx.swing()
          else if (e.type === 'shoot') sfx.shoot()
          else if (e.type === 'slam') sfx.slam()
          else if (e.type === 'pickup') sfx.pickup()
          else if (e.type === 'hit') {
            combo = comboHit(combo, (1 - e.target) as 0 | 1)
            sfx.hit(e.damage, comboPitch(combo.count))
            const ko = state.fighters[e.target].hp <= 0
            if (ko) sfx.crowd()
            freeze = hitStopFor(e.damage, ko)
            shake = getSettings().reduceMotion ? 0 : Math.min(14, 4 + e.damage * 3)
            if (optionsRef.current.haptics) navigator.vibrate?.([...HAPTIC_PATTERNS[hitHaptic(e.damage, ko)]])
          } else if (e.type === 'suddenDeath') setBanner('Sudden death!')
        }
      }
      if (state.done && endTimer < 0) {
        const out = duelOutcome(state)
        const [mineHp, foeHp] = playerSide === 0 ? [out.attackerHp, out.defenderHp] : [out.defenderHp, out.attackerHp]
        setBanner(mineHp > 0 && foeHp <= 0 ? 'Victory' : mineHp <= 0 && foeHp > 0 ? 'Defeat' : mineHp <= 0 ? 'Both fall' : 'Draw')
        if (mineHp > 0 && foeHp <= 0) sfx.win()
        else if (mineHp <= 0) sfx.lose()
        drums?.stop()
        endTimer = fx.ko ? KO_END_DELAY : END_DELAY
      }
      if (endTimer >= 0) {
        endTimer -= dt
        if (endTimer < 0) {
          doneRef.current(duelOutcome(state))
          return
        }
      }
      combo = comboTick(combo, dt)
      // Sound goes dull while the fight is frozen on a heavy blow.
      const dull = freeze > 0.08
      if (dull !== muffled) { muffled = dull; setMuffled(dull) }
      if (!drums && !waitingRef.current) { drums = startDuelDrums(); sfx.duelStart() }
      drums?.setIntensity(state.t / DUEL_SECONDS)
      shake = Math.max(0, shake - dt * 40)
      if (started.current) fx.call += dt
      // Once a fighter falls the effects play out in slow motion for a moment.
      updateFx(fx, state, fx.ko && fx.ko.t < KO_SLOW_SECONDS * KO_SLOW ? dt * KO_SLOW : dt, events)
      drawDuel(ctx, fx, state, w, h, dpr, shake, flip)
      hudTick += dt
      if (hudTick > 0.1) {
        hudTick = 0
        setTime(Math.max(0, DUEL_SECONDS - state.t) / pace)
      }
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => {
      cancelAnimationFrame(raf)
      setMuffled(false)
      drums?.stop()
    }
  }, [attacker, defender, luminance, cells, playerSide, opponentSkill, opponentAggression, foeRamp, assist, seed])

  /** The joystick is fixed: its centre is the origin, and the knob follows the finger, clamped to the ring. */
  const stickVector = (e: React.PointerEvent<HTMLDivElement>) => {
    const box = e.currentTarget.getBoundingClientRect()
    const dx = e.clientX - (box.left + box.width / 2)
    const dy = e.clientY - (box.top + box.height / 2)
    const len = Math.hypot(dx, dy)
    const k = len > STICK_RADIUS ? STICK_RADIUS / len : 1
    return { x: dx * k, y: dy * k }
  }
  // Everything is read from the event here, not inside a state updater: React may run an updater after the
  // event is over, when `currentTarget` is already null (which crashed touch screens).
  const steer = (e: React.PointerEvent<HTMLDivElement>) => {
    const v = stickVector(e)
    input.current = { ...input.current, mx: v.x / STICK_RADIUS, my: v.y / STICK_RADIUS }
    setStick(v)
  }
  const onStickDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (stickPointer.current !== null) return
    stickPointer.current = e.pointerId
    e.currentTarget.setPointerCapture(e.pointerId)
    steer(e)
  }
  const onStickMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerId === stickPointer.current) steer(e)
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
    // The pointer is already locked to the stage when the briefing shows, and a locked pointer sends its clicks to the stage rather than the briefing button, so the stage dismisses it.
    if (briefing) { if (e.pointerType === 'mouse' && e.button === 0) setBriefing(false); return }
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
  const light = luminance > 0 ? t('duel.light', { light: `+${luminance}` }) : luminance < 0 ? t('duel.light', { light: luminance }) : t('duel.neutral')

  return (
    <div className={`duel duel-${mine.court}`}>
      <div className="duel-frame">
        <header className="duel-head">
          <h2>{named(mine)} <span>{t('duel.vs')}</span> {named(foe)}</h2>
          <p>
            {t(playerSide === 0 ? 'duel.attacks' : 'duel.defends', { mine: `${court(mine)} ${ROLE_INFO[mine.role].label}`, foe: `${court(foe)} ${ROLE_INFO[foe.role].label}` })}
            {' · '}{light}{playerSide === 1 ? ` · ${t('duel.holdGround')}` : ''}
          </p>
          <div className="duel-timer" aria-label={t('duel.timeLeft')}>{Math.ceil(time)}s</div>
          {!waiting && count >= COUNTDOWN.length && !banner.match(/^(Victory|Defeat|Both|Draw)/) && (
            <button className="duel-skip" onClick={() => { skipping.current = true; input.current = { ...NO_INPUT }; setHeld(false) }}>{t('duel.skip')}</button>
          )}
        </header>
        <div className="duel-stage" ref={stage} onPointerDown={onStagePointerDown}>
          <canvas ref={canvas} className="duel-canvas" />
          {banner && <div className="duel-banner">{banner}</div>}
          {!waiting && briefing && (
            <DuelBriefing mine={mine} foe={foe} luminance={luminance} cells={cells} playerSide={playerSide}
              opponentSkill={opponentSkill} opponentAggression={opponentAggression} onContinue={() => setBriefing(false)} />
          )}
          {!waiting && !briefing && count < COUNTDOWN.length && (
            <div key={count} className={`duel-countdown ${attacker.court}`} role="status" aria-label={COUNTDOWN[count]}>{COUNTDOWN[count]}</div>
          )}
          {desktop && !waiting && !locked && count >= COUNTDOWN.length && <p className="duel-mouse-hint prompt">{t('duel.clickArena')}</p>}
        </div>
        {desktop ? (
          <aside className="duel-info" aria-label={t('duel.mouseControls')}>
            <h3>{t('duel.mouseControls')}</h3>
            <ul>
              <li><strong>{t('duel.mouseMove')}</strong> {t('duel.mouseMoveText')}</li>
              <li><strong>{t('duel.mouseHold')}</strong> {t('duel.mouseHoldText')}</li>
              <li><strong>{t('duel.mouseEsc')}</strong> {t('duel.mouseEscText')}</li>
            </ul>
          </aside>
        ) : (
        <div className="duel-controls">
          <div className={`duel-pad${options.mirror ? ' mirror' : ''}`}>
            <div className="stick-zone">
              <div className={`joystick${stick ? ' active' : ''}`} role="presentation" onPointerDown={onStickDown} onPointerMove={onStickMove}
                onPointerUp={onStickUp} onPointerCancel={onStickUp}>
                <div className="stick-knob" style={{ transform: `translate(calc(-50% + ${stick?.x ?? 0}px), calc(-50% + ${stick?.y ?? 0}px))` }} />
              </div>
            </div>
            <button
              className={`attack-btn${held ? ' held' : ''}`}
              onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); setAttack(true) }}
              onPointerUp={() => setAttack(false)}
              onPointerCancel={() => setAttack(false)}
            >
              <Icon name="swords" />
              {t('duel.attack')}
            </button>
          </div>
        </div>
        )}
      </div>
      <TipCard modal page={tipPages} />
    </div>
  )
}
