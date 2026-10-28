import { describe, expect, it } from 'vitest'
import { LINE_CATEGORIES } from './engine/data/personaLines'
import { moodFor } from './mood'

describe('moodFor', () => {
  it('is pleased by a capture and stung by a loss', () => {
    expect(moodFor('capture')).toBe('pleased')
    expect(moodFor('duel-win')).toBe('pleased')
    expect(moodFor('lose-piece')).toBe('stung')
    expect(moodFor('lose')).toBe('stung')
  })

  it('is alarmed by danger and awed by the Eclipse', () => {
    expect(moodFor('danger')).toBe('alarmed')
    expect(moodFor('eclipse')).toBe('awed')
  })

  it('leaves the face alone for quiet events', () => {
    expect(moodFor(null)).toBeNull()
    for (const quiet of ['open', 'idle', 'spell', 'greet', 'rematch'] as const) expect(moodFor(quiet)).toBeNull()
  })

  it('only returns moods for known categories', () => {
    for (const c of LINE_CATEGORIES) expect(['calm', 'pleased', 'stung', 'alarmed', 'awed', null]).toContain(moodFor(c))
  })
})
