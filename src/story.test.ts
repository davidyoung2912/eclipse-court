import { beforeEach, describe, expect, it } from 'vitest'
import { BONDS, CHAPTERS } from './engine/data/story'
import { achievements, availableBonds, bondRead, markBondRead, chapterRead, chapterUnlocked, cleanVictory, endingChapter, recordEnding, markChapterRead, metCharacters, recordStoryLoss, recordStoryWin, resetStory, visibleBeats, storySnapshot, storySummary, subscribeStory } from './story'

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

  it('keeps a won battle\'s character states and a lost battle\'s count apart from the rest', () => {
    recordStoryLoss('meridian-road')
    expect(storySnapshot().read.has('meridian-road')).toBe(false)
    expect(storySnapshot().losses['meridian-road']).toBe(1)
    recordStoryWin('meridian-road', { wren: 'wounded' })
    expect(chapterRead('meridian-road')).toBe(true)
    expect(storySnapshot().characters).toEqual({ wren: 'wounded' })
  })

  it('shows conditional lines only when they hold', () => {
    const chapter = CHAPTERS.find((c) => c.id === 'meridian-road')!
    const text = (s = storySnapshot()) => visibleBeats(chapter.beats, s).map((b) => b.text)
    expect(text().some((t) => t.includes('careful, and fast'))).toBe(true)
    expect(text().some((t) => t.includes('careful, and slow'))).toBe(false)
    expect(text().some((t) => t.includes('coin toss'))).toBe(false)
    recordStoryLoss('meridian-road')
    recordStoryWin('x', { wren: 'wounded' })
    expect(text().some((t) => t.includes('careful, and slow'))).toBe(true)
    expect(text().some((t) => t.includes('coin toss'))).toBe(true)
  })

  it('lists the characters of chapters read as met', () => {
    expect(metCharacters(storySnapshot())).toEqual([])
    markChapterRead('meridian-road')
    expect(metCharacters(storySnapshot())).toEqual(expect.arrayContaining(['wren', 'voss']))
  })

  it('remembers the ending chosen, lets it be changed, and opens the clean-victory ending only without losses', () => {
    const final = endingChapter()!
    expect(storySnapshot().ending).toBeNull()
    recordEnding('free')
    expect(storySnapshot().ending).toBe('free')
    recordEnding('solarch')
    expect(storySnapshot().ending).toBe('solarch')
    expect(cleanVictory(storySnapshot(), final.id)).toBe(true)
    recordStoryLoss(final.id)
    expect(cleanVictory(storySnapshot(), final.id)).toBe(false)
    resetStory()
    expect(storySnapshot().ending).toBeNull()
  })

  it('opens a bond once its chapter is read and remembers reading it without counting it as a chapter', () => {
    expect(availableBonds(storySnapshot())).toEqual([])
    const bond = BONDS[0]
    markChapterRead(bond.after)
    expect(availableBonds(storySnapshot()).map((b) => b.id)).toContain(bond.id)
    expect(bondRead(storySnapshot(), bond.id)).toBe(false)
    markBondRead(bond.id)
    expect(bondRead(storySnapshot(), bond.id)).toBe(true)
    expect(chapterRead(bond.id)).toBe(false)
  })

  it('earns achievements from the saved story alone', () => {
    const earned = () => achievements(storySnapshot()).filter((a) => a.earned).map((a) => a.id)
    expect(earned()).toEqual([])
    markChapterRead('prologue')
    expect(earned()).toEqual(['stilling'])
    CHAPTERS.forEach((c) => markChapterRead(c.id))
    BONDS.forEach((b) => markBondRead(b.id))
    recordEnding('solarch')
    expect(earned()).toEqual(expect.arrayContaining(['whole-tale', 'clean', 'resolved', 'close-company']))
    recordStoryLoss(endingChapter()!.id)
    expect(earned()).not.toContain('clean')
  })
})
