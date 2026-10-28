import { Portrait } from '../../art/Portrait'
import { personaPortrait } from '../../art/portraits'
import type { Persona } from '../../engine/data/personas'

/** A named opponent's latest line beside their portrait: it never blocks play, and a tap puts it away. */
export function PersonaBubble({ persona, text, onDismiss }: { persona: Persona; text: string; onDismiss: () => void }) {
  return (
    <button className="persona-bubble" onClick={onDismiss} aria-label={`${persona.name} says: ${text}. Tap to dismiss.`}>
      <Portrait id={personaPortrait(persona.id)} className="persona-bubble-face" />
      <span className="persona-bubble-text"><b>{persona.name}</b>{text}</span>
    </button>
  )
}
