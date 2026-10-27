import type { Role } from '../../engine/rules/types'
import { PieceArt } from '../../art/PieceArt'

/** Deterministic scatter so the sky is the same on every visit. */
const SKY = Array.from({ length: 28 }, (_, i) => ({
  x: (i * 47.3) % 320,
  y: (i * 29.1 + (i % 4) * 9) % 96,
  r: 0.5 + (i % 3) * 0.4,
}))

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
      {SKY.map((s, i) => <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="#fbf1d4" opacity="0.5" />)}
    </>
  )
}

/** Two courts face off across a lit and a darkened strip of the board. */
export function SkirmishArt() {
  return (
    <svg className="menu-art" viewBox="0 0 320 150" role="img" aria-label="The Solarch and the Duskmother face off">
      <Sky id="sk" />
      <circle cx="58" cy="62" r="62" fill="url(#sk-sun)" />
      <circle cx="262" cy="62" r="62" fill="url(#sk-moon)" />
      {Array.from({ length: 10 }, (_, i) => (
        <rect key={i} x={i * 32} y="112" width="32" height="38" fill={i % 2 ? '#3b2f8a' : '#e8b64a'} opacity={0.35 + (i < 5 ? 0.04 * (4 - i) : 0.04 * (i - 5))} />
      ))}
      <path d="M0,112H320" stroke="#9a7cf0" strokeOpacity="0.6" />
      <g transform="translate(62 82) scale(96)"><PieceArt role="leader" court="solari" /></g>
      <g transform="translate(258 82) scale(96)"><PieceArt role="leader" court="umbral" /></g>
      <g transform="translate(160 76)" stroke="#fbf1d4" strokeWidth="5" strokeLinecap="round" fill="none">
        <path d="M-26,-30L26,30M26,-30L-26,30" />
        <path d="M-34,-36l9,2-2,9M34,-36l-9,2 2,9" strokeWidth="3" />
      </g>
      <circle cx="160" cy="76" r="34" fill="none" stroke="#ffd77a" strokeOpacity="0.5" strokeDasharray="3 5" />
    </svg>
  )
}

/** A road over the hills, one flag for each opponent, and the Eclipse Court at its end. */
export function CampaignArt() {
  const flags = [[30, 128], [78, 112], [118, 126], [160, 104], [200, 118], [236, 92], [262, 106], [284, 80]]
  return (
    <svg className="menu-art" viewBox="0 0 320 150" role="img" aria-label="The road to the Eclipse Court">
      <Sky id="cp" />
      <circle cx="262" cy="34" r="46" fill="url(#cp-sun)" />
      <circle cx="262" cy="34" r="19" fill="#ffe08a" />
      <circle cx="268" cy="31" r="18" fill="#0d0a22" />
      <path d="M0,150V104L38,78L74,104L120,66L170,108L214,76L260,104L320,70V150Z" fill="#241d58" />
      <path d="M0,150V124L50,102L96,124L150,92L206,124L258,98L320,118V150Z" fill="#1a1442" />
      <path d="M-4,140C60,150 80,100 130,118S190,96 232,100 276,92 290,66" fill="none" stroke="#e8b64a" strokeWidth="5" strokeOpacity="0.75" strokeLinecap="round" strokeDasharray="1 9" />
      {flags.map(([x, y], i) => (
        <g key={i} transform={`translate(${x} ${y})`}>
          <path d="M0,0V-20" stroke="#fbf1d4" strokeWidth="1.6" />
          <path d={`M0,-20h12l-3,4 3,4H0Z`} fill={i % 2 ? '#7a5cc8' : '#e8b64a'} />
        </g>
      ))}
      <g transform="translate(296 76)" fill="#0d0a22" stroke="#9a7cf0" strokeWidth="1">
        <path d="M-12,0V-22H-8V-26H-4V-22H4V-26H8V-22H12V0Z" />
        <path d="M-3,0V-8Q0,-12 3,-8V0Z" fill="#ffd77a" stroke="none" />
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
