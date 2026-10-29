import { describe, expect, it } from 'vitest'
import { contrastFailures, contrastRatio } from './contrast'
import { THEMES } from './settings'

describe('contrast', () => {
  it('measures black on white as 21:1 and a colour on itself as 1:1', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 5)
    expect(contrastRatio('#336699', '#336699')).toBeCloseTo(1, 5)
  })

  it('keeps every theme, paid ones included, at WCAG AA for text and outlines', () => {
    expect(contrastFailures(THEMES)).toEqual([])
  })
})
