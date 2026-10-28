import { useEffect, useState } from 'react'
import type { Role } from '../../engine/rules/types'
import { PieceArt } from '../../art/PieceArt'
import { IconShape, type IconName } from './icons'

/** Deterministic scatter so the sky is the same on every visit. */
/** Drifting motes, each with its own lane, speed and size. */
const MOTES = Array.from({ length: 12 }, (_, i) => ({ x: (i * 53.7) % 320, y: 20 + ((i * 37) % 110), r: 0.8 + (i % 3) * 0.5, d: 5 + (i % 5) * 1.6, o: -(i * 0.9) }))

const SKY = Array.from({ length: 28 }, (_, i) => ({
  x: (i * 47.3) % 320,
  y: (i * 29.1 + (i % 4) * 9) % 96,
  r: 0.5 + (i % 3) * 0.4,
}))

/** Twelve courses for a shooting star: where it enters (x, y), its heading in degrees (0 is right, 90 is down), how far it flies and for how long. */
const COURSES = [
  { x: -20, y: 8, a: 10, len: 360, s: 1.2 },
  { x: 340, y: 14, a: 172, len: 360, s: 1.2 },
  { x: 60, y: -10, a: 60, len: 150, s: 0.9 },
  { x: 260, y: -10, a: 118, len: 150, s: 0.9 },
  { x: -20, y: 78, a: -12, len: 350, s: 1.4 },
  { x: 340, y: 84, a: 192, len: 350, s: 1.4 },
  { x: 120, y: -10, a: 80, len: 120, s: 0.8 },
  { x: 200, y: -10, a: 100, len: 130, s: 0.8 },
  { x: -20, y: -5, a: 30, len: 260, s: 1.1 },
  { x: 340, y: -5, a: 150, len: 260, s: 1.1 },
  { x: 30, y: 52, a: -30, len: 200, s: 1 },
  { x: 300, y: 64, a: 210, len: 250, s: 1.1 },
]

/** A shooting star that flies one of the courses, rests a few seconds, then picks a different one at random. */
export function Shooter({ first }: { first: number }) {
  const [course, setCourse] = useState(first)
  const [run, setRun] = useState(0)
  useEffect(() => {
    const t = setTimeout(() => {
      setCourse((c) => (c + 1 + Math.floor(Math.random() * (COURSES.length - 1))) % COURSES.length)
      setRun((r) => r + 1)
    }, (run === 0 ? 800 : 2800) + Math.random() * 4200)
    return () => clearTimeout(t)
  }, [run])
  const c = COURSES[course]
  return (
    <g transform={`translate(${c.x} ${c.y}) rotate(${c.a})`}>
      <path key={run} d="M-18,0L0,0" stroke="#fbf1d4" strokeWidth="1.4" strokeLinecap="round" className="art-shoot"
        style={{ ['--len' as string]: `${c.len}px`, animationDuration: `${c.s}s`, animationPlayState: run === 0 ? 'paused' : 'running' }} />
    </g>
  )
}

/** A tiny satellite, just for fun: now and then it crawls across the top of the sky, left to right or right to left at random, blinking, and stops part way to send three ripples of signal down before moving on. */
export function Satellite() {
  const [pass, setPass] = useState({ run: 0, dir: 1, y: 14, stop: 0.5 })
  useEffect(() => {
    const t = setTimeout(() => {
      setPass((p) => ({ run: p.run + 1, dir: Math.random() < 0.5 ? 1 : -1, y: 8 + Math.random() * 18, stop: 0.3 + Math.random() * 0.4 }))
    }, (pass.run === 0 ? 4000 : 14000) + Math.random() * 16000)
    return () => clearTimeout(t)
  }, [pass.run])
  if (pass.run === 0) return null
  return (
    <g key={pass.run} transform={`translate(${pass.dir > 0 ? -20 : 340} ${pass.y})`}>
      <g className="art-sat" style={{ ['--len' as string]: `${pass.dir * 360}px`, ['--stop' as string]: pass.stop }}>
        {[0, 0.17, 0.34].map((d) => <path key={d} d="M-6,2.4A6,6 0 0 0 6,2.4" fill="none" stroke="#9ed8ff" strokeWidth="0.8" strokeLinecap="round" vectorEffect="non-scaling-stroke" className="art-sat-ping" style={{ animationDelay: `${d}s` }} />)}
        <path d="M0,-1.5V-4.5" stroke="#cfd6e8" strokeWidth="0.5" />
        <rect x="-8.5" y="-1.3" width="5.5" height="2.6" rx="0.3" fill="#5b7bd0" stroke="#cfd6e8" strokeWidth="0.35" />
        <rect x="3" y="-1.3" width="5.5" height="2.6" rx="0.3" fill="#5b7bd0" stroke="#cfd6e8" strokeWidth="0.35" />
        <rect x="-2.6" y="-1.8" width="5.2" height="3.6" rx="0.6" fill="#cfd6e8" />
        <circle cx="0" cy="-4.9" r="0.7" fill="#ff6a6a" className="art-sat-blink" />
      </g>
    </g>
  )
}

interface Bit { x: number; rot: number; kind: number; delay: number; fill: string }
const BIT_COLOURS = ['#fbf1d4', '#c9b6ff', '#ffd77a', '#9ef0b0']
const BIT_SHAPES = ['M-1.2,0a1.2,1.2 0 1 0 2.4,0a1.2,1.2 0 1 0 -2.4,0Z', 'M-1.1,-1.1H1.1V1.1H-1.1Z', 'M0,-1.5L1.4,1.1H-1.4Z']
/** The little things the beam seems to pick up: where they start under the saucer, how far they spin, and a small stagger so they do not rise in lockstep. */
const makeBits = (): Bit[] => Array.from({ length: 9 }, () => ({
  x: -7 + Math.random() * 14,
  rot: (Math.random() < 0.5 ? -1 : 1) * (180 + Math.random() * 360),
  kind: Math.floor(Math.random() * BIT_SHAPES.length),
  delay: Math.random() * 0.1,
  fill: BIT_COLOURS[Math.floor(Math.random() * BIT_COLOURS.length)],
}))

/** A little green UFO, just for fun: now and then it drifts across the sky, left to right or right to left at random, pausing part way to shine a white beam down that lifts a few small things into the saucer, bobbing and swaying like a bumblebee and blinking red lights underneath. */
export function Ufo() {
  const [pass, setPass] = useState({ run: 0, dir: 1, y: 22, bob: 6, sway: 9, stop: 0.5, bits: [] as Bit[] })
  useEffect(() => {
    const t = setTimeout(() => {
      setPass((p) => ({ run: p.run + 1, dir: Math.random() < 0.5 ? 1 : -1, y: 12 + Math.random() * 50, bob: 6 + Math.random() * 9, sway: 6 + Math.random() * 8, stop: 0.35 + Math.random() * 0.3, bits: makeBits() }))
    }, (pass.run === 0 ? 7000 : 18000) + Math.random() * 22000)
    return () => clearTimeout(t)
  }, [pass.run])
  if (pass.run === 0) return null
  return (
    <g key={pass.run} transform={`translate(${pass.dir > 0 ? -20 : 340} ${pass.y})`}>
      <defs>
        <linearGradient id="ufo-beam" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.9" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0.05" />
        </linearGradient>
      </defs>
      <g className="art-ufo" style={{ ['--len' as string]: `${pass.dir * 360}px`, ['--stop' as string]: pass.stop }}>
        <g className="art-ufo-bob" style={{ ['--bob' as string]: `${pass.bob}px`, animationDuration: `${1.67 + Math.random() * 1.17}s` }}>
          <g className="art-ufo-sway" style={{ ['--sway' as string]: `${pass.sway}px`, animationDuration: `${2.67 + Math.random() * 1.67}s` }}>
            <path d="M-2,2.2L2,2.2L9,40L-9,40Z" fill="url(#ufo-beam)" className="art-ufo-beam" />
            {pass.bits.map((b, i) => <path key={i} d={BIT_SHAPES[b.kind]} fill={b.fill} className="art-ufo-bit" style={{ ['--x' as string]: `${b.x.toFixed(1)}px`, ['--rot' as string]: `${b.rot.toFixed(0)}deg`, animationDelay: `${b.delay.toFixed(2)}s` }} />)}
            <path d="M-3.4,-1.6A3.4,3.4 0 0 1 3.4,-1.6Z" fill="#a8f0b0" stroke="#d6ffd9" strokeWidth="0.3" />
            <ellipse cx="0" cy="0" rx="8" ry="2.4" fill="#3fbf5a" stroke="#d6ffd9" strokeWidth="0.35" />
            {[-5, 0, 5].map((x, i) => <circle key={x} cx={x} cy="1.6" r="0.8" fill="#ff3b3b" className="art-ufo-light" style={{ animationDelay: `${-i * 0.4}s` }} />)}
          </g>
        </g>
      </g>
    </g>
  )
}

/** Every header scene shares one eclipse: the moon is 92% of the sun's size, slides until its edge overlaps the sun by 15% of its width, and the glow dims as it covers the sun. */
const MOON_RATIO = 0.92

function Eclipse({ id, cx, cy, r }: { id: string; cx: number; cy: number; r: number }) {
  const moon = r * MOON_RATIO
  const reach = r + moon * 0.7
  return (
    <>
      <g className="art-dim"><circle cx={cx} cy={cy} r={r * 2.2} fill={`url(#${id}-sun)`} className="art-glow" /></g>
      <circle cx={cx} cy={cy} r={r} fill="#ffe08a" />
      <circle cx={cx} cy={cy} r={moon} fill="#0d0a22" stroke="#9a7cf0" strokeOpacity="0.35" strokeWidth="0.8" className="art-moon-slide" style={{ ['--reach' as string]: `${reach.toFixed(1)}px` }} />
    </>
  )
}

function Sky({ id }: { id: string }) {
  return (
    <>
      <defs>
        <linearGradient id={`${id}-sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0c0920" />
          <stop offset="1" stopColor="#2b2468" />
        </linearGradient>
        <radialGradient id={`${id}-sun`}>
          <stop offset="0.3" stopColor="#ffd77a" stopOpacity="0.95" />
          <stop offset="1" stopColor="#e8943a" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`${id}-moon`}>
          <stop offset="0.3" stopColor="#9a7cf0" stopOpacity="0.9" />
          <stop offset="1" stopColor="#4a3a96" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="320" height="150" fill={`url(#${id}-sky)`} />
      {SKY.map((s, i) => <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="#fbf1d4" opacity="0.5" className={i % 2 ? 'art-star' : undefined} style={i % 2 ? { animationDelay: `${(i * 0.37) % 3}s` } : undefined} />)}
      {MOTES.map((m, i) => <circle key={`m${i}`} cx={m.x} cy={m.y} r={m.r} fill={i % 2 ? '#c9b6ff' : '#ffd77a'} className="art-mote" style={{ animationDuration: `${m.d}s`, animationDelay: `${m.o}s` }} />)}
      <Shooter first={0} />
      <Shooter first={5} />
      <Satellite />
      <Ufo />
    </>
  )
}

/** A jagged starburst for the moment the two courts clash: sixteen points, alternately long and short. */
const clashBurst = `M${Array.from({ length: 32 }, (_, i) => {
  const a = (i / 32) * Math.PI * 2 - Math.PI / 2
  const r = i % 2 ? 17 : 36
  return `${(Math.cos(a) * r).toFixed(1)},${(Math.sin(a) * r).toFixed(1)}`
}).join('L')}Z`

/** Two courts face off across a lit and a darkened strip of the board. */
export function SkirmishArt() {
  return (
    <svg className="menu-art" viewBox="0 0 320 150" role="img" aria-label="The Solarch and the Duskmother face off">
      <Sky id="sk" />
      <circle cx="58" cy="62" r="62" fill="url(#sk-sun)" className="art-glow" />
      <circle cx="262" cy="62" r="62" fill="url(#sk-moon)" className="art-glow art-late" />
      {Array.from({ length: 10 }, (_, i) => (
        <rect key={i} x={i * 32} y="112" width="32" height="38" fill={i % 2 ? '#3b2f8a' : '#e8b64a'} opacity={0.35 + (i < 5 ? 0.04 * (4 - i) : 0.04 * (i - 5))} />
      ))}
      <path d="M0,112H320" stroke="#9a7cf0" strokeOpacity="0.6" />
      <g transform="translate(62 82) scale(96)"><g className="art-bob" style={{ ['--bob' as string]: '-0.025px' }}><PieceArt role="leader" court="solari" /></g></g>
      <g transform="translate(258 82) scale(96)"><g className="art-bob art-late" style={{ ['--bob' as string]: '-0.025px' }}><PieceArt role="leader" court="umbral" /></g></g>
      <g className="art-dim"><g transform="translate(160 76)"><path d={clashBurst} className="art-burst" fill="#ffd77a" fillOpacity="0.85" stroke="#fbf1d4" strokeWidth="2" strokeLinejoin="round" /></g></g>
      <Eclipse id="sk" cx={160} cy={76} r={14} />
      <circle cx="160" cy="76" r="34" fill="none" stroke="#ffd77a" strokeOpacity="0.5" strokeDasharray="3 5" className="art-spin" />
    </svg>
  )
}

/** A road over the hills, one flag for each opponent, and the Eclipse Court at its end. */
export function CampaignArt() {
  const flags = [[30, 128], [78, 112], [118, 126], [160, 104], [200, 118], [236, 92], [262, 106], [284, 80]]
  return (
    <svg className="menu-art" viewBox="0 0 320 150" role="img" aria-label="The road to the Eclipse Court">
      <Sky id="cp" />
      <Eclipse id="cp" cx={262} cy={34} r={19} />
      <path d="M0,150V104L38,78L74,104L120,66L170,108L214,76L260,104L320,70V150Z" fill="#241d58" />
      <path d="M0,150V124L50,102L96,124L150,92L206,124L258,98L320,118V150Z" fill="#1a1442" />
      <path d="M-4,140C60,150 80,100 130,118S190,96 232,100 276,92 290,66" fill="none" stroke="#e8b64a" strokeWidth="5" strokeOpacity="0.75" strokeLinecap="round" strokeDasharray="1 9" className="art-road" />
      {flags.map(([x, y], i) => (
        <g key={i} transform={`translate(${x} ${y})`}>
          <path d="M0,0V-20" stroke="#fbf1d4" strokeWidth="1.6" />
          <path d={`M0,-20h12l-3,4 3,4H0Z`} fill={i % 2 ? '#7a5cc8' : '#e8b64a'} className="art-flag" style={{ animationDelay: `${-i * 0.45}s` }} />
        </g>
      ))}
      <g transform="translate(296 76)" fill="#0d0a22" stroke="#9a7cf0" strokeWidth="1">
        <path d="M-12,0V-22H-8V-26H-4V-22H4V-26H8V-22H12V0Z" />
        <path d="M-3,0V-8Q0,-12 3,-8V0Z" fill="#ffd77a" stroke="none" className="art-window" />
      </g>
    </svg>
  )
}

/** The Umbral piece that fronts each campaign opponent, in order of the ladder. */
const AVATARS: Role[] = ['footsoldier', 'marksman', 'aura', 'bruiser', 'flier', 'charger', 'leader', 'leader']

export function OpponentAvatar({ index, locked }: { index: number; locked: boolean }) {
  return (
    <svg className={`avatar${locked ? ' locked' : ''}`} viewBox="-0.45 -0.45 0.9 0.9" aria-hidden="true">
      <PieceArt role={AVATARS[index % AVATARS.length]} court="umbral" />
    </svg>
  )
}

/** The shared header scene for pages without a scene of their own: the night sky with one emblem and a low eclipse. */
export function PageArt({ icon }: { icon: IconName }) {
  const id = `pg-${icon}`
  return (
    <svg className="menu-art" viewBox="0 0 320 150" aria-hidden="true">
      <Sky id={id} />
      <Eclipse id={id} cx={160} cy={150} r={46} />
      <g transform="translate(160 68) scale(3.6) translate(-12 -12)">
        <g className="art-bob" style={{ ['--bob' as string]: '-0.6px' }} fill="none" stroke="#fbf1d4" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <IconShape name={icon} />
        </g>
      </g>
    </svg>
  )
}
