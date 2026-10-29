import type { Hint } from '../../ai/hint'
import { t } from '../../i18n'

/** The recommendation under the board; the same fixed-height strip as the piece card. */
export function HintCard({ hint, source }: { hint: Hint | 'thinking'; /** Who the advice is from, when not the AI. */ source?: string }) {
  if (hint === 'thinking') return <section className="piece-card hint-card empty" aria-live="polite"><p>{t('tray.thinking')}</p></section>
  return (
    <section className="piece-card hint-card" aria-live="polite">
      <header><b>{t('tray.hint')}</b><span>{source ?? t('tray.hintSource')}</span></header>
      <p className="hint-headline">{hint.headline}</p>
      <p className="hint-detail">{hint.detail}</p>
    </section>
  )
}
