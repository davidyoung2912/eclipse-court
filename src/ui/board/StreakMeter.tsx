import { useEffect, useRef, useState } from 'react'
import { METER_SEGMENTS, meterSparks } from '../../boardDrama'
import type { Court } from '../../engine/rules/types'
import { t } from '../../i18n'

/** A row of segments that fills with each capture in a row, throws more sparks as it climbs and cracks when the streak ends. */
export function StreakMeter({ count, court }: { count: number; court: Court }) {
  const last = useRef(count)
  const [cracked, setCracked] = useState<{ key: number; count: number } | null>(null)
  useEffect(() => {
    if (count === 0 && last.current >= 2) setCracked({ key: Date.now(), count: last.current })
    else if (count > 0) setCracked(null)
    last.current = count
  }, [count])
  useEffect(() => {
    if (!cracked) return
    const timer = setTimeout(() => setCracked(null), 900)
    return () => clearTimeout(timer)
  }, [cracked])
  const shown = cracked ? cracked.count : count
  if (shown < 1) return null
  const sparks = meterSparks(shown)
  return (
    <div className={`streak-meter ${court}${cracked ? ' cracked' : ''}`} role="img" aria-label={t('streak.label', { n: shown })}>
      {Array.from({ length: METER_SEGMENTS }, (_, i) => (
        <i key={i} className={i < shown ? 'on' : ''} />
      ))}
      <span className="sparks" key={cracked ? cracked.key : shown} aria-hidden="true">
        {Array.from({ length: sparks }, (_, i) => (
          <b key={i} style={{ ['--angle' as string]: `${(360 / sparks) * i}deg`, ['--dist' as string]: `${14 + (i % 3) * 6}px` }} />
        ))}
      </span>
    </div>
  )
}
