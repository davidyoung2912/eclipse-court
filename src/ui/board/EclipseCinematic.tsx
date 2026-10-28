import { useEffect } from 'react'
import { ECLIPSE_CINEMA_MS } from '../../spellFx'

/** The Eclipse falls: the screen dims and a dark disc slides across a sun glyph. It ignores the pointer and clears itself. */
export function EclipseCinematic({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onDone, ECLIPSE_CINEMA_MS)
    return () => clearTimeout(timer)
  }, [onDone])
  return (
    <div className="eclipse-cinema" aria-hidden="true" style={{ animationDuration: `${ECLIPSE_CINEMA_MS}ms` }}>
      <svg viewBox="-50 -50 100 100" className="eclipse-sun">
        <g className="sun-rays">
          {Array.from({ length: 12 }, (_, i) => (
            <line key={i} x1={0} x2={0} y1={-34} y2={-46} transform={`rotate(${i * 30})`} />
          ))}
        </g>
        <circle className="sun-disc" r={26} />
        <circle className="moon-disc" r={27} />
      </svg>
    </div>
  )
}
