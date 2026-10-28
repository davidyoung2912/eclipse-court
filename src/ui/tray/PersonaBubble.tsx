import { PersonaFace } from '../../art/PersonaFace'
import type { Persona } from '../../engine/data/personas'

/** A named opponent's latest line beside their portrait: it never blocks play, and a tap puts it away. */
export function PersonaBubble({ persona, text, onDismiss }: { persona: Persona; text: string; onDismiss: () => void }) {
  return (
    <button className="persona-bubble" onClick={onDismiss} aria-label={`Dismiss ${persona.name}'s message`}>
      <PersonaFace id={persona.id} className="persona-bubble-face" />
      <span className="persona-bubble-text" aria-hidden="true"><b>{persona.name}</b>{text}</span>
    </button>
  )
}
