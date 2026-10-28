import { lostPanes, PALETTE, pieceArtSvg } from '../../art/pieceGeometry'
import { ARENA_H, ARENA_W, BUFF_SECONDS, PICKUP_KINDS, PICKUP_LIFE, PICKUP_RADIUS, type DuelEvent, type DuelState, type PickupKind, type Vec } from '../../engine/duel/types'
import type { CellEffect, Court, Piece } from '../../engine/rules/types'

export const COLORS: Record<Court, string> = { solari: '#e8b64a', umbral: '#7a5cc8' }

const CELL_COLORS: Record<CellEffect, string> = {
  might: '#ff9a3c', ward: '#4fb3ff', recovery: '#5fdc7a', hazard: '#ff4d5e', silence: '#9aa0b5', invincible: '#ffe27a',
}

/** Orb colour schemes: heal is green, attack red and defence purple. */
const PICKUP_LOOK: Record<PickupKind, { main: string; dark: string; label: string }> = {
  heal: { main: '#5fdc7a', dark: '#0f3d1f', label: 'Heal' },
  attack: { main: '#ff5a5a', dark: '#4a0e14', label: 'Attack' },
  defense: { main: '#a98cff', dark: '#271650', label: 'Defence' },
}

const icons = new Map<string, HTMLImageElement>()
/** The board's medallion for a piece, rendered once per role, court and set of greyed-out panes. */
function iconFor(role: Piece['role'], court: Piece['court'], lost: ReadonlySet<number>): HTMLImageElement {
  const key = `${court}-${role}-${[...lost].join('')}`
  let img = icons.get(key)
  if (!img) {
    img = new Image()
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(pieceArtSvg(role, court, lost))}`
    icons.set(key, img)
  }
  return img
}

/** What the arena should look like: the square's light, the board it is on and the cells under each fighter. */
export interface DuelLook {
  luminance: number
  boardId?: string
  /** Cell effect under the attacker and the defender. */
  cells: [CellEffect | null, CellEffect | null]
  reduceMotion: boolean
  /** The courts of the attacker and the defender. */
  courts: [Court, Court]
  /** The fighter the player steers, when duel assist is on: it gets a longer aim line and bigger hit markers. */
  assistSide?: 0 | 1
}

interface Theme {
  kind: 'bright' | 'dark' | 'dusk'
  inner: string
  outer: string
  rim: string
  mote: string
}

const themeOf = (luminance: number): Theme =>
  luminance > 0 ? { kind: 'bright', inner: '#6a5594', outer: '#33285f', rim: '#e8b64a', mote: '255,206,110' }
  : luminance < 0 ? { kind: 'dark', inner: '#1f1850', outer: '#0a0822', rim: '#6d54b8', mote: '190,200,255' }
  : { kind: 'dusk', inner: '#34296e', outer: '#1d1745', rim: '#7a5cc8', mote: '200,170,255' }

interface Particle {
  kind: 'spark' | 'trail' | 'ghost' | 'ring' | 'text'
  x: number
  y: number
  vx: number
  vy: number
  life: number
  max: number
  r: number
  color: string
  text?: string
}

interface Mote { x: number; y: number; vx: number; vy: number; ph: number; r: number }

export interface Fx {
  look: DuelLook
  theme: Theme
  /** Seconds since the duel opened, running even while the simulation is frozen. */
  t: number
  /** Seconds since the fight began, which is after the countdown; the opening call keys off this. */
  call: number
  particles: Particle[]
  motes: Mote[]
  flash: [number, number]
  recoil: [Vec, Vec]
  lobStart: WeakMap<object, number>
  floor: { canvas: HTMLCanvasElement; w: number; h: number; dpr: number } | null
  hatch: CanvasPattern | null
  /** The last medallion that had finished loading for each fighter, shown while the next one loads. */
  lastIcon: [HTMLImageElement | null, HTMLImageElement | null]
}

/** Width of the coloured side strips, in arena units. */
const SIDE = 0.9
const MAX_PARTICLES = 220
const INTRO = 0.45

export function createFx(look: DuelLook): Fx {
  const theme = themeOf(look.luminance)
  const motes: Mote[] = []
  for (let i = 0; i < 26; i++) {
    const up = theme.kind === 'bright'
    motes.push({
      x: Math.random() * ARENA_W, y: Math.random() * ARENA_H,
      vx: (Math.random() - 0.5) * 0.15, vy: up ? -(0.2 + Math.random() * 0.3) : theme.kind === 'dusk' ? (Math.random() - 0.5) * 0.2 : 0,
      ph: Math.random() * 6.28, r: 0.025 + Math.random() * 0.04,
    })
  }
  return { look, theme, t: 0, call: 0, particles: [], motes, flash: [0, 0], recoil: [{ x: 0, y: 0 }, { x: 0, y: 0 }], lobStart: new WeakMap(), floor: null, hatch: null, lastIcon: [null, null] }
}

const fmt = (n: number) => String(Math.round(n * 10) / 10)

function push(fx: Fx, p: Particle) {
  if (fx.particles.length < MAX_PARTICLES) fx.particles.push(p)
}

/** Advances the visual effects by `dt` real seconds and reacts to the simulation's events. */
export function updateFx(fx: Fx, s: DuelState, dt: number, events: DuelEvent[]) {
  const calm = fx.look.reduceMotion
  fx.t += dt
  for (const e of events) {
    if (e.type === 'hit') {
      const hitter = s.fighters[1 - e.target as 0 | 1]
      const victim = s.fighters[e.target]
      const n = Math.round((8 + e.damage * 4) * (calm ? 0.5 : 1))
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2
        const v = 1.5 + Math.random() * 3.5
        push(fx, { kind: 'spark', x: e.at.x, y: e.at.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0.45, max: 0.45, r: 0.05 + Math.random() * 0.05, color: i % 3 ? COLORS[hitter.court] : '#ffffff' })
      }
      push(fx, { kind: 'text', x: e.at.x, y: e.at.y - victim.radius, vx: 0, vy: -1.4, life: 0.9, max: 0.9, r: 0, color: '#ff8088', text: `-${fmt(e.damage)}` })
      if (fx.look.assistSide !== undefined) push(fx, { kind: 'ring', x: e.at.x, y: e.at.y, vx: 0, vy: 0, life: 0.6, max: 0.6, r: 1.1, color: '#ff8088' })
      fx.flash[e.target] = 0.18
      if (!calm) {
        const dx = victim.pos.x - hitter.pos.x
        const dy = victim.pos.y - hitter.pos.y
        const len = Math.hypot(dx, dy) || 1
        fx.recoil[e.target] = { x: (dx / len) * 0.28, y: (dy / len) * 0.28 }
      }
    } else if (e.type === 'pickup') {
      const look = PICKUP_LOOK[e.kind]
      push(fx, { kind: 'ring', x: e.at.x, y: e.at.y, vx: 0, vy: 0, life: 0.5, max: 0.5, r: 1.6, color: look.main })
      push(fx, { kind: 'text', x: e.at.x, y: e.at.y - 0.5, vx: 0, vy: -1.2, life: 1, max: 1, r: 0, color: look.main, text: `${look.label}+` })
      const n = calm ? 5 : 10
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2
        push(fx, { kind: 'spark', x: e.at.x, y: e.at.y, vx: Math.cos(a) * 2.2, vy: Math.sin(a) * 2.2, life: 0.4, max: 0.4, r: 0.06, color: look.main })
      }
    } else if (e.type === 'slam') {
      push(fx, { kind: 'ring', x: e.at.x, y: e.at.y, vx: 0, vy: 0, life: 0.35, max: 0.35, r: 2, color: COLORS[s.fighters[e.by].court] })
    }
  }
  for (const p of s.projectiles) {
    if (p.kind === 'lob' && !fx.lobStart.has(p)) fx.lobStart.set(p, p.ttl)
    push(fx, { kind: 'trail', x: p.pos.x, y: p.pos.y, vx: 0, vy: 0, life: 0.25, max: 0.25, r: 0.12, color: COLORS[s.fighters[p.owner].court] })
  }
  s.fighters.forEach((f, i) => {
    if (f.dash > 0) push(fx, { kind: 'ghost', x: f.pos.x, y: f.pos.y, vx: 0, vy: 0, life: 0.25, max: 0.25, r: f.radius, color: COLORS[f.court] })
    fx.flash[i] = Math.max(0, fx.flash[i] - dt)
    const k = Math.exp(-dt * 10)
    fx.recoil[i] = { x: fx.recoil[i].x * k, y: fx.recoil[i].y * k }
  })
  for (const p of fx.particles) {
    p.life -= dt
    p.x += p.vx * dt
    p.y += p.vy * dt
    if (p.kind === 'spark') { p.vx *= 0.94; p.vy *= 0.94 }
  }
  fx.particles = fx.particles.filter((p) => p.life > 0)
  if (!calm) {
    for (const m of fx.motes) {
      m.x += m.vx * dt
      m.y += m.vy * dt
      if (m.x < 0) m.x += ARENA_W
      if (m.x > ARENA_W) m.x -= ARENA_W
      if (m.y < 0) m.y += ARENA_H
      if (m.y > ARENA_H) m.y -= ARENA_H
    }
  }
}

/** A small deterministic random source, so a given board always paints the same floor. */
function seeded(seed: number) {
  let a = seed
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

type Ctx = CanvasRenderingContext2D
type Proj = (x: number, y: number) => [number, number]

function glyph(c: Ctx, effect: CellEffect, cx: number, cy: number, r: number) {
  c.beginPath()
  if (effect === 'might') {
    for (const dy of [-0.35, 0.3]) { c.moveTo(cx - r * 0.8, cy + r * (dy + 0.4)); c.lineTo(cx, cy + r * (dy - 0.4)); c.lineTo(cx + r * 0.8, cy + r * (dy + 0.4)) }
  } else if (effect === 'ward') {
    c.moveTo(cx - r * 0.8, cy - r * 0.7); c.lineTo(cx + r * 0.8, cy - r * 0.7); c.lineTo(cx + r * 0.8, cy)
    c.quadraticCurveTo(cx + r * 0.8, cy + r * 0.7, cx, cy + r); c.quadraticCurveTo(cx - r * 0.8, cy + r * 0.7, cx - r * 0.8, cy); c.closePath()
  } else if (effect === 'recovery') {
    c.moveTo(cx, cy - r); c.lineTo(cx, cy + r); c.moveTo(cx - r, cy); c.lineTo(cx + r, cy)
  } else if (effect === 'hazard') {
    c.moveTo(cx, cy - r); c.lineTo(cx + r, cy + r * 0.8); c.lineTo(cx - r, cy + r * 0.8); c.closePath()
    c.moveTo(cx, cy - r * 0.3); c.lineTo(cx, cy + r * 0.25); c.moveTo(cx, cy + r * 0.5); c.lineTo(cx, cy + r * 0.52)
  } else if (effect === 'silence') {
    c.arc(cx, cy, r, 0, Math.PI * 2); c.moveTo(cx - r * 0.7, cy + r * 0.7); c.lineTo(cx + r * 0.7, cy - r * 0.7)
  } else {
    c.moveTo(cx, cy - r); c.lineTo(cx + r * 0.7, cy); c.lineTo(cx, cy + r); c.lineTo(cx - r * 0.7, cy); c.closePath()
    c.moveTo(cx, cy - r * 0.4); c.lineTo(cx + r * 0.28, cy); c.lineTo(cx, cy + r * 0.4); c.lineTo(cx - r * 0.28, cy); c.closePath()
  }
  c.stroke()
}

function crest(c: Ctx, court: Court, cx: number, cy: number, r: number) {
  c.beginPath()
  if (court === 'solari') {
    c.arc(cx, cy, r * 0.45, 0, Math.PI * 2)
    c.fill()
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2
      c.moveTo(cx + Math.cos(a) * r * 0.6, cy + Math.sin(a) * r * 0.6)
      c.lineTo(cx + Math.cos(a) * r * (i % 2 ? 0.85 : 1), cy + Math.sin(a) * r * (i % 2 ? 0.85 : 1))
    }
    c.stroke()
  } else {
    c.save()
    c.arc(cx, cy, r, 0, Math.PI * 2)
    c.clip()
    c.beginPath()
    c.rect(cx - r * 2, cy - r * 2, r * 4, r * 4)
    c.arc(cx + r * 0.4, cy - r * 0.1, r * 0.8, 0, Math.PI * 2)
    c.fill('evenodd')
    c.restore()
  }
}

/** Faint markings that tell the boards apart. */
function motif(c: Ctx, id: string, P: Proj, scale: number) {
  const rand = seeded(id.length * 7919 + id.charCodeAt(0))
  const line = (x1: number, y1: number, x2: number, y2: number) => { const [a, b] = P(x1, y1); const [d, e] = P(x2, y2); c.moveTo(a, b); c.lineTo(d, e) }
  c.strokeStyle = 'rgba(255, 255, 255, 0.05)'
  c.fillStyle = 'rgba(255, 255, 255, 0.025)'
  c.lineWidth = Math.max(1, scale * 0.03)
  const base = id.replace('grand-', '')
  if (base === 'pillars') {
    for (const [x, y] of [[1.6, 2.6], [6.4, 2.6], [1.6, 9.4], [6.4, 9.4]]) {
      const [px, py] = P(x, y)
      c.fillStyle = 'rgba(0, 0, 0, 0.3)'
      c.beginPath(); c.arc(px, py, 0.6 * scale, 0, Math.PI * 2); c.fill()
      c.beginPath(); c.arc(px, py, 0.6 * scale, 0, Math.PI * 2); c.stroke()
      c.beginPath(); c.arc(px, py, 0.32 * scale, 0, Math.PI * 2); c.stroke()
    }
  } else if (base === 'flanks') {
    for (const x of [0, ARENA_W - 1.2]) { const [px, py] = P(x, 0); c.fillRect(px, py, 1.2 * scale, ARENA_H * scale) }
    c.setLineDash([scale * 0.3, scale * 0.25])
    c.beginPath(); line(1.2, 0, 1.2, ARENA_H); line(ARENA_W - 1.2, 0, ARENA_W - 1.2, ARENA_H); c.stroke()
    c.setLineDash([])
  } else if (base === 'ruins') {
    for (let i = 0; i < 7; i++) {
      let x = rand() * ARENA_W
      let y = rand() * ARENA_H
      c.beginPath()
      const [sx, sy] = P(x, y)
      c.moveTo(sx, sy)
      for (let k = 0; k < 5; k++) { x += (rand() - 0.5) * 1.6; y += (rand() - 0.5) * 1.6; const [qx, qy] = P(x, y); c.lineTo(qx, qy) }
      c.strokeStyle = 'rgba(0, 0, 0, 0.35)'
      c.stroke()
    }
    for (let i = 0; i < 9; i++) { const [px, py] = P(rand() * (ARENA_W - 1), rand() * (ARENA_H - 1)); c.fillRect(px, py, scale * (0.5 + rand()), scale * (0.5 + rand())) }
  } else if (base === 'shrine') {
    const [cx, cy] = P(ARENA_W / 2, ARENA_H / 2)
    for (const r of [1.2, 2.2, 3.2]) { c.beginPath(); c.arc(cx, cy, r * scale, 0, Math.PI * 2); c.stroke() }
    c.beginPath()
    for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; c.moveTo(cx + Math.cos(a) * 1.2 * scale, cy + Math.sin(a) * 1.2 * scale); c.lineTo(cx + Math.cos(a) * 3.2 * scale, cy + Math.sin(a) * 3.2 * scale) }
    c.stroke()
  } else if (base === 'crossroads') {
    const [ax, ay] = P(ARENA_W / 2 - 0.8, 0)
    c.fillRect(ax, ay, 1.6 * scale, ARENA_H * scale)
    const [bx, by] = P(0, ARENA_H / 2 - 0.8)
    c.fillRect(bx, by, ARENA_W * scale, 1.6 * scale)
    const [cx, cy] = P(ARENA_W / 2, ARENA_H / 2)
    c.beginPath(); c.moveTo(cx, cy - scale); c.lineTo(cx + scale, cy); c.lineTo(cx, cy + scale); c.lineTo(cx - scale, cy); c.closePath(); c.stroke()
  } else if (base === 'sanctum') {
    c.beginPath()
    for (let k = -ARENA_H; k < ARENA_W + ARENA_H; k += 1.4) { line(k, 0, k + ARENA_H, ARENA_H); line(k, 0, k - ARENA_H, ARENA_H) }
    c.stroke()
  } else {
    for (let i = 0; i < ARENA_W; i++) for (let j = 0; j < ARENA_H; j++) if ((i + j) % 2) { const [px, py] = P(i, j); c.fillRect(px, py, scale, scale) }
  }
}

function paintFloor(c: Ctx, fx: Fx, w: number, h: number, scale: number, bx: number, by: number) {
  const { theme, look } = fx
  const P: Proj = (x, y) => [bx + x * scale, by + y * scale]
  const [ax, ay] = P(0, 0)
  const aw = ARENA_W * scale
  const ah = ARENA_H * scale
  c.clearRect(0, 0, w, h)
  const floor = c.createRadialGradient(ax + aw / 2, ay + ah / 2, 0, ax + aw / 2, ay + ah / 2, Math.hypot(aw, ah) / 2)
  floor.addColorStop(0, theme.inner)
  floor.addColorStop(1, theme.outer)
  c.fillStyle = floor
  c.fillRect(ax, ay, aw, ah)
  c.save()
  c.beginPath()
  c.rect(ax, ay, aw, ah)
  c.clip()
  const rand = seeded(look.luminance * 31 + 11)
  if (theme.kind === 'bright') {
    // The sun shines from the Solari end of the arena: the attacker's (bottom) or the defender's (top).
    const sunTop = look.courts[0] !== 'solari'
    const [ox, oy] = P(ARENA_W / 2, sunTop ? -1 : ARENA_H + 1)
    for (let i = 0; i < 9; i++) {
      const a = (sunTop ? Math.PI / 2 : -Math.PI / 2) + (i - 4) * 0.2
      c.fillStyle = `rgba(255, 214, 120, ${look.luminance > 1 ? 0.065 : 0.045})`
      c.beginPath()
      c.moveTo(ox, oy)
      c.lineTo(ox + Math.cos(a - 0.04) * ah * 1.6, oy + Math.sin(a - 0.04) * ah * 1.6)
      c.lineTo(ox + Math.cos(a + 0.04) * ah * 1.6, oy + Math.sin(a + 0.04) * ah * 1.6)
      c.fill()
    }
  } else if (theme.kind === 'dark') {
    const [mx, my] = P(ARENA_W * 0.78, look.courts[0] === 'solari' ? 1.4 : ARENA_H - 1.4)
    const halo = c.createRadialGradient(mx, my, 0, mx, my, 3.2 * scale)
    halo.addColorStop(0, 'rgba(190, 200, 255, 0.12)')
    halo.addColorStop(1, 'rgba(190, 200, 255, 0)')
    c.fillStyle = halo
    c.fillRect(ax, ay, aw, ah)
    c.fillStyle = 'rgba(220, 226, 255, 0.3)'
    for (let i = 0; i < 40 * (look.luminance < -1 ? 1.5 : 1); i++) {
      const [sx, sy] = P(rand() * ARENA_W, rand() * ARENA_H)
      c.fillRect(sx, sy, 1.2, 1.2)
    }
  }
  motif(c, look.boardId ?? 'classic', P, scale)

  // Each half carries the cell its fighter stands on.
  look.cells.forEach((effect, i) => {
    if (!effect) return
    const color = CELL_COLORS[effect]
    const [hx, hy] = P(0, i === 0 ? ARENA_H / 2 : 0)
    const grad = c.createLinearGradient(0, hy + (i === 0 ? ah / 2 : 0), 0, hy + (i === 0 ? 0 : ah / 2))
    grad.addColorStop(0, color + '38')
    grad.addColorStop(1, color + '00')
    c.fillStyle = grad
    c.fillRect(hx, hy, aw, ah / 2)
    c.strokeStyle = color + '80'
    c.lineWidth = Math.max(1.5, scale * 0.05)
    c.lineJoin = 'round'
    c.lineCap = 'round'
    const [gx, gy] = P(ARENA_W / 2, i === 0 ? ARENA_H * 0.68 : ARENA_H * 0.32)
    glyph(c, effect, gx, gy, scale * 0.7)
    if (effect === 'hazard') {
      c.save()
      c.beginPath(); c.rect(hx, hy, aw, ah / 2); c.clip()
      c.strokeStyle = color + '30'
      c.beginPath()
      for (let k = -ah; k < aw + ah; k += scale * 0.5) { c.moveTo(hx + k, hy + ah / 2); c.lineTo(hx + k + ah / 2, hy) }
      c.stroke()
      c.restore()
    }
  })

  // Court crests behind each fighter's starting end.
  ;([0, 1] as const).forEach((i) => {
    const court = look.courts[i]
    const [cx, cy] = P(ARENA_W / 2, i === 0 ? ARENA_H - 0.9 : 0.9)
    c.fillStyle = court === 'solari' ? 'rgba(255, 246, 220, 0.6)' : 'rgba(238, 242, 255, 0.6)'
    c.strokeStyle = c.fillStyle
    c.lineWidth = Math.max(1.5, scale * 0.05)
    crest(c, court, cx, cy, scale * 0.8)
  })
  c.restore()

  // Outside the movement boundary, down each half's sides: boxes in the colours of that court's medallion panes, one per pane.
  ;([0, 1] as const).forEach((i) => {
    const panes = PALETTE[look.courts[i]].panes
    const half = ARENA_H / 2
    const size = half / 8
    for (let k = 0; k < 8; k++) {
      const y = (i === 0 ? half : 0) + k * size
      for (const x of [-SIDE, ARENA_W]) {
        const [bx0, by0] = P(x, y)
        c.fillStyle = panes[k % 3]
        c.fillRect(bx0, by0, SIDE * scale, size * scale)
        c.strokeStyle = '#120d2a'
        c.lineWidth = Math.max(1, scale * 0.02)
        c.strokeRect(bx0, by0, SIDE * scale, size * scale)
      }
    }
  })
}

function hatchPattern(ctx: Ctx): CanvasPattern | null {
  const tile = document.createElement('canvas')
  tile.width = tile.height = 12
  const t = tile.getContext('2d')
  if (!t) return null
  t.strokeStyle = 'rgba(255, 70, 80, 0.5)'
  t.lineWidth = 2
  t.beginPath(); t.moveTo(-2, 14); t.lineTo(14, -2); t.stroke()
  return ctx.createPattern(tile, 'repeat')
}

/** Draws one frame of the arena: floor, hazards, projectiles, effects and fighters. */
/** The icon inside an orb, drawn in a box of half-size `r` around the origin. */
function pickupIcon(ctx: Ctx, kind: PickupKind, r: number, color: string) {
  ctx.strokeStyle = color
  ctx.fillStyle = color
  ctx.lineWidth = Math.max(2, r * 0.22)
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.beginPath()
  if (kind === 'heal') {
    ctx.moveTo(0, -r * 0.62); ctx.lineTo(0, r * 0.62)
    ctx.moveTo(-r * 0.62, 0); ctx.lineTo(r * 0.62, 0)
    ctx.stroke()
  } else if (kind === 'attack') {
    // A sword pointing up-right: blade, cross guard and grip.
    ctx.save()
    ctx.rotate(Math.PI / 4)
    ctx.moveTo(0, -r * 0.72); ctx.lineTo(0, r * 0.3)
    ctx.moveTo(-r * 0.34, r * 0.3); ctx.lineTo(r * 0.34, r * 0.3)
    ctx.moveTo(0, r * 0.3); ctx.lineTo(0, r * 0.7)
    ctx.stroke()
    ctx.restore()
  } else {
    ctx.moveTo(0, -r * 0.7)
    ctx.lineTo(r * 0.6, -r * 0.42)
    ctx.quadraticCurveTo(r * 0.6, r * 0.38, 0, r * 0.72)
    ctx.quadraticCurveTo(-r * 0.6, r * 0.38, -r * 0.6, -r * 0.42)
    ctx.closePath()
    ctx.stroke()
  }
}

/** A bonus orb: a small disc with a coloured ring pattern per kind and its icon in the middle. */
function drawOrb(ctx: Ctx, kind: PickupKind, cx: number, cy: number, r: number, t: number, alpha: number, calm: boolean, unflip: (x: number, y: number, draw: () => void) => void) {
  const look = PICKUP_LOOK[kind]
  ctx.save()
  ctx.globalAlpha = alpha
  ctx.shadowColor = look.main
  ctx.shadowBlur = 14
  const fill = ctx.createRadialGradient(cx, cy, 0, cx, cy, r)
  fill.addColorStop(0, look.dark)
  fill.addColorStop(1, '#0c0920')
  ctx.fillStyle = fill
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill()
  ctx.shadowBlur = 0
  ctx.strokeStyle = look.main
  const spin = calm ? 0 : t * (kind === 'defense' ? -1.2 : 1.2)
  if (kind === 'heal') {
    // A ring of dashes.
    ctx.lineWidth = r * 0.16
    ctx.setLineDash([r * 0.5, r * 0.3])
    ctx.lineDashOffset = -spin * r
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke()
    ctx.setLineDash([])
  } else if (kind === 'attack') {
    // A plain ring with spikes.
    ctx.lineWidth = r * 0.14
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke()
    ctx.fillStyle = look.main
    for (let i = 0; i < 8; i++) {
      const a = spin + (i / 8) * Math.PI * 2
      ctx.beginPath()
      ctx.moveTo(cx + Math.cos(a - 0.17) * r, cy + Math.sin(a - 0.17) * r)
      ctx.lineTo(cx + Math.cos(a) * r * 1.3, cy + Math.sin(a) * r * 1.3)
      ctx.lineTo(cx + Math.cos(a + 0.17) * r, cy + Math.sin(a + 0.17) * r)
      ctx.fill()
    }
  } else {
    // Two rings, the outer one broken into arcs.
    ctx.lineWidth = r * 0.13
    ctx.beginPath(); ctx.arc(cx, cy, r * 0.8, 0, Math.PI * 2); ctx.stroke()
    ctx.lineWidth = r * 0.17
    for (let i = 0; i < 4; i++) {
      const a = spin + (i / 4) * Math.PI * 2
      ctx.beginPath(); ctx.arc(cx, cy, r * 1.08, a, a + Math.PI / 3); ctx.stroke()
    }
  }
  unflip(cx, cy, () => pickupIcon(ctx, kind, r * 0.7, '#fff'))
  ctx.restore()
}

export function drawDuel(ctx: Ctx, fx: Fx, s: DuelState, w: number, h: number, dpr: number, shake: number, flip: boolean) {
  // Leave room on both sides for the coloured strips outside the arena.
  const scale = Math.min(w / (ARENA_W + 2 * SIDE), h / ARENA_H)
  const bx = (w - ARENA_W * scale) / 2
  const by = (h - ARENA_H * scale) / 2
  const sx = (Math.random() - 0.5) * shake
  const sy = (Math.random() - 0.5) * shake
  const X = (x: number) => bx + sx + x * scale
  const Y = (y: number) => by + sy + y * scale
  const { theme, look, t } = fx
  const calm = look.reduceMotion

  if (!fx.floor || fx.floor.w !== w || fx.floor.h !== h || fx.floor.dpr !== dpr) {
    const canvas = fx.floor?.canvas ?? document.createElement('canvas')
    canvas.width = Math.round(w * dpr)
    canvas.height = Math.round(h * dpr)
    const fc = canvas.getContext('2d')
    if (fc) {
      fc.setTransform(dpr, 0, 0, dpr, 0, 0)
      paintFloor(fc, fx, w, h, scale, bx, by)
    }
    fx.floor = { canvas, w, h, dpr }
  }
  fx.hatch ??= hatchPattern(ctx)

  ctx.clearRect(0, 0, w, h)
  ctx.fillStyle = '#0c0920'
  ctx.fillRect(X(0), Y(0), ARENA_W * scale, ARENA_H * scale)
  ctx.drawImage(fx.floor.canvas, sx, sy, w, h)

  const aw = ARENA_W * s.arena
  const ah = ARENA_H * s.arena
  const ix = X((ARENA_W - aw) / 2)
  const iy = Y((ARENA_H - ah) / 2)

  if (!calm) {
    // A slow band of light sweeping across the floor.
    ctx.save()
    ctx.beginPath(); ctx.rect(ix, iy, aw * scale, ah * scale); ctx.clip()
    const p = (t * 0.15) % 1.6 - 0.3
    const band = ctx.createLinearGradient(X(0), Y(0), X(ARENA_W), Y(ARENA_H))
    for (const [o, a] of [[-0.1, 0], [0, 0.04], [0.1, 0]] as const) band.addColorStop(Math.min(1, Math.max(0, p + o)), `rgba(255, 255, 255, ${a})`)
    ctx.fillStyle = band
    ctx.fillRect(ix, iy, aw * scale, ah * scale)
    ctx.restore()
  }

  // The closed-off ring turns into a danger zone.
  if (s.arena < 1) {
    ctx.save()
    ctx.beginPath()
    ctx.rect(X(0), Y(0), ARENA_W * scale, ARENA_H * scale)
    ctx.rect(ix, iy, aw * scale, ah * scale)
    ctx.clip('evenodd')
    ctx.fillStyle = 'rgba(10, 4, 20, 0.55)'
    ctx.fillRect(X(0), Y(0), ARENA_W * scale, ARENA_H * scale)
    if (fx.hatch) {
      ctx.globalAlpha = calm ? 0.45 : 0.35 + 0.18 * Math.sin(t * 5)
      ctx.fillStyle = fx.hatch
      ctx.fillRect(X(0), Y(0), ARENA_W * scale, ARENA_H * scale)
    }
    ctx.restore()
  }

  // Centre line and circle, breathing gently.
  ctx.strokeStyle = `rgba(255, 255, 255, ${calm ? 0.08 : 0.07 + 0.04 * Math.sin(t * 2)})`
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.moveTo(ix, Y(ARENA_H / 2))
  ctx.lineTo(ix + aw * scale, Y(ARENA_H / 2))
  ctx.stroke()
  ctx.beginPath()
  ctx.arc(X(ARENA_W / 2), Y(ARENA_H / 2), Math.min(aw, ah) * 0.18 * scale, 0, Math.PI * 2)
  ctx.stroke()
  ctx.save()
  ctx.strokeStyle = s.arena < 1 ? '#ff5a5a' : theme.rim
  ctx.lineWidth = 2
  if (s.arena < 1) { ctx.shadowColor = '#ff3a4a'; ctx.shadowBlur = 12 }
  ctx.strokeRect(ix, iy, aw * scale, ah * scale)
  ctx.restore()

  // Drifting embers, dust or stars.
  for (const m of fx.motes) {
    const a = theme.kind === 'dark' ? 0.15 + 0.4 * Math.abs(Math.sin(t * 1.5 + m.ph)) : 0.15 + 0.22 * Math.sin(t * 2 + m.ph)
    ctx.fillStyle = `rgba(${theme.mote}, ${Math.max(0.05, a)})`
    ctx.beginPath()
    ctx.arc(X(m.x), Y(m.y), m.r * scale, 0, Math.PI * 2)
    ctx.fill()
  }

  const unflip = (x: number, y: number, draw: () => void) => {
    ctx.save()
    ctx.translate(x, y)
    if (flip) ctx.rotate(Math.PI)
    draw()
    ctx.restore()
  }

  // Trails, afterimages and shockwaves sit under the fighters.
  for (const p of fx.particles) {
    const k = p.life / p.max
    if (p.kind === 'trail') {
      ctx.fillStyle = p.color
      ctx.globalAlpha = k * 0.5
      ctx.beginPath(); ctx.arc(X(p.x), Y(p.y), p.r * k * scale, 0, Math.PI * 2); ctx.fill()
    } else if (p.kind === 'ghost') {
      ctx.fillStyle = p.color
      ctx.globalAlpha = k * 0.4
      ctx.beginPath(); ctx.arc(X(p.x), Y(p.y), p.r * scale, 0, Math.PI * 2); ctx.fill()
    } else if (p.kind === 'ring') {
      ctx.strokeStyle = p.color
      ctx.globalAlpha = k * 0.8
      ctx.lineWidth = 3
      ctx.beginPath(); ctx.arc(X(p.x), Y(p.y), p.r * (1 - k * 0.7) * scale, 0, Math.PI * 2); ctx.stroke()
    }
  }
  ctx.globalAlpha = 1

  for (const p of s.projectiles) {
    const color = COLORS[s.fighters[p.owner].court]
    if (p.kind === 'lob') {
      const start = fx.lobStart.get(p) ?? p.ttl
      const k = Math.min(1, Math.max(0, 1 - p.ttl / start))
      const [tx, ty] = [X(p.target.x), Y(p.target.y)]
      // The landing spot darkens and tightens as the shot comes down.
      ctx.fillStyle = `rgba(0, 0, 0, ${0.1 + 0.25 * k})`
      ctx.beginPath(); ctx.arc(tx, ty, 0.9 * scale * (0.4 + 0.6 * k), 0, Math.PI * 2); ctx.fill()
      ctx.strokeStyle = `rgba(255, 255, 255, ${0.25 + 0.4 * k})`
      ctx.lineWidth = 1.5
      ctx.beginPath(); ctx.arc(tx, ty, 0.9 * scale, 0, Math.PI * 2); ctx.stroke()
      const lift = Math.sin(k * Math.PI) * 0.9
      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)'
      ctx.beginPath(); ctx.ellipse(X(p.pos.x), Y(p.pos.y) + 2, 0.13 * scale, 0.07 * scale, 0, 0, Math.PI * 2); ctx.fill()
      ctx.save()
      ctx.shadowColor = color; ctx.shadowBlur = 10
      ctx.fillStyle = color
      ctx.beginPath(); ctx.arc(X(p.pos.x), Y(p.pos.y - lift), (0.15 + 0.05 * Math.sin(k * Math.PI)) * scale, 0, Math.PI * 2); ctx.fill()
      ctx.restore()
    } else {
      ctx.save()
      ctx.shadowColor = color; ctx.shadowBlur = 10
      ctx.fillStyle = color
      ctx.beginPath(); ctx.arc(X(p.pos.x), Y(p.pos.y), 0.15 * scale, 0, Math.PI * 2); ctx.fill()
      ctx.restore()
    }
  }

  // Bonus orbs fade in, wait, then fade out before they vanish.
  for (const o of s.pickups) {
    const age = s.t - o.born
    const alpha = Math.min(1, age / 0.4, (PICKUP_LIFE - age) / 0.6)
    const pop = calm ? 1 : 0.6 + 0.4 * Math.min(1, age / 0.4)
    const bob = calm ? 0 : Math.sin(t * 4 + o.id) * 0.05
    drawOrb(ctx, o.kind, X(o.pos.x), Y(o.pos.y + bob), PICKUP_RADIUS * 0.9 * pop * scale, t, Math.max(0, alpha), calm, unflip)
  }

  const intro = Math.min(1, t / INTRO)
  const slide = 1 - (1 - intro) ** 3
  s.fighters.forEach((f, i) => {
    const bob = calm ? 0 : Math.sin(t * 3 + i * 2) * 0.04
    const rec = fx.recoil[i]
    const px = f.pos.x + rec.x
    const py = f.pos.y + rec.y + bob + (1 - slide) * (i === 0 ? 3 : -3)
    const cx = X(px)
    const cy = Y(py)
    const r = f.radius * (calm ? 1 : 1 + 0.025 * Math.sin(t * 3 + i * 2)) * scale
    ctx.globalAlpha = 0.4 + 0.6 * slide
    // Soft shadow on the floor.
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)'
    ctx.beginPath(); ctx.ellipse(X(f.pos.x + rec.x), Y(f.pos.y + rec.y) + r * 0.7, r * 0.95, r * 0.4, 0, 0, Math.PI * 2); ctx.fill()
    ctx.save()
    ctx.shadowColor = COLORS[f.court]
    ctx.shadowBlur = 14
    ctx.fillStyle = COLORS[f.court]
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill()
    ctx.restore()
    // The medallion greys out one pane per eighth of HP lost, as on the board.
    const fresh = iconFor(f.role, f.court, lostPanes(f.hp, f.maxHp))
    if (fresh.complete && fresh.naturalWidth) fx.lastIcon[i] = fresh
    const icon = fx.lastIcon[i]
    if (icon) {
      // Keep the medallion upright on screen when the whole canvas is turned for the defender.
      unflip(cx, cy, () => ctx.drawImage(icon, -r, -r, r * 2, r * 2))
    }
    if (fx.flash[i] > 0) {
      ctx.fillStyle = `rgba(255, 255, 255, ${Math.min(1, fx.flash[i] / 0.18) * 0.75})`
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill()
    }
    if (f.hp > 0 && f.hp / f.maxHp <= 0.34) {
      ctx.strokeStyle = `rgba(255, 70, 80, ${0.35 + 0.35 * Math.sin(t * 8)})`
      ctx.lineWidth = 3
      ctx.beginPath(); ctx.arc(cx, cy, r + 4, 0, Math.PI * 2); ctx.stroke()
    }
    ctx.globalAlpha = 1
    // The aim pointer: an arrowhead with pulsing chevrons running out to it. It dims while the attack recharges
    // and stretches and glows as a charge builds.
    const power = Math.min(1, f.charge)
    ctx.save()
    ctx.translate(cx, cy)
    ctx.rotate(f.facing)
    ctx.globalAlpha = f.cooldown > 0 ? 0.4 : 1
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.shadowColor = COLORS[f.court]
    ctx.shadowBlur = 6 + 12 * power
    ctx.strokeStyle = '#fff'
    ctx.lineWidth = 2.5
    for (let j = 0; j < 2; j++) {
      const x = r * (1.1 + j * 0.22)
      ctx.globalAlpha = (f.cooldown > 0 ? 0.4 : 1) * (calm ? 0.6 : 0.25 + 0.55 * (0.5 + 0.5 * Math.sin(t * 7 - j * 1.6)))
      ctx.beginPath(); ctx.moveTo(x - r * 0.1, -r * 0.24); ctx.lineTo(x + r * 0.08, 0); ctx.lineTo(x - r * 0.1, r * 0.24); ctx.stroke()
    }
    ctx.globalAlpha = f.cooldown > 0 ? 0.4 : 1
    const base = r * 1.5
    const tip = base + r * (0.55 + 0.5 * power)
    ctx.fillStyle = power > 0.95 ? COLORS[f.court] : '#fff'
    ctx.strokeStyle = '#120d2a'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.moveTo(tip, 0); ctx.lineTo(base, -r * 0.4); ctx.lineTo(base + (tip - base) * 0.3, 0); ctx.lineTo(base, r * 0.4); ctx.closePath()
    ctx.fill(); ctx.stroke()
    if (look.assistSide === i) {
      // A faint dotted line carries the aim across the arena.
      ctx.setLineDash([r * 0.3, r * 0.45])
      ctx.globalAlpha = f.cooldown > 0 ? 0.2 : 0.45
      ctx.strokeStyle = '#fff'
      ctx.lineWidth = 2
      ctx.beginPath(); ctx.moveTo(tip + r * 0.4, 0); ctx.lineTo(Math.max(ARENA_W, ARENA_H) * scale, 0); ctx.stroke()
    }
    ctx.restore()
    ctx.strokeStyle = '#fff'
    ctx.lineWidth = 3
    if (f.charge > 0) {
      ctx.beginPath()
      ctx.arc(cx, cy, r + 0.2 * scale, -Math.PI / 2, -Math.PI / 2 + Math.min(1, f.charge) * Math.PI * 2)
      ctx.stroke()
    }
    // Each active benefit rings the fighter, shrinking away as its time runs out.
    let ringIdx = 0
    for (const kind of PICKUP_KINDS) {
      const left = f.buffs[kind]
      if (left <= 0) continue
      ctx.save()
      ctx.strokeStyle = PICKUP_LOOK[kind].main
      ctx.shadowColor = PICKUP_LOOK[kind].main
      ctx.shadowBlur = 8
      ctx.lineWidth = 3
      ctx.globalAlpha = left < 0.7 && !calm ? 0.4 + 0.4 * Math.sin(t * 24) : 0.95
      ctx.beginPath()
      ctx.arc(cx, cy, r + 0.07 * scale + ringIdx * 5, -Math.PI / 2, -Math.PI / 2 + Math.min(1, left / BUFF_SECONDS) * Math.PI * 2)
      ctx.stroke()
      ctx.restore()
      ringIdx++
    }
    // The HP bar curves around the fighter, on a larger circle behind it (opposite the way it faces).
    const span = Math.PI * 0.62
    const from = f.facing + Math.PI - span / 2
    const barR = r + 0.42 * scale
    ctx.lineWidth = 6
    ctx.lineCap = 'round'
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.85)'
    ctx.beginPath(); ctx.arc(cx, cy, barR, from, from + span); ctx.stroke()
    const left = Math.max(0, f.hp / f.maxHp)
    if (left > 0) {
      ctx.lineWidth = 3.5
      ctx.strokeStyle = '#6fe08a'
      ctx.beginPath(); ctx.arc(cx, cy, barR, from, from + span * left); ctx.stroke()
    }
    ctx.lineCap = 'butt'
  })

  // Sparks and damage numbers land on top.
  for (const p of fx.particles) {
    const k = p.life / p.max
    if (p.kind === 'spark') {
      ctx.fillStyle = p.color
      ctx.globalAlpha = k
      ctx.beginPath(); ctx.arc(X(p.x), Y(p.y), p.r * scale, 0, Math.PI * 2); ctx.fill()
    } else if (p.kind === 'text' && p.text) {
      ctx.globalAlpha = Math.min(1, k * 1.5)
      unflip(X(p.x), Y(p.y), () => {
        ctx.font = `800 ${Math.round(scale * (fx.look.assistSide !== undefined && p.color === '#ff8088' ? 0.85 : 0.55))}px system-ui, sans-serif`
        ctx.textAlign = 'center'
        ctx.lineWidth = 4
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.8)'
        ctx.strokeText(p.text!, 0, 0)
        ctx.fillStyle = p.color
        ctx.fillText(p.text!, 0, 0)
      })
    }
  }
  ctx.globalAlpha = 1

  // Vignette, then the opening call.
  const vg = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.hypot(w, h) * 0.55)
  vg.addColorStop(0, 'rgba(0, 0, 0, 0)')
  vg.addColorStop(1, 'rgba(0, 0, 0, 0.6)')
  ctx.fillStyle = vg
  ctx.fillRect(0, 0, w, h)
  if (fx.call > 0.1 && fx.call < 1) {
    const k = (fx.call - 0.1) / 0.9
    ctx.globalAlpha = k < 0.2 ? k / 0.2 : 1 - (k - 0.2) / 0.8
    unflip(w / 2, h / 2, () => {
      const pop = calm ? 1 : 1.4 - 0.4 * Math.min(1, k * 5)
      ctx.font = `900 ${Math.round(scale * 1.3 * pop)}px system-ui, sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.lineWidth = 6
      ctx.strokeStyle = 'rgba(12, 9, 32, 0.9)'
      ctx.shadowColor = theme.rim
      ctx.shadowBlur = 20
      ctx.strokeText('FIGHT!', 0, 0)
      ctx.fillStyle = '#f6ecc9'
      ctx.fillText('FIGHT!', 0, 0)
    })
    ctx.globalAlpha = 1
  }
}
