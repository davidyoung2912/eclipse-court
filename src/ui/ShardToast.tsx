import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { burstCount, takeFlightClaim } from '../rewardFx'
import { haptic } from '../haptics'
import { getSettings } from '../settings'
import { sfx } from '../audio/synth'
import { shopSnapshot, subscribeShop } from '../shop'
import { Icon } from './menus/icons'
import { flyCoins } from './flyCoins'

const SHOW_MS = 2400

/** Whenever Shards are earned, a chip shows what came in and a burst of coins flies to it; coins are skipped under reduced motion. */
export function ShardToast() {
  const { shards } = useSyncExternalStore(subscribeShop, shopSnapshot)
  const last = useRef(shards)
  const chip = useRef<HTMLDivElement>(null)
  const [gain, setGain] = useState<{ n: number; id: number } | null>(null)
  useEffect(() => {
    const gained = shards - last.current
    last.current = shards
    if (gained <= 0) return
    setGain((g) => ({ n: gained + (g ? g.n : 0), id: (g?.id ?? 0) + 1 }))
    haptic('coin')
    const flownByDialog = takeFlightClaim()
    if (getSettings().reduceMotion || flownByDialog) return
    sfx.pickup()
    requestAnimationFrame(() => { if (chip.current) flyCoins(chip.current.getBoundingClientRect(), burstCount(gained)) })
  }, [shards])
  useEffect(() => {
    if (!gain) return
    const timer = window.setTimeout(() => setGain(null), SHOW_MS)
    return () => window.clearTimeout(timer)
  }, [gain])
  if (!gain) return null
  return <div ref={chip} key={gain.id} className="shard-toast" role="status"><Icon name="star" />+{gain.n}</div>
}
