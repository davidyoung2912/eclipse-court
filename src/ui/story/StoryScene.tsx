import type { Court } from '../../engine/rules/types'
import type { Act } from '../../engine/data/story'

/** Fixed star positions (x, y, radius) so the sky does not shift between beats. */
const STARS = [
  [22, 34, 0.9], [58, 96, 0.6], [96, 22, 0.7], [128, 70, 1], [170, 38, 0.6], [212, 88, 0.8], [250, 28, 1], [290, 64, 0.7],
  [40, 150, 0.6], [84, 190, 0.8], [150, 140, 0.6], [230, 160, 0.7], [276, 120, 0.9], [304, 190, 0.6], [18, 240, 0.7], [300, 250, 0.8],
] as const

/** The glow behind each act's eclipse: dawn gold for the prologue, then colder and redder as the Hour runs out. */
const ACT_GLOW: Record<string, string> = { prologue: '#ffd77a', '1': '#ffc766', '2': '#f0944a', '3': '#d8584a' }

interface Props {
  /** The speaking court, or none for narration, which gets the eclipse alone. */
  court: Court | null
  act: Act
}

/** The scene behind a story beat: a starfield, a rising eclipse and rays, tinted by who is speaking and how far on the story is. */
export function StoryScene({ court, act }: Props) {
  const glow = ACT_GLOW[String(act)]
  const tint = court === 'umbral' ? '#7a5cc8' : court === 'solari' ? '#e8b64a' : glow
  return (
    <svg className="story-scene" viewBox="0 0 320 480" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <radialGradient id="story-halo" cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor={glow} stopOpacity="0.55" />
          <stop offset="0.5" stopColor={glow} stopOpacity="0.14" />
          <stop offset="1" stopColor={glow} stopOpacity="0" />
        </radialGradient>
        <radialGradient id="story-mist" cx="50%" cy="0%" r="80%">
          <stop offset="0" stopColor={tint} stopOpacity="0.32" />
          <stop offset="1" stopColor={tint} stopOpacity="0" />
        </radialGradient>
        <linearGradient id="story-ray" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor={glow} stopOpacity="0.5" />
          <stop offset="1" stopColor={glow} stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect width="320" height="480" fill="url(#story-mist)" />
      {STARS.map(([x, y, r]) => <circle key={`${x}-${y}`} cx={x} cy={y} r={r} fill="#fbf1d4" opacity={0.35 + r * 0.3} />)}
      <g className="story-rays" transform="translate(160 500)">
        {[-62, -38, -14, 14, 38, 62].map((a, i) => <path key={a} className={i % 2 ? 'story-ray dim' : 'story-ray lit'} d="M-9 0L-34 -560L34 -560L9 0z" fill="url(#story-ray)" transform={`rotate(${a})`} />)}
      </g>
      <circle cx="160" cy="500" r="190" fill="url(#story-halo)" />
      <circle cx="160" cy="500" r="92" fill="#ffe08a" opacity="0.85" />
      <circle cx="176" cy="486" r="90" fill="#0d0a22" />
      {court === 'umbral' && <path d="M236 70a34 34 0 1 0 28 56 28 28 0 1 1-28-56z" fill="#cfc2f2" opacity="0.5" />}
      {court === 'solari' && <circle cx="256" cy="86" r="22" fill="#ffe08a" opacity="0.45" />}
    </svg>
  )
}
