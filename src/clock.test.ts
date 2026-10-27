import { describe, expect, it } from 'vitest'
import { bankAfter, readClock, startingBank } from './clock'

const clock = { seconds: 15, bank: 30 }

describe('turn clock', () => {
  it('counts down the allowance, then the bank', () => {
    const bank = startingBank(clock)
    expect(readClock(clock, 0, bank)).toMatchObject({ turn: 15, bank: 30, total: 45, expired: false, urgent: false })
    expect(readClock(clock, 14_500, bank)).toMatchObject({ turn: 1, bank: 30, total: 31 })
    expect(readClock(clock, 20_000, bank)).toMatchObject({ turn: 0, bank: 25, total: 25 })
  })

  it('expires when allowance and bank are both gone', () => {
    expect(readClock(clock, 44_999, 30_000).expired).toBe(false)
    expect(readClock(clock, 45_000, 30_000).expired).toBe(true)
    expect(readClock({ seconds: 10 }, 10_000, 0)).toMatchObject({ expired: true, total: 0 })
  })

  it('turns urgent in the last five seconds only', () => {
    expect(readClock({ seconds: 10 }, 4_000, 0).urgent).toBe(false)
    expect(readClock({ seconds: 10 }, 5_000, 0).urgent).toBe(true)
    expect(readClock({ seconds: 10 }, 10_000, 0).urgent).toBe(false)
  })

  it('spends the bank only on time beyond the allowance', () => {
    expect(bankAfter(clock, 10_000, 30_000)).toBe(30_000)
    expect(bankAfter(clock, 25_000, 30_000)).toBe(20_000)
    expect(bankAfter(clock, 99_000, 30_000)).toBe(0)
    expect(startingBank({ seconds: 10 })).toBe(0)
  })
})
