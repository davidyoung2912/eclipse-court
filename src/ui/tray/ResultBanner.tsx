import { useEffect, useState } from 'react'

export type ResultTone = 'win' | 'lose' | 'draw' | 'plain'
export interface ResultStat { label: string; value: number }

const COUNT_MS = 900

function reducedMotion() {
  return document.documentElement.dataset.motion === 'reduced' || !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
}

/** Counts from 0 up to `to` once, easing out; jumps straight there when motion is reduced. */
function useCountUp(to: number, delay: number) {
  const [value, setValue] = useState(() => (reducedMotion() ? to : 0))
  useEffect(() => {
    if (reducedMotion()) return
    let frame = 0
    const timer = window.setTimeout(() => {
      const start = performance.now()
      const tick = (now: number) => {
        const t = Math.min(1, (now - start) / COUNT_MS)
        setValue(Math.round(to * (1 - (1 - t) ** 3)))
        if (t < 1) frame = requestAnimationFrame(tick)
      }
      frame = requestAnimationFrame(tick)
    }, delay)
    return () => { window.clearTimeout(timer); cancelAnimationFrame(frame) }
  }, [to, delay])
  return value
}

function Stat({ stat, delay }: { stat: ResultStat; delay: number }) {
  const value = useCountUp(stat.value, delay)
  return <div className="result-stat"><b>{value}</b><small>{stat.label}</small></div>
}

/** The game-over heading: a banner that unrolls (gold for a win, violet for a loss, silver for a draw) over stats that count up. */
export function ResultBanner({ title, tone, stats }: { title: string; tone: ResultTone; stats: ResultStat[] }) {
  return (
    <div className={`result-banner ${tone}`}>
      <div className="result-scroll"><p className="confirm-title">{title}</p></div>
      {stats.length > 0 && (
        <div className="result-stats">{stats.map((s, i) => <Stat key={s.label} stat={s} delay={380 + i * 160} />)}</div>
      )}
    </div>
  )
}
