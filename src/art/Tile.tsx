/** Shared SVG defs for the board: lead-line pattern, stone grain, bevel, gilded frame and the warm glow on lit squares. */
export function BoardDefs() {
  return (
    <defs>
      <filter id="stone-grain" x="0" y="0" width="100%" height="100%">
        <feTurbulence type="fractalNoise" baseFrequency="38" numOctaves="2" seed="7" result="n" />
        <feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.9 -0.32" />
      </filter>
      <linearGradient id="bevel-lit" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#fff" stopOpacity="0.28" />
        <stop offset="0.18" stopColor="#fff" stopOpacity="0" />
        <stop offset="0.82" stopColor="#000" stopOpacity="0" />
        <stop offset="1" stopColor="#000" stopOpacity="0.3" />
      </linearGradient>
      <linearGradient id="frame-gild" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#f6dc8e" />
        <stop offset="0.5" stopColor="#b98a2c" />
        <stop offset="1" stopColor="#e8c466" />
      </linearGradient>
      <radialGradient id="hour-wash" cx="0.5" cy="0.5" r="0.75">
        <stop offset="0" stopColor="currentColor" stopOpacity="0.28" />
        <stop offset="1" stopColor="currentColor" stopOpacity="0" />
      </radialGradient>
      <path id="lead" className="lead" d="M-0.5,-0.5L0.5,0.5M0.5,-0.5L-0.5,0.5M0,-0.5V0.5M-0.5,0H0.5" />
      <radialGradient id="glow-solari">
        <stop offset="0" stopColor="#fff6cf" stopOpacity="0.85" />
        <stop offset="1" stopColor="#fff6cf" stopOpacity="0" />
      </radialGradient>
      <radialGradient id="move-glow">
        <stop offset="0" stopColor="#fff0a0" stopOpacity="0.95" />
        <stop offset="0.55" stopColor="#ffd45a" stopOpacity="0.55" />
        <stop offset="1" stopColor="#ffd45a" stopOpacity="0" />
      </radialGradient>
      <radialGradient id="threat-glow">
        <stop offset="0" stopColor="#ffb0a0" stopOpacity="0.95" />
        <stop offset="0.55" stopColor="#ff4a4a" stopOpacity="0.55" />
        <stop offset="1" stopColor="#ff4a4a" stopOpacity="0" />
      </radialGradient>
      <filter id="halo-blur" x="-60%" y="-60%" width="220%" height="220%">
        <feGaussianBlur stdDeviation="0.07" />
      </filter>
      <radialGradient id="glow-umbral">
        <stop offset="0" stopColor="#0a0620" stopOpacity="0.7" />
        <stop offset="1" stopColor="#0a0620" stopOpacity="0" />
      </radialGradient>
    </defs>
  )
}

