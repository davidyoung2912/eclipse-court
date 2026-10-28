import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { burstCount, COIN_FLIGHT_MS, COIN_STEP_MS } from '../rewardFx'
import { haptic } from '../haptics'
import { getSettings } from '../settings'
import { sfx } from '../audio/synth'
import { shopSnapshot, subscribeShop } from '../shop'
import { Icon } from './menus/icons'

const SHOW_MS = 2400

/** Coins that fly from the middle of the screen to the chip, fanning out a little on the way. */
function flyCoins(to: DOMRect, count: number) {
  const from = { x: window.innerWidth / 2, y: window.innerHeight * 0.45 }
  const goal = { x: to.left + to.width / 2, y: to.top + to.height / 2 }
  for (let i = 0; i < count; i++) {
    const coin = document.createElement('i')
    coin.setAttribute('aria-hidden', 'true')
    Object.assign(coin.style, {
      position: 'fixed', left: '0', top: '0', width: '14px', height: '14px', marginLeft: '-7px', marginTop: '-7px', borderRadius: '50%',
      pointerEvents: 'none', zIndex: '70', background: 'radial-gradient(circle at 35% 30%, #fff4c8, #f2c55c 60%, #c8962e)', boxShadow: '0 0 10px 2px rgba(242, 197, 92, 0.7)',
    })
    document.body.appendChild(coin)
    const side = (i % 2 ? 1 : -1) * (30 + ((i * 17) % 50))
    const mid = { x: (from.x + goal.x) / 2 + side, y: (from.y + goal.y) / 2 - 40 }
    const flight = coin.animate?.([
      { transform: `translate(${from.x}px, ${from.y}px) scale(0.6)`, opacity: 0 },
      { transform: `translate(${mid.x}px, ${mid.y}px) scale(1)`, opacity: 1, offset: 0.4 },
      { transform: `translate(${goal.x}px, ${goal.y}px) scale(0.5)`, opacity: 0.2 },
    ], { duration: COIN_FLIGHT_MS, delay: i * COIN_STEP_MS, easing: 'ease-in', fill: 'both' })
    if (flight) flight.onfinish = () => coin.remove()
    else coin.remove()
  }
}

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
    if (getSettings().reduceMotion) return
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
