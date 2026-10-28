import { useId } from 'react'
import { PORTRAITS, type Gear, type PortraitId } from './portraits'

/** The arched window: the pane fans, the figure and the lead lines all sit inside it. */
const ARCH = 'M6,118V48A44,44 0 0 1 94,48V118Z'
const HEAD = { x: 50, y: 56 }

/** Pane wedges fanned from behind the head, drawn far past the arch so the clip trims them. */
const FAN = Array.from({ length: 10 }, (_, i) => {
  const point = (k: number) => {
    const a = (k / 10) * Math.PI * 2 - Math.PI / 2
    return `${(HEAD.x + Math.cos(a) * 120).toFixed(1)},${(HEAD.y + Math.sin(a) * 120).toFixed(1)}`
  }
  return { d: `M${HEAD.x},${HEAD.y}L${point(i)}L${point(i + 1)}Z`, tone: i % 3 }
})

/** Gear drawn behind the head and shoulders. */
function Behind({ gear, trim, cloth }: { gear: Gear; trim: string; cloth: string }) {
  switch (gear) {
    case 'hood': return <path d="M24,96C22,42 36,22 50,22C64,22 78,42 76,96Z" fill={cloth} />
    case 'halo': return <circle cx={HEAD.x} cy={HEAD.y - 2} r="25" fill="none" stroke={trim} strokeWidth="2.5" />
    case 'wings': return (
      <g fill={trim}>
        <path d="M36,52L8,32L16,50L6,56L20,62L36,66Z" />
        <path d="M64,52L92,32L84,50L94,56L80,62L64,66Z" />
      </g>
    )
    case 'horns': return (
      <g fill={trim}>
        <path d="M36,40C24,36 22,22 28,12C31,26 37,30 43,34Z" />
        <path d="M64,40C76,36 78,22 72,12C69,26 63,30 57,34Z" />
      </g>
    )
    default: return null
  }
}

/** Gear drawn over the head. */
function Over({ gear, trim, cloth }: { gear: Gear; trim: string; cloth: string }) {
  switch (gear) {
    case 'crown': return <path d="M35,42L36,28L43,35L50,23L57,35L64,28L65,42Z" fill={trim} />
    case 'helm': return (
      <g>
        <path d="M34,54C33,30 67,30 66,54L62,46H38Z" fill={trim} />
        <path d="M49,32H51V50H49Z" fill={cloth} />
      </g>
    )
    case 'plume': return <path d="M50,32C42,12 62,4 72,16C62,16 60,24 57,33Z" fill={trim} />
    case 'ember': return <path d="M36,36L40,22L45,32L50,16L55,32L60,22L64,36Z" fill={trim} />
    case 'veil': return <path d="M32,42C36,28 64,28 68,42L76,100H24Z" fill={trim} fillOpacity="0.35" />
    default: return null
  }
}

/** A stained-glass bust in an arched window, one per named figure: flat panes, lead lines, a crest or hood that says who they are. */
export function Portrait({ id, className }: { id: PortraitId; className?: string }) {
  const spec = PORTRAITS[id]
  const clip = useId()
  const eye = 'glow' in spec ? spec.glow : '#1a1230'
  return (
    <svg className={`portrait${className ? ` ${className}` : ''}`} viewBox="0 0 100 120" aria-hidden="true">
      <defs><clipPath id={clip}><path d={ARCH} /></clipPath></defs>
      <g clipPath={`url(#${clip})`} stroke="#14102b" strokeWidth="1.2" strokeLinejoin="round">
        {FAN.map((p, i) => <path key={i} d={p.d} fill={spec.glass[p.tone]} />)}
        {'eclipse' in spec && (
          <g>
            <circle cx={HEAD.x} cy={HEAD.y - 4} r="30" fill="#0d0a22" />
            <circle cx={HEAD.x} cy={HEAD.y - 4} r="30" fill="none" stroke="#ffd77a" strokeWidth="2" />
          </g>
        )}
        {spec.gear.map((g) => <Behind key={g} gear={g} trim={spec.trim} cloth={spec.cloth} />)}
        <path d="M10,120C12,92 30,84 42,82H58C70,84 88,92 90,120Z" fill={spec.cloth} />
        <path d="M42,82L50,98L58,82Z" fill={spec.trim} />
        <rect x="44" y="70" width="12" height="14" fill={spec.skin} />
        <ellipse cx={HEAD.x} cy={HEAD.y} rx="15" ry="18" fill={spec.skin} />
        <path d={`M${HEAD.x},${HEAD.y - 18}V${HEAD.y + 18}`} fill="none" strokeOpacity="0.35" />
        <path d={`M${HEAD.x},${HEAD.y - 18}A15,18 0 0 1 ${HEAD.x},${HEAD.y + 18}Z`} fill="#ffffff" fillOpacity="0.14" stroke="none" />
        <path d="M42,54L47,55M58,54L53,55" stroke={eye} strokeWidth="2.4" strokeLinecap="round" />
        <path d="M46,66Q50,68 54,66" fill="none" strokeOpacity="0.7" />
        {spec.gear.map((g) => <Over key={g} gear={g} trim={spec.trim} cloth={spec.cloth} />)}
      </g>
      <path d={ARCH} fill="none" stroke="#14102b" strokeWidth="3" />
      <path d={ARCH} fill="none" stroke={spec.trim} strokeOpacity="0.8" strokeWidth="1" transform="translate(0 0)" />
    </svg>
  )
}
