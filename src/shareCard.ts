/** Share cards: a picture of a game's final position that can be saved or sent, and a short clip of the whole game. */
import type { GameRecord, Step } from './engine/log'
import { replaySteps } from './engine/log'
import { isBeacon, isBlocked, samePos, sizeOf } from './engine/rules/board'
import { squareLuminance } from './engine/rules/luminance'
import { MODE_INFO, modeOf, objectiveGoal } from './engine/rules/events'
import type { CellEffect, Court, GameState, MatchConfig, Role } from './engine/rules/types'

export const CARD_SIZE = 600

const LETTER: Record<Role, string> = {
  leader: 'L', aura: 'A', bruiser: 'B', charger: 'C', marksman: 'M', flier: 'F', footsoldier: 'S',
}

const CELL_COLOR: Record<CellEffect, string> = {
  might: '#e8654a', ward: '#4f9fe8', recovery: '#5ec27a', hazard: '#b03a8c', silence: '#9fb4c8', invincible: '#e8b64a',
}

/** Everything the card says in words, separate from the drawing so it can be tested. */
export interface CardModel {
  headline: string
  detail: string
  tags: string[]
}

/** The rules that set a match apart, as short tags. */
export function ruleTags(config: MatchConfig): string[] {
  const tags: string[] = [config.objective ? objectiveGoal(config.objective) : MODE_INFO[modeOf(config)].name]
  tags.push(sizeOf(config) === 9 ? 'Grand 9x9' : '7x7')
  if (config.cells?.length) tags.push('Cells')
  if (config.events) tags.push('Day events')
  if (config.showdown) tags.push('Showdown')
  if (config.fog) tags.push('Fog')
  if (config.suddenDeath) tags.push('Sudden death')
  if (config.turnClock) tags.push('Blitz')
  if (config.growth) tags.push('Veterancy')
  if (config.promotion) tags.push('Promotion')
  if (config.reverse) tags.push('Reversed light')
  return tags
}

/** The words for a card: the result, what it cost, and the rules played. */
export function cardModel(steps: readonly Step[]): CardModel {
  const last = steps[steps.length - 1].state
  const moves = steps.length - 1
  const count = (c: Court) => last.pieces.filter((p) => p.court === c).length
  const headline = last.winner === 'draw' ? 'A drawn game'
    : last.winner ? `${last.winner === 'solari' ? 'Solari' : 'Umbral'} won`
      : 'Game in progress'
  return {
    headline,
    detail: `Round ${last.round}, ${moves} ${moves === 1 ? 'move' : 'moves'}. Solari ${count('solari')} left, Umbral ${count('umbral')} left.`,
    tags: ruleTags(last.config),
  }
}

/** Blend from Umbral indigo (-2) to Solari cream (+2), as the board does. */
export function lumRgb(lum: number): string {
  const t = (Math.max(-2, Math.min(2, lum)) + 2) / 4
  const mix = (a: number, b: number) => Math.round(a + (b - a) * t)
  return `rgb(${mix(0x2b, 0xfb)}, ${mix(0x24, 0xf1)}, ${mix(0x68, 0xd4)})`
}

/** Draws a position and its words onto a square canvas context of `CARD_SIZE`. */
export function drawCard(ctx: CanvasRenderingContext2D, state: GameState, model: CardModel): void {
  const size = sizeOf(state.config)
  const top = 110
  const pad = 30
  const cell = (CARD_SIZE - pad * 2) / size
  ctx.fillStyle = '#14102b'
  ctx.fillRect(0, 0, CARD_SIZE, CARD_SIZE)
  ctx.textBaseline = 'middle'
  ctx.textAlign = 'left'
  ctx.fillStyle = '#e8b64a'
  ctx.font = '700 15px system-ui, sans-serif'
  ctx.fillText('ECLIPSE COURT', pad, 24)
  ctx.fillStyle = '#f4eefc'
  ctx.font = '800 32px system-ui, sans-serif'
  ctx.fillText(model.headline, pad, 58)
  ctx.fillStyle = '#c9bfe6'
  ctx.font = '500 14px system-ui, sans-serif'
  ctx.fillText(model.detail, pad, 88)

  // The board is squeezed into the room under the heading.
  const room = CARD_SIZE - top - 56
  const step = Math.min(cell, room / size)
  const left = (CARD_SIZE - step * size) / 2
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const p = { x, y }
      const px = left + x * step
      const py = top + y * step
      ctx.fillStyle = isBlocked(state.config, p) ? '#0a0818' : lumRgb(squareLuminance(state, p))
      ctx.fillRect(px, py, step - 2, step - 2)
      const fx = state.config.cells?.find((c) => samePos(c.pos, p))
      if (fx) {
        ctx.strokeStyle = CELL_COLOR[fx.effect]
        ctx.lineWidth = 3
        ctx.strokeRect(px + 3, py + 3, step - 8, step - 8)
      }
      if (isBeacon(p, state.config.beacons)) {
        ctx.fillStyle = '#e8b64a'
        ctx.beginPath()
        ctx.arc(px + (step - 2) / 2, py + (step - 2) / 2, step * 0.1, 0, Math.PI * 2)
        ctx.fill()
      }
    }
  }
  for (const piece of state.pieces) {
    const cx = left + piece.pos.x * step + (step - 2) / 2
    const cy = top + piece.pos.y * step + (step - 2) / 2
    ctx.fillStyle = piece.court === 'solari' ? '#e8b64a' : '#7a5cc8'
    ctx.strokeStyle = piece.court === 'solari' ? '#5a3f0a' : '#f4eefc'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(cx, cy, step * 0.34, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
    ctx.fillStyle = piece.court === 'solari' ? '#2b1c00' : '#ffffff'
    ctx.font = `800 ${Math.round(step * 0.34)}px system-ui, sans-serif`
    ctx.textAlign = 'center'
    ctx.fillText(LETTER[piece.role], cx, cy + 1)
  }

  // Rule tags along the foot of the card.
  ctx.textAlign = 'left'
  ctx.font = '600 13px system-ui, sans-serif'
  let tx = pad
  const ty = CARD_SIZE - 26
  for (const tag of model.tags) {
    const w = ctx.measureText(tag).width + 18
    if (tx + w > CARD_SIZE - pad) break
    ctx.fillStyle = '#2b2468'
    ctx.fillRect(tx, ty - 12, w, 24)
    ctx.fillStyle = '#f4eefc'
    ctx.fillText(tag, tx + 9, ty)
    tx += w + 8
  }
}

/** The card for a finished record as a PNG blob, or null if the record is not a legal game or no canvas is available. */
export function cardImage(record: GameRecord): Promise<Blob | null> {
  const steps = replaySteps(record.initial, record.actions)
  if (!steps || typeof document === 'undefined') return Promise.resolve(null)
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = CARD_SIZE
  const ctx = canvas.getContext('2d')
  if (!ctx) return Promise.resolve(null)
  drawCard(ctx, steps[steps.length - 1].state, cardModel(steps))
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'))
}

const CLIP_FRAME_MS = 350
const CLIP_MAX_FRAMES = 120

/** Which positions a clip shows: every position for a short game, an even sample (always ending on the last) for a long one. */
export function clipFrames(count: number, max = CLIP_MAX_FRAMES): number[] {
  if (count <= max) return Array.from({ length: count }, (_, i) => i)
  return Array.from({ length: max }, (_, i) => Math.round((i * (count - 1)) / (max - 1)))
}

/** Whether this browser can record a canvas to a video. */
export const canRecordClip = () =>
  typeof MediaRecorder !== 'undefined' && typeof HTMLCanvasElement !== 'undefined' && typeof HTMLCanvasElement.prototype.captureStream === 'function'

/** A short video of the game played out on the card, recorded from a canvas without any library; null where unsupported. */
export async function cardClip(record: GameRecord): Promise<Blob | null> {
  const steps = replaySteps(record.initial, record.actions)
  if (!steps || !canRecordClip()) return null
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = CARD_SIZE
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  const final = cardModel(steps)
  const frames = clipFrames(steps.length)
  const recorder = new MediaRecorder(canvas.captureStream(30))
  const chunks: Blob[] = []
  recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data) }
  const stopped = new Promise<void>((resolve) => { recorder.onstop = () => resolve() })
  const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))
  recorder.start()
  for (const i of frames) {
    const state = steps[i].state
    drawCard(ctx, state, i === steps.length - 1 ? final : { ...final, headline: `Round ${state.round}`, detail: `Move ${i} of ${steps.length - 1}` })
    await wait(CLIP_FRAME_MS)
  }
  await wait(CLIP_FRAME_MS * 4)
  recorder.stop()
  await stopped
  return new Blob(chunks, { type: recorder.mimeType || 'video/webm' })
}
