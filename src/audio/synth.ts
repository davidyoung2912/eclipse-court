/** Web Audio synthesis: no samples are shipped. Everything is created lazily after the first user gesture. */

const MUTE_KEY = 'eclipse-court:muted'

let ctx: AudioContext | null = null
let master: GainNode | null = null
let padGain: GainNode | null = null
let padFilter: BiquadFilterNode | null = null
let padOscs: OscillatorNode[] = []
let muted = readMuted()

function readMuted(): boolean {
  try {
    return localStorage.getItem(MUTE_KEY) === '1'
  } catch {
    return false
  }
}

export const isMuted = () => muted

export function setMuted(value: boolean) {
  muted = value
  try {
    localStorage.setItem(MUTE_KEY, value ? '1' : '0')
  } catch {
    // The preference only lasts for this session if storage is unavailable.
  }
  if (ctx && master) master.gain.setTargetAtTime(value ? 0 : 0.8, ctx.currentTime, 0.05)
}

function audio(): AudioContext | null {
  if (ctx) return ctx
  const Ctor = typeof window === 'undefined' ? undefined : (window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext)
  if (!Ctor) return null
  ctx = new Ctor()
  master = ctx.createGain()
  master.gain.value = muted ? 0 : 0.8
  master.connect(ctx.destination)
  return ctx
}

/** Call from a pointer or key event so browsers allow sound to start. */
export function unlockAudio() {
  const c = audio()
  if (c && c.state === 'suspended') void c.resume()
}

/** Semitone offsets of the pad chord above its root. */
const MAJOR = [0, 4, 7, 12]
const MINOR = [0, 3, 7, 12]
const SUS = [0, 5, 7, 12]
const midiToHz = (m: number) => 440 * Math.pow(2, (m - 69) / 12)

/** Pad chord frequencies for a luminance: bright is a high major chord, dark a low minor one, dusk is suspended. */
export function padChord(lum: number): number[] {
  const shape = lum > 0 ? MAJOR : lum < 0 ? MINOR : SUS
  const root = 52 + lum * 2
  return shape.map((s) => midiToHz(root + s))
}

/** Cutoff of the pad filter: light opens the sound, dark muffles it. */
export const padCutoff = (lum: number) => 700 + lum * 350

export function startPad() {
  const c = audio()
  if (!c || !master || padOscs.length) return
  padGain = c.createGain()
  padGain.gain.value = 0
  padGain.gain.setTargetAtTime(0.05, c.currentTime, 1.5)
  padFilter = c.createBiquadFilter()
  padFilter.type = 'lowpass'
  padFilter.frequency.value = padCutoff(0)
  padFilter.connect(padGain).connect(master)
  padOscs = padChord(0).map((f, i) => {
    const o = c.createOscillator()
    o.type = i % 2 ? 'triangle' : 'sawtooth'
    o.frequency.value = f
    o.detune.value = (i - 1.5) * 6
    o.connect(padFilter!)
    o.start()
    return o
  })
}

export function setPadLuminance(lum: number) {
  if (!ctx || !padFilter) return
  const t = ctx.currentTime
  padChord(lum).forEach((f, i) => padOscs[i]?.frequency.setTargetAtTime(f, t, 0.8))
  padFilter.frequency.setTargetAtTime(padCutoff(lum), t, 0.8)
}

/** Lower the pad under duel percussion. */
export function duckPad(on: boolean) {
  if (ctx && padGain) padGain.gain.setTargetAtTime(on ? 0.015 : 0.05, ctx.currentTime, 0.3)
}

function tone(freq: number, dur: number, opts: { type?: OscillatorType; gain?: number; delay?: number; to?: number } = {}) {
  const c = audio()
  if (!c || !master || muted) return
  const t = c.currentTime + (opts.delay ?? 0)
  const o = c.createOscillator()
  const g = c.createGain()
  o.type = opts.type ?? 'sine'
  o.frequency.setValueAtTime(freq, t)
  if (opts.to) o.frequency.exponentialRampToValueAtTime(opts.to, t + dur)
  g.gain.setValueAtTime(0, t)
  g.gain.linearRampToValueAtTime(opts.gain ?? 0.2, t + 0.005)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  o.connect(g).connect(master)
  o.start(t)
  o.stop(t + dur + 0.05)
}

function noise(dur: number, opts: { gain?: number; freq?: number; delay?: number } = {}) {
  const c = audio()
  if (!c || !master || muted) return
  const t = c.currentTime + (opts.delay ?? 0)
  const buf = c.createBuffer(1, Math.max(1, Math.floor(c.sampleRate * dur)), c.sampleRate)
  const data = buf.getChannelData(0)
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
  const src = c.createBufferSource()
  src.buffer = buf
  const f = c.createBiquadFilter()
  f.type = 'bandpass'
  f.frequency.value = opts.freq ?? 1500
  const g = c.createGain()
  g.gain.setValueAtTime(opts.gain ?? 0.2, t)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  src.connect(f).connect(g).connect(master)
  src.start(t)
}

/** Bell partials: Solari rings bright and short, Umbral tolls low and long. */
function bell(root: number, court: 'solari' | 'umbral', delay: number) {
  const ratios = court === 'solari' ? [1, 2.76, 5.4] : [1, 2.4, 3.9]
  const dur = court === 'solari' ? 1.4 : 2.2
  ratios.forEach((r, i) => tone(root * r, dur / (1 + i * 0.6), { gain: 0.14 / (1 + i), delay }))
}

/** Three-note motif: Solari climbs, Umbral falls. */
export function turnBell(court: 'solari' | 'umbral') {
  const notes = court === 'solari' ? [523.25, 659.25, 783.99] : [196, 164.81, 130.81]
  notes.forEach((n, i) => bell(n, court, i * 0.16))
}

export const sfx = {
  select: () => tone(660, 0.06, { type: 'triangle', gain: 0.08 }),
  move: () => {
    tone(240, 0.09, { type: 'triangle', gain: 0.16, to: 160 })
    noise(0.04, { gain: 0.05, freq: 3000 })
  },
  cast: () => [0, 1, 2, 3].forEach((i) => tone(660 * Math.pow(1.26, i), 0.35, { gain: 0.1, delay: i * 0.07 })),
  duelStart: () => {
    tone(98, 0.6, { type: 'sawtooth', gain: 0.12, to: 55 })
    noise(0.3, { gain: 0.1, freq: 400 })
  },
  swing: () => noise(0.12, { gain: 0.12, freq: 2200 }),
  shoot: () => tone(900, 0.12, { type: 'square', gain: 0.07, to: 300 }),
  slam: () => {
    tone(80, 0.35, { gain: 0.35, to: 38 })
    noise(0.2, { gain: 0.2, freq: 250 })
  },
  hit: (damage: number) => {
    tone(160 + damage * 20, 0.18, { type: 'square', gain: 0.18, to: 70 })
    noise(0.1, { gain: 0.15 + Math.min(0.15, damage * 0.04), freq: 1200 })
  },
  win: () => [523.25, 659.25, 783.99, 1046.5].forEach((n, i) => tone(n, 0.8, { gain: 0.14, delay: i * 0.12 })),
  lose: () => [329.63, 261.63, 196, 130.81].forEach((n, i) => tone(n, 1, { type: 'triangle', gain: 0.16, delay: i * 0.18 })),
}

/** A steady kick that quickens as the duel runs on; returns a stop function. */
export function startDuelDrums(): { setIntensity: (n: number) => void; stop: () => void } {
  let intensity = 0
  let timer = 0
  const beat = () => {
    tone(70, 0.25, { gain: 0.25, to: 42 })
    if (intensity > 0) noise(0.05, { gain: 0.05, freq: 6000, delay: 0.25 })
    timer = window.setTimeout(beat, 520 - intensity * 220)
  }
  duckPad(true)
  beat()
  return {
    setIntensity: (n) => { intensity = Math.min(1, Math.max(0, n)) },
    stop: () => {
      window.clearTimeout(timer)
      duckPad(false)
    },
  }
}
