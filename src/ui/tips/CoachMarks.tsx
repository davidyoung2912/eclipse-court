import { useEffect, useLayoutEffect, useState, useSyncExternalStore } from 'react'
import { markTipSeen, subscribeTips, tipsSnapshot } from '../../tips'
import { Icon } from '../menus/icons'
import { COACH } from './coachData'
import { t } from '../../i18n'

interface Props {
  /** Holds the callouts back, such as during a banner, a duel or a dialog. */
  hidden?: boolean
  /** Told whether a callout is showing, so other guidance can wait its turn. */
  onActive?: (active: boolean) => void
}

interface Spot { top: number; left: number; width: number; height: number }

/** First-run callouts that point at the real board and HUD, one at a time, each remembered once dismissed. */
export function CoachMarks({ hidden = false, onActive }: Props) {
  const seen = useSyncExternalStore(subscribeTips, tipsSnapshot)
  const [skipped, setSkipped] = useState<ReadonlySet<string>>(new Set())
  const [spot, setSpot] = useState<Spot | null>(null)
  const step = hidden ? undefined : COACH.find((s) => !seen.has(s.id) && !skipped.has(s.id))

  // Measures the target, and follows it as the window changes; a missing target is skipped for this visit.
  useLayoutEffect(() => {
    if (!step) return
    const measure = () => {
      const el = document.querySelector(step.target)
      if (!el) { setSkipped((s) => new Set(s).add(step.id)); return }
      const r = el.getBoundingClientRect()
      const pad = 6
      setSpot({ top: r.top - pad, left: r.left - pad, width: r.width + pad * 2, height: r.height + pad * 2 })
    }
    measure()
    window.addEventListener('resize', measure)
    window.addEventListener('scroll', measure, true)
    return () => {
      window.removeEventListener('resize', measure)
      window.removeEventListener('scroll', measure, true)
    }
  }, [step])

  const active = !!step && !!spot
  useEffect(() => { onActive?.(active) }, [active, onActive])
  if (!step || !spot) return null

  const below = spot.top + spot.height / 2 < window.innerHeight / 2
  const done = () => COACH.forEach((s) => markTipSeen(s.id))
  const left = COACH.filter((s) => !seen.has(s.id) && !skipped.has(s.id)).length
  return (
    <div className="coach" role="note" aria-label={t('coach.label', { title: step.title })}>
      <div className="coach-ring" style={spot} />
      <aside className="coach-bubble" style={below ? { top: spot.top + spot.height + 12 } : { bottom: window.innerHeight - spot.top + 12 }}>
        <h4>{step.title}</h4>
        <p>{step.text}</p>
        <div className="tip-foot">
          {left > 1 && <button className="coach-skip" onClick={done}>{t('coach.skipAll')}</button>}
          {/* The coach card takes focus; a shared dialog hook replaces this in accessibility phase 2. */}
          {/* oxlint-disable-next-line jsx-a11y/no-autofocus */}
          <button className="primary" autoFocus onClick={() => markTipSeen(step.id)}><Icon name="check" />{left > 1 ? t('coach.next') : t('tip.gotIt')}</button>
        </div>
      </aside>
    </div>
  )
}
