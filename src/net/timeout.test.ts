import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { withTimeout } from './timeout'

describe('withTimeout', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('passes through a result that arrives in time', async () => {
    await expect(withTimeout(Promise.resolve(7), 1000, 'late')).resolves.toBe(7)
  })

  it('passes through a rejection that arrives in time', async () => {
    await expect(withTimeout(Promise.reject(new Error('bad')), 1000, 'late')).rejects.toThrow('bad')
  })

  it('rejects and tidies up when the promise is too slow', async () => {
    const tidy = vi.fn()
    const slow = withTimeout(new Promise<number>(() => {}), 1000, 'late', tidy)
    const caught = expect(slow).rejects.toThrow('late')
    await vi.advanceTimersByTimeAsync(1000)
    await caught
    expect(tidy).toHaveBeenCalledOnce()
  })
})
