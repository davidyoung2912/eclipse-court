export interface CoachStep {
  /** Stable key under which dismissal is remembered, always `coach-` prefixed. */
  id: string
  /** CSS selector of the real element to point at; a step whose element is not on screen is skipped. */
  target: string
  title: string
  text: string
}

/** First-run callouts on the real match screen, shown once each in this order. */
export const COACH: readonly CoachStep[] = [
  { id: 'coach-beacon', target: 'circle.beacon', title: 'This ring is a Beacon',
    text: 'Dashed gold rings are beacons. Hold them with your pieces at the end of your turn to win, and a piece standing on one cannot be targeted by spells.' },
  { id: 'coach-dial', target: '.hud .dial', title: 'The luminance dial',
    text: 'The big number is the light on the centre right now, and the small ones are the next rounds. Bright light strengthens Solari pieces, darkness strengthens Umbral.' },
  { id: 'coach-eclipse', target: '.hud-round', title: 'The Eclipse round',
    text: 'This counts rounds toward the Eclipse. When it falls the light stops shifting and spells go silent, so make your position count before then.' },
]
