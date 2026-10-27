import { useEffect, useState } from 'react'
import { sfx } from '../audio/synth'
import { bankAfter, readClock, startingBank } from '../clock'
import type { Court, TurnClock } from '../engine/rules/types'
import { useLatest } from './useLatest'

interface Options {
  clock: TurnClock | undefined
  /** The court whose turn is being timed. */
  turn: Court
  /** Length of the game's history, which identifies the turn being timed. */
  turnId: number
  /** The clock only counts while this holds (not during duels, dialogs, the pass screen or the AI's turn). */
  running: boolean
  /** Whether the time spent belongs to a person, so their bank is charged when they play. */
  charge: boolean
  /** Called once when the turn runs out. */
  onExpire: () => void
}

/** Blitz: time used so far on the current turn, and the bank each court has left. */
export function useTurnClock({ clock, turn, turnId, running, charge, onExpire }: Options) {
  const [turnMs, setTurnMs] = useState({ at: -1, ms: 0 })
  const [banks, setBanks] = useState<Record<Court, number>>(() => {
    const bank = clock ? startingBank(clock) : 0
    return { solari: bank, umbral: bank }
  })
  const elapsed = turnMs.at === turnId ? turnMs.ms : 0
  const reading = clock ? readClock(clock, elapsed, banks[turn]) : null

  // The clock only counts while it runs; time is added from the real gap between ticks.
  useEffect(() => {
    if (!running) return
    let last = Date.now()
    const timer = setInterval(() => {
      const now = Date.now()
      const dt = now - last
      last = now
      setTurnMs((t) => ({ at: turnId, ms: (t.at === turnId ? t.ms : 0) + dt }))
    }, 100)
    return () => clearInterval(timer)
  }, [running, turnId])

  // A tick for each of the last few seconds.
  const urgentSecond = reading?.urgent && running ? reading.total : null
  useEffect(() => {
    if (urgentSecond !== null) sfx.tick()
  }, [urgentSecond])

  // Out of time: the turn is passed for the player, as any other pass.
  const expire = useLatest(onExpire)
  const expired = running && !!reading?.expired
  useEffect(() => {
    if (expired) expire()
  }, [expired, expire])

  return {
    elapsed,
    reading,
    banks,
    /** Charges the turn just played against the bank. */
    spend: () => {
      if (clock && charge) setBanks((b) => ({ ...b, [turn]: bankAfter(clock, elapsed, b[turn]) }))
    },
    /** Forgets the time used so far, as when a move is taken back. */
    reset: () => setTurnMs({ at: -1, ms: 0 }),
  }
}
