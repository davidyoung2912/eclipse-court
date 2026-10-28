/** Web Audio synthesis: no samples are shipped. Everything is created lazily after the first user gesture. */

const MUTE_KEY = 'eclipse-court:muted'

let ctx: AudioContext | null = null
let master: GainNode | null = null
let sfxOut: GainNode | null = null
let musicOut: GainNode | null = null
let muted = readMuted()

/** Sound is off until the player turns it on. */
function readMuted(): boolean {
  try {
    return localStorage.getItem(MUTE_KEY) !== '0'
  } catch {
    return true
  }
}

export const isMuted = () => muted

const VOLUME_KEY = 'eclipse-court:volume'
const level = (v: unknown) => (typeof v === 'number' && v >= 0 && v <= 1 ? v : 1)
const volumes = readVolumes()

function readVolumes(): { sfx: number; music: number } {
  try {
    const o = JSON.parse(localStorage.getItem(VOLUME_KEY) ?? 'null') as { sfx?: unknown; music?: unknown } | null
    return { sfx: level(o?.sfx), music: level(o?.music) }
  } catch {
    return { sfx: 1, music: 1 }
  }
}

export const getVolumes = () => ({ ...volumes })

/** Sets the effects and/or music loudness, each from 0 to 1. */
export function setVolumes(patch: Partial<typeof volumes>) {
  if (patch.sfx !== undefined) volumes.sfx = level(patch.sfx)
  if (patch.music !== undefined) volumes.music = level(patch.music)
  try {
    localStorage.setItem(VOLUME_KEY, JSON.stringify(volumes))
  } catch {
    // The levels only last for this session if storage is unavailable.
  }
  if (ctx && sfxOut && musicOut) {
    sfxOut.gain.setTargetAtTime(volumes.sfx, ctx.currentTime, 0.03)
    musicOut.gain.setTargetAtTime(volumes.music, ctx.currentTime, 0.03)
  }
}

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
  sfxOut = ctx.createGain()
  sfxOut.gain.value = volumes.sfx
  sfxOut.connect(master)
  musicOut = ctx.createGain()
  musicOut.gain.value = volumes.music
  musicOut.connect(master)
  return ctx
}

/** Call from a pointer or key event so browsers allow sound to start. */
export function unlockAudio() {
  const c = audio()
  if (c && c.state === 'suspended') void c.resume()
}

/** The equipped sound pack: a pitch ratio and a wave that replaces the plain tones'. */
let voice: { pitch: number; wave?: OscillatorType } = { pitch: 1 }

export function setVoice(v: { pitch: number; wave?: OscillatorType }) {
  voice = v
}

function tone(freq: number, dur: number, opts: { type?: OscillatorType; gain?: number; delay?: number; to?: number } = {}) {
  const c = audio()
  if (!c || !sfxOut || muted) return
  freq *= voice.pitch
  if (opts.to) opts = { ...opts, to: opts.to * voice.pitch }
  if (voice.wave && opts.type !== 'sawtooth') opts = { ...opts, type: voice.wave }
  const t = c.currentTime + (opts.delay ?? 0)
  const o = c.createOscillator()
  const g = c.createGain()
  o.type = opts.type ?? 'sine'
  o.frequency.setValueAtTime(freq, t)
  if (opts.to) o.frequency.exponentialRampToValueAtTime(opts.to, t + dur)
  g.gain.setValueAtTime(0, t)
  g.gain.linearRampToValueAtTime(opts.gain ?? 0.2, t + 0.005)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  o.connect(g).connect(sfxOut)
  o.start(t)
  o.stop(t + dur + 0.05)
}

function noise(dur: number, opts: { gain?: number; freq?: number; delay?: number } = {}) {
  const c = audio()
  if (!c || !sfxOut || muted) return
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
  src.connect(f).connect(g).connect(sfxOut)
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
  /** A quick two-note chime when a duel orb is collected. */
  pickup: () => [0, 1].forEach((i) => tone(880 * Math.pow(1.5, i), 0.14, { type: 'triangle', gain: 0.12, delay: i * 0.06 })),
  tick: () => tone(1320, 0.05, { type: 'triangle', gain: 0.1 }),
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
  /** A rising sting for the n-th capture in a row. */
  streak: (count: number) =>
    [0, 1, 2].forEach((i) => tone(440 * Math.pow(1.122, Math.min(count, 6) * 2 + i * 4), 0.3, { type: 'triangle', gain: 0.12, delay: i * 0.06 })),
  /** The Eclipse falls: a deep swell and a hush. */
  eclipse: () => {
    tone(55, 1.8, { gain: 0.3, to: 36 })
    tone(110, 1.8, { type: 'triangle', gain: 0.12, to: 73 })
    noise(1.2, { gain: 0.08, freq: 300 })
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
  beat()
  return {
    setIntensity: (n) => { intensity = Math.min(1, Math.max(0, n)) },
    stop: () => window.clearTimeout(timer),
  }
}

const MUSIC_KEY = 'eclipse-court:music'

let music = readMusic()

/** Music plays whenever sound is on, unless the player has turned it off. */
function readMusic(): boolean {
  try {
    return localStorage.getItem(MUSIC_KEY) !== '0'
  } catch {
    return true
  }
}

export const isMusicOn = () => music

export function setMusicOn(value: boolean) {
  music = value
  try {
    localStorage.setItem(MUSIC_KEY, value ? '1' : '0')
  } catch {
    // The preference only lasts for this session if storage is unavailable.
  }
}

/**
 * A quiet bed of layers that builds as `setLevel` rises from 0 to 1: a drone, a fifth above it, a shimmer, and a
 * pulse that appears at the halfway mark and quickens toward the Eclipse. Returns a stop function.
 */
export function startMusic(): { setLevel: (n: number) => void; stop: () => void } {
  const c = audio()
  if (!c || !musicOut || !music) return { setLevel: () => {}, stop: () => {} }
  const bus = c.createGain()
  bus.gain.value = 0
  bus.gain.setTargetAtTime(1, c.currentTime, 1.5)
  bus.connect(musicOut)
  const layer = (freq: number, type: OscillatorType, base: number) => {
    const o = c.createOscillator()
    const g = c.createGain()
    o.type = type
    o.frequency.value = freq
    g.gain.value = 0
    o.connect(g).connect(bus)
    o.start()
    return { o, g, base }
  }
  const drone = layer(55, 'sine', 0.05)
  const fifth = layer(82.41, 'triangle', 0.035)
  const shimmer = layer(659.25, 'sine', 0.018)
  // The shimmer breathes slowly.
  const lfo = c.createOscillator()
  const depth = c.createGain()
  depth.gain.value = 0.012
  lfo.frequency.value = 0.2
  lfo.connect(depth).connect(shimmer.g.gain)
  lfo.start()
  let level = 0
  let timer = 0
  const apply = () => {
    const t = c.currentTime
    drone.g.gain.setTargetAtTime(drone.base * (0.6 + level * 0.8), t, 0.8)
    fifth.g.gain.setTargetAtTime(fifth.base * Math.min(1, level * 2), t, 0.8)
    shimmer.g.gain.setTargetAtTime(shimmer.base * Math.max(0, level * 1.6 - 0.2), t, 0.8)
    drone.o.frequency.setTargetAtTime(55 * (1 - level * 0.12), t, 2)
  }
  const pulse = () => {
    if (level > 0.5 && !muted) tone(55, 0.3, { gain: 0.08 + level * 0.08, to: 40 })
    timer = window.setTimeout(pulse, 1100 - level * 500)
  }
  apply()
  pulse()
  return {
    setLevel: (n) => {
      level = Math.min(1, Math.max(0, n))
      apply()
    },
    stop: () => {
      window.clearTimeout(timer)
      bus.gain.setTargetAtTime(0, c.currentTime, 0.3)
      window.setTimeout(() => {
        for (const l of [drone, fifth, shimmer]) l.o.stop()
        lfo.stop()
        bus.disconnect()
      }, 1500)
    },
  }
}
