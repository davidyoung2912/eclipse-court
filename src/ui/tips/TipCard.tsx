import { markTipSeen } from '../../tips'
import { Icon } from '../menus/icons'
import { useQueue, type Pages } from './useTipQueue'

interface Props {
  /** The page or pages whose cards may show; the first unread card of the first page with one is shown. */
  page: Pages
  /** Pin to the bottom of the screen instead of the end of a scrolling page. */
  float?: boolean
  /** Holds the card back, such as during a turn banner or a duel. */
  hidden?: boolean
  /** Show the card as a dialog over a dimmed screen. The screen behind should be paused while `useTipsPending` is true. */
  modal?: boolean
}

/** A one-time guidance card for the page it sits on, dismissed with Got It! and remembered on this device. */
export function TipCard({ page, float = false, hidden = false, modal = false }: Props) {
  const { tips, left } = useQueue(page)
  const tip = left[0]
  if (!tip || hidden) return null
  const number = tips.length - left.length + 1
  const card = (
    <aside key={tip.id} className={`tip-card${float ? ' float' : ''}${modal ? ' modal' : ''}`} role={modal ? 'dialog' : 'note'} aria-modal={modal || undefined} aria-label={`Tip: ${tip.title}`}>
      <div className="tip-icon"><Icon name={tip.icon} /></div>
      <div className="tip-body">
        <h4>{tip.title}</h4>
        <p>{tip.text}</p>
        <div className="tip-foot">
          {tips.length > 1 && <small>Tip {number} of {tips.length}</small>}
          {/* A modal tip takes focus; a shared dialog hook replaces this in accessibility phase 2. */}
          {/* oxlint-disable-next-line jsx-a11y/no-autofocus */}
          <button className="primary" autoFocus={modal} onClick={() => markTipSeen(tip.id)}><Icon name="check" />Got It!</button>
        </div>
      </div>
    </aside>
  )
  return modal ? <div className="tip-modal">{card}</div> : card
}
