import { useEffect, useRef } from 'react'
import { burstCount, shardsIn } from '../../rewardFx'
import { sfx } from '../../audio/synth'
import { getSettings } from '../../settings'
import { flyCoins } from '../flyCoins'
import { t } from '../../i18n'

/** How long the shard chip takes to settle in before the coins aim at it. */
const CHIP_WAIT_MS = 380
/** The gap between one paying line's coins and the next's. */
const LINE_GAP_MS = 220

/** What a finished game paid, one line each; a line that pays Shards sends its coins flying to the wallet chip, unless motion is reduced. */
export function RewardLines({ lines }: { lines: string[] }) {
  const rows = useRef<(HTMLLIElement | null)[]>([])
  useEffect(() => {
    const timers: number[] = []
    // The reward chime sounds even when the coins do not fly.
    if (lines.some((line) => shardsIn(line) > 0)) timers.push(window.setTimeout(sfx.reward, CHIP_WAIT_MS))
    if (getSettings().reduceMotion) return () => timers.forEach((t) => window.clearTimeout(t))
    let paid = 0
    lines.forEach((line, i) => {
      const n = shardsIn(line)
      if (n <= 0) return
      const at = CHIP_WAIT_MS + paid++ * LINE_GAP_MS
      timers.push(window.setTimeout(() => {
        const chip = document.querySelector('.shard-toast')
        const row = rows.current[i]
        if (!chip || !row) return
        sfx.pickup()
        flyCoins(chip.getBoundingClientRect(), burstCount(n), row.getBoundingClientRect())
      }, at))
    })
    return () => timers.forEach((t) => window.clearTimeout(t))
    // The lines are settled once, when the result opens.
    // oxlint-disable-next-line react/exhaustive-deps
  }, [])
  if (lines.length === 0) return null
  return (
    <ul className="reward-lines" aria-label={t('tray.rewards')}>
      {lines.map((line, i) => (
        <li key={line} ref={(el) => { rows.current[i] = el }} className={shardsIn(line) > 0 ? 'pays' : undefined}>{line}</li>
      ))}
    </ul>
  )
}
