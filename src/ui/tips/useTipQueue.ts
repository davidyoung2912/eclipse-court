import { useSyncExternalStore } from 'react'
import { subscribeTips, tipsSnapshot } from '../../tips'
import { TIPS, type Tip, type TipPage } from './tipData'

export type Pages = TipPage | readonly (TipPage | false | null | undefined)[]

/** The cards of `page` in order, and the ones among them not yet dismissed. */
export function useQueue(page: Pages): { tips: Tip[]; left: Tip[] } {
  const seen = useSyncExternalStore(subscribeTips, tipsSnapshot)
  const pages = (Array.isArray(page) ? page : [page]).filter((p): p is TipPage => !!p)
  const tips = pages.flatMap((p) => TIPS[p])
  return { tips, left: tips.filter((t) => !seen.has(t.id)) }
}

/** True while any card of `page` is waiting, so a screen showing them modally can hold still until they are read. */
export const useTipsPending = (page: Pages) => useQueue(page).left.length > 0
