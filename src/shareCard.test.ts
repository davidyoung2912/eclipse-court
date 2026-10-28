import { describe, expect, it } from 'vitest'
import { matchConfig } from './engine/data/matchConfig'
import { replaySteps } from './engine/log'
import { newGame } from './engine/reducer'
import { cardModel, clipFrames, lumRgb, ruleTags } from './shareCard'

const steps = replaySteps(newGame(matchConfig({ seed: 5 })), [{ type: 'pass' }])!

describe('share card', () => {
  it('words an unfinished game and counts the pieces', () => {
    const model = cardModel(steps)
    expect(model.headline).toBe('Game in progress')
    expect(model.detail).toMatch(/1 move\./)
    expect(model.detail).toMatch(/Solari \d+ left, Umbral \d+ left/)
  })

  it('names the winner or a draw', () => {
    const last = steps[steps.length - 1]
    const won = [...steps.slice(0, -1), { ...last, state: { ...last.state, winner: 'umbral' as const } }]
    expect(cardModel(won).headline).toBe('Umbral won')
    expect(cardModel([{ ...last, state: { ...last.state, winner: 'draw' as const } }]).headline).toBe('A drawn game')
  })

  it('tags the rules that are on', () => {
    expect(ruleTags(matchConfig({ seed: 1, events: true, showdown: true, size: 9 }))).toEqual(expect.arrayContaining(['Day events', 'Showdown', 'Grand 9x9']))
    expect(ruleTags(matchConfig({ seed: 1 }))).toContain('7x7')
  })

  it('blends light from indigo to cream', () => {
    expect(lumRgb(-2)).toBe('rgb(43, 36, 104)')
    expect(lumRgb(2)).toBe('rgb(251, 241, 212)')
  })

  it('samples a long game evenly and ends on the last position', () => {
    expect(clipFrames(5)).toEqual([0, 1, 2, 3, 4])
    const frames = clipFrames(1000, 10)
    expect(frames).toHaveLength(10)
    expect(frames[0]).toBe(0)
    expect(frames[9]).toBe(999)
  })
})
