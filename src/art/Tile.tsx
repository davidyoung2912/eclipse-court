/** Shared SVG defs for the board: lead-line pattern and the warm glow on lit squares. */
export function BoardDefs() {
  return (
    <defs>
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

