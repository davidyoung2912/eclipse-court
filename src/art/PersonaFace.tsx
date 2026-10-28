import { useState } from 'react'
import { Portrait } from './Portrait'
import { personaPortrait } from './portraits'
import { PERSONAS, type PersonaId } from '../engine/data/personas'

/** A persona's face: the picture at `public/personas/<id>.webp` in an arched leaded-glass frame tinted by house, the stained-glass bust when there is no picture. */
export function PersonaFace({ id, className }: { id: PersonaId; className?: string }) {
  const [missing, setMissing] = useState(false)
  const [loaded, setLoaded] = useState(false)
  if (missing) return <Portrait id={personaPortrait(id)} className={className} />
  const house = PERSONAS.find((p) => p.id === id)?.house
  return (
    <span className={`persona-frame${className ? ` ${className}` : ''}`} data-house={house}>
      <img className="persona-photo" data-loading={loaded ? undefined : ''} onLoad={() => setLoaded(true)} src={`${import.meta.env.BASE_URL}personas/${id}.webp`} alt="" loading="lazy" onError={() => setMissing(true)} />
    </span>
  )
}
