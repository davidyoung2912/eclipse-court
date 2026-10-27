import { beforeEach, describe, expect, it } from 'vitest'
import { CHAPTERS } from './engine/data/story'
import { chapterRead, chapterUnlocked, markChapterRead, resetStory, storySnapshot, storySummary, subscribeStory } from './story'

describe('story progress', () => {
  beforeEach(() => resetStory())

  it('remembers a read chapter until reset', () => {
    expect(chapterRead('prologue')).toBe(false)
    markChapterRead('prologue')
    expect(chapterRead('prologue')).toBe(true)
    resetStory()
    expect(chapterRead('prologue')).toBe(false)
  })

  it('notifies listeners and changes the snapshot only on a new chapter', () => {
    let calls = 0
    const off = subscribeStory(() => { calls++ })
    const before = storySnapshot()
    markChapterRead('prologue')
    expect(storySnapshot()).not.toBe(before)
    markChapterRead('prologue')
    expect(calls).toBe(1)
    off()
    markChapterRead('other')
    expect(calls).toBe(1)
  })

  it('opens the first chapter at once and the rest in order', () => {
    expect(chapterUnlocked(0, new Set())).toBe(true)
    if (CHAPTERS.length > 1) {
      expect(chapterUnlocked(1, new Set())).toBe(false)
      expect(chapterUnlocked(1, new Set([CHAPTERS[0].id]))).toBe(true)
    }
  })

  it('summarises how much has been read', () => {
    expect(storySummary(new Set())).toMatch(/courts/)
    expect(storySummary(new Set([CHAPTERS[0].id]))).toBe(`1 of ${CHAPTERS.length} chapters read`)
  })
})
