import { useState } from 'react'
import { Portrait } from './Portrait'
import { personaPortrait } from './portraits'
import type { PersonaId } from '../engine/data/personas'

/** A persona's face: the picture at `public/personas/<id>.webp` when there is one, the stained-glass bust otherwise. */
export function PersonaFace({ id, className }: { id: PersonaId; className?: string }) {
  const [missing, setMissing] = useState(false)
  const [loaded, setLoaded] = useState(false)
  if (missing) return <Portrait id={personaPortrait(id)} className={className} />
  return <img className={`persona-photo${className ? ` ${className}` : ''}`} data-loading={loaded ? undefined : ''} onLoad={() => setLoaded(true)} src={`${import.meta.env.BASE_URL}personas/${id}.webp`} alt="" loading="lazy" onError={() => setMissing(true)} />
}
