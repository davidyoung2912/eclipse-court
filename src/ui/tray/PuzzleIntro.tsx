import { useDialog } from '../../hooks/useDialog'
import { t } from '../../i18n'
import { Icon } from '../menus/icons'

/** The card over a puzzle's board when it opens: its name, the turns allowed and what to do. */
export function PuzzleIntro({ name, text, turns, onClose }: { name: string; text: string; turns: number; onClose: () => void }) {
  const box = useDialog<HTMLElement>(onClose)
  return (
    <div className="puzzle-intro-backdrop">
      <section ref={box} className="puzzle-intro" role="dialog" aria-modal="true" aria-label={t('game.puzzleLabel', { name })}>
        <div className="puzzle-intro-icon"><Icon name="puzzle" /></div>
        <h2>{name}</h2>
        <span className="pill">{t('game.winIn', { count: turns })}</span>
        <p>{text}</p>
        <div className="puzzle-intro-foot"><button onClick={onClose}><Icon name="check" />{t('tip.gotIt')}</button></div>
      </section>
    </div>
  )
}
