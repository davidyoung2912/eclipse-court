import { useSyncExternalStore } from 'react'
import { markTipSeen, subscribeTips, tipsSnapshot } from '../../tips'
import { Icon } from '../menus/icons'
import { TIPS, type TipPage } from './tipData'

interface Props {
  /** The page or pages whose cards may show; the first unread card of the first page with one is shown. */
  page: TipPage | readonly (TipPage | false | null | undefined)[]
  /** Pin to the bottom of the screen instead of the end of a scrolling page. */
  float?: boolean
  /** Holds the card back, such as during a turn banner or a duel. */
  hidden?: boolean
}

/** A one-time guidance card for the page it sits on, dismissed with Got It! and remembered on this device. */
export function TipCard({ page, float = false, hidden = false }: Props) {
  const seen = useSyncExternalStore(subscribeTips, tipsSnapshot)
  const pages = (Array.isArray(page) ? page : [page]).filter((p): p is TipPage => !!p)
  const tips = pages.flatMap((p) => TIPS[p])
  const left = tips.filter((t) => !seen.has(t.id))
  const tip = left[0]
  if (!tip || hidden) return null
  const number = tips.length - left.length + 1
  return (
    <aside key={tip.id} className={`tip-card${float ? ' float' : ''}`} role="note" aria-label={`Tip: ${tip.title}`}>
      <div className="tip-icon"><Icon name={tip.icon} /></div>
      <div className="tip-body">
        <h4>{tip.title}</h4>
        <p>{tip.text}</p>
        <div className="tip-foot">
          {tips.length > 1 && <small>Tip {number} of {tips.length}</small>}
          <button className="primary" onClick={() => markTipSeen(tip.id)}><Icon name="check" />Got It!</button>
        </div>
      </div>
    </aside>
  )
}
