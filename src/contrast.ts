import { THEMES, type Theme } from './settings'

/** The colours the base stylesheet sets on `:root`, which a theme overrides. */
export const BASE_COLOURS: Record<string, string> = {
  '--solari-gold': '#e8b64a', '--solari-cream': '#fbf1d4', '--umbral-indigo': '#2b2468', '--umbral-violet': '#8a6ed6',
  '--bg': '#14102b', '--fg': '#f4eefc',
}

const channel = (v: number) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)

/** WCAG relative luminance of a `#rrggbb` colour. */
export function luminanceOf(hex: string): number {
  const n = parseInt(hex.slice(1), 16)
  return 0.2126 * channel(((n >> 16) & 255) / 255) + 0.7152 * channel(((n >> 8) & 255) / 255) + 0.0722 * channel((n & 255) / 255)
}

/** WCAG contrast ratio of two colours, from 1 to 21. */
export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [luminanceOf(a), luminanceOf(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

/** Text needs 4.5:1 (WCAG 1.4.3); a control or graphic needs 3:1 (1.4.11). */
export const TEXT_MIN = 4.5
export const UI_MIN = 3

export interface Pair { name: string; fg: string; bg: string; min: number }

/** The foreground and background pairs a theme must keep apart: body text, and the court colours used as text and as outlines on the page. */
export function pairsOf(theme: Theme): Pair[] {
  const v = { ...BASE_COLOURS, ...theme.vars }
  return [
    { name: 'text on page', fg: v['--fg'], bg: v['--bg'], min: TEXT_MIN },
    { name: 'Solari text on page', fg: v['--solari-gold'], bg: v['--bg'], min: TEXT_MIN },
    { name: 'Umbral text on page', fg: v['--umbral-violet'], bg: v['--bg'], min: TEXT_MIN },
    { name: 'Solari piece on Umbral square', fg: v['--solari-gold'], bg: v['--umbral-indigo'], min: UI_MIN },
  ]
}

/** Every failing pair of every theme, for the test and the script. */
export function contrastFailures(themes: readonly Theme[] = THEMES): string[] {
  return themes.flatMap((t) => pairsOf(t).flatMap((p) => {
    const r = contrastRatio(p.fg, p.bg)
    return r < p.min ? [`${t.name}: ${p.name} is ${r.toFixed(2)}:1, needs ${p.min}:1`] : []
  }))
}
