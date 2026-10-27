import type { Hint } from '../../ai/hint'

/** The recommendation under the board; the same fixed-height strip as the piece card. */
export function HintCard({ hint, source }: { hint: Hint | 'thinking'; /** Who the advice is from, when not the AI. */ source?: string }) {
  if (hint === 'thinking') return <section className="piece-card hint-card empty" aria-live="polite"><p>Looking for the best move…</p></section>
  return (
    <section className="piece-card hint-card" aria-live="polite">
      <header><b>Hint</b><span>{source ?? 'What the AI would do in your place'}</span></header>
      <p className="hint-headline">{hint.headline}</p>
      <p className="hint-detail">{hint.detail}</p>
    </section>
  )
}
