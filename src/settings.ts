import { LOCALES, getLocale, setLocale } from './i18n'

const SETTINGS_KEY = 'eclipse-court:settings'

/** A palette for the board and pieces; cosmetic only. Themes open as campaign stars are earned. */
export interface Theme {
  id: string
  name: string
  stars: number
  /** Shards to buy it in the Collection; themes without a cost are free (or open with stars). */
  cost?: number
  /** CSS custom properties set on the page. */
  vars: Record<string, string>
}

export const THEMES: readonly Theme[] = [
  { id: 'twilight', name: 'Twilight', stars: 0, vars: {} },
  {
    // Blue against orange stays apart for the common kinds of colour blindness.
    id: 'clearsight', name: 'Clear Sight', stars: 0,
    vars: {
      '--solari-gold': '#ffb000', '--solari-cream': '#fff1cc', '--umbral-indigo': '#0b1f3f', '--umbral-violet': '#3b8bff',
      '--bg': '#08101c', '--pane-s0': '#ffc233', '--pane-s1': '#e69100', '--pane-s2': '#fff0b8',
      '--pane-u0': '#2a74e0', '--pane-u1': '#0d2f66', '--pane-u2': '#8fc0ff',
    },
  },
  {
    id: 'ember', name: 'Ember', stars: 2,
    vars: {
      '--solari-gold': '#f08a3c', '--solari-cream': '#ffe6d0', '--umbral-indigo': '#3a1420', '--umbral-violet': '#c0505a',
      '--bg': '#1c0d12', '--pane-s0': '#f5a05c', '--pane-s1': '#d4572e', '--pane-s2': '#ffd2a0',
      '--pane-u0': '#a8404c', '--pane-u1': '#5c1a2a', '--pane-u2': '#d08a5a',
    },
  },
  {
    id: 'frost', name: 'Frost', stars: 5,
    vars: {
      '--solari-gold': '#8ad0f0', '--solari-cream': '#eaf6ff', '--umbral-indigo': '#12284a', '--umbral-violet': '#5a82d8',
      '--bg': '#0c1a30', '--pane-s0': '#a8dcf5', '--pane-s1': '#5aa8d8', '--pane-s2': '#e0f2ff',
      '--pane-u0': '#3c64b8', '--pane-u1': '#1a3470', '--pane-u2': '#6ad0c0',
    },
  },
  {
    id: 'verdant', name: 'Verdant', stars: 9,
    vars: {
      '--solari-gold': '#b8d860', '--solari-cream': '#f2f8d8', '--umbral-indigo': '#16301e', '--umbral-violet': '#4aa878',
      '--bg': '#0d1c12', '--pane-s0': '#c8e070', '--pane-s1': '#7ab648', '--pane-s2': '#eef6b8',
      '--pane-u0': '#388a5c', '--pane-u1': '#1c4a30', '--pane-u2': '#c8a050',
    },
  },
  {
    id: 'obsidian', name: 'Obsidian', stars: 0, cost: 120,
    vars: {
      '--solari-gold': '#e8ecf2', '--solari-cream': '#ffffff', '--umbral-indigo': '#101014', '--umbral-violet': '#7c8296',
      '--bg': '#07070a', '--pane-s0': '#f4f6fa', '--pane-s1': '#aab2c2', '--pane-s2': '#ffffff',
      '--pane-u0': '#5c6274', '--pane-u1': '#20222c', '--pane-u2': '#8a92a8',
    },
  },
  {
    id: 'rosegold', name: 'Rose Gold', stars: 0, cost: 150,
    vars: {
      '--solari-gold': '#f0b8a0', '--solari-cream': '#fff0e8', '--umbral-indigo': '#2a1230', '--umbral-violet': '#b0609c',
      '--bg': '#170a1c', '--pane-s0': '#f8cdb8', '--pane-s1': '#d8907c', '--pane-s2': '#fff0e4',
      '--pane-u0': '#9a4c88', '--pane-u1': '#4a1c58', '--pane-u2': '#d89ac0',
    },
  },
  {
    id: 'sandstorm', name: 'Sandstorm', stars: 0, cost: 150,
    vars: {
      '--solari-gold': '#e0b860', '--solari-cream': '#fbf0d0', '--umbral-indigo': '#0e2c34', '--umbral-violet': '#2c9aa0',
      '--bg': '#0a1c22', '--pane-s0': '#ecc878', '--pane-s1': '#c08c3c', '--pane-s2': '#fcefc4',
      '--pane-u0': '#24848c', '--pane-u1': '#0e4450', '--pane-u2': '#d8a860',
    },
  },
]

export interface Settings {
  theme: string
  /** Stop animation and screen shake whatever the device asks for. */
  reduceMotion: boolean
  /** Tone down flashes: no white hit flash, steady instead of pulsing warnings, no sudden brightening. */
  reduceFlashes: boolean
  /** A glimmer sweeps across a button when the mouse moves onto it. */
  buttonSheen: boolean
  /** Write the light level (+ or −) on every square, so colour is never the only clue. */
  marks: boolean
  /** Larger text and bigger buttons. */
  largeUi: boolean
  /** Ring your pieces an enemy could attack next turn, and show the odds of each attack you could make. */
  aids: boolean
  /** Say in one line why the AI played each move. */
  aiWhy: boolean
  /** Mark the squares the latest move left and reached. */
  lastMove: boolean
  /** Mark each square that will grow lighter or darker next round, and the odds shift for a selected piece's attacks. */
  forecast: boolean
  /** Ask before a move that steps into an enemy's reach on bad odds, or leaves the Leader exposed. */
  blunderCheck: boolean
  /** Show a fuller breakdown in the attack confirm: wounds, perks, status, cell effects and the odds once the light turns. */
  oddsDetail: boolean
  /** Mark Beacons you could take this turn and list the spells you could cast. */
  reminders: boolean
  /** Show a chip by the dial counting the rounds until the Eclipse falls. */
  eclipseChip: boolean
  /** Help in live duels: a longer aim line, bigger hit markers and a gentler last few seconds. Off in scored, daily and puzzle games. */
  duelAssist: boolean
  /** How many hints a match allows: Unlimited, Three per match, or Off (the button is hidden). Puzzles keep their own hints. */
  hints: HintLimit
  /** When Undo is offered: Always, Casual games only (skirmish and hot-seat), or Off. Daily and scored games never allow it. */
  takeBacks: TakeBackRule
  /** How fast live duels play: Normal is the slowed pace, Fast is full speed, Instant settles every duel without playing it. */
  duelSpeed: DuelSpeed
  /** Short vibrations for selecting, moving and capturing (where the device can). */
  haptics: boolean
  /** How hard fights against the AI are: Easy helps newer players, Hard asks more of experienced ones. */
  fightDifficulty: FightLevel
  /** How much named opponents talk: Full, Quiet (results and the Eclipse only) or Off. */
  banter: BanterLevel
  /** The language of the text moved behind `t`; a code from `LOCALES`. */
  language: string
}

export type HintLimit = 'unlimited' | 'three' | 'off'
export const HINT_LIMITS: readonly HintLimit[] = ['unlimited', 'three', 'off']
/** Hints a match allows under Three per match. */
export const HINTS_PER_MATCH = 3

export type TakeBackRule = 'always' | 'casual' | 'off'
export const TAKE_BACK_RULES: readonly TakeBackRule[] = ['always', 'casual', 'off']

export type BanterLevel = 'full' | 'quiet' | 'off'
export const BANTER_LEVELS: readonly BanterLevel[] = ['full', 'quiet', 'off']

export type FightLevel = 'easy' | 'normal' | 'hard'
export const FIGHT_LEVELS: readonly FightLevel[] = ['easy', 'normal', 'hard']

/** In the last seconds of an assisted duel the fight plays at this share of its pace, for both fighters. */
export const ASSIST_SLOWDOWN = 0.7
/** How many seconds from the end the slow-down lasts. */
export const ASSIST_SLOW_SECONDS = 5

export type DuelSpeed = 'normal' | 'fast' | 'instant'
export const DUEL_SPEEDS: readonly DuelSpeed[] = ['normal', 'fast', 'instant']
/** The share of full speed a live duel plays at for each setting. */
export const DUEL_PACE: Record<DuelSpeed, number> = { normal: 0.55, fast: 1, instant: 1 }

export const DEFAULT_SETTINGS: Settings = { theme: 'twilight', reduceMotion: false, reduceFlashes: false, buttonSheen: false, marks: false, largeUi: false, aids: false, aiWhy: false, lastMove: false, forecast: false, eclipseChip: false, blunderCheck: false, oddsDetail: false, reminders: false, duelAssist: false, hints: 'unlimited', takeBacks: 'always', duelSpeed: 'normal', haptics: true, fightDifficulty: 'normal', banter: 'full', language: 'en' }

/** Flashes are toned down when asked for, and whenever motion is reduced. */
export const flashesReduced = (s: Pick<Settings, 'reduceMotion' | 'reduceFlashes'> = getSettings()) => s.reduceMotion || s.reduceFlashes

export const themeById = (id: string) => THEMES.find((t) => t.id === id) ?? THEMES[0]
export const themeUnlocked = (theme: Theme, stars: number) => stars >= theme.stars

/** A stored value made safe to use: unknown or damaged fields fall back to the defaults. */
export function parseSettings(raw: unknown): Settings {
  const o = (raw && typeof raw === 'object' ? raw : {}) as Partial<Settings>
  return {
    theme: typeof o.theme === 'string' && THEMES.some((t) => t.id === o.theme) ? o.theme : DEFAULT_SETTINGS.theme,
    reduceMotion: o.reduceMotion === true,
    reduceFlashes: o.reduceFlashes === true,
    buttonSheen: o.buttonSheen === true,
    marks: o.marks === true,
    largeUi: o.largeUi === true,
    aids: o.aids === true,
    aiWhy: o.aiWhy === true,
    lastMove: o.lastMove === true,
    forecast: o.forecast === true,
    eclipseChip: o.eclipseChip === true,
    blunderCheck: o.blunderCheck === true,
    oddsDetail: o.oddsDetail === true,
    reminders: o.reminders === true,
    duelAssist: o.duelAssist === true,
    hints: HINT_LIMITS.includes(o.hints as HintLimit) ? (o.hints as HintLimit) : DEFAULT_SETTINGS.hints,
    takeBacks: TAKE_BACK_RULES.includes(o.takeBacks as TakeBackRule) ? (o.takeBacks as TakeBackRule) : DEFAULT_SETTINGS.takeBacks,
    duelSpeed: DUEL_SPEEDS.includes(o.duelSpeed as DuelSpeed) ? (o.duelSpeed as DuelSpeed) : DEFAULT_SETTINGS.duelSpeed,
    haptics: o.haptics !== false,
    fightDifficulty: FIGHT_LEVELS.includes(o.fightDifficulty as FightLevel) ? (o.fightDifficulty as FightLevel) : DEFAULT_SETTINGS.fightDifficulty,
    banter: BANTER_LEVELS.includes(o.banter as BanterLevel) ? (o.banter as BanterLevel) : DEFAULT_SETTINGS.banter,
    language: typeof o.language === 'string' && LOCALES.some((l) => l.code === o.language) ? o.language : DEFAULT_SETTINGS.language,
  }
}

let current: Settings | null = null

export function getSettings(): Settings {
  if (current) return current
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    current = parseSettings(raw ? JSON.parse(raw) : null)
  } catch {
    current = { ...DEFAULT_SETTINGS }
  }
  return current
}

/** Applies the settings to the page: theme variables and the reduced-motion switch. */
export function applySettings(s: Settings = getSettings()) {
  setLocale(s.language)
  if (typeof document === 'undefined') return
  const root = document.documentElement
  for (const t of THEMES) for (const k of Object.keys(t.vars)) root.style.removeProperty(k)
  for (const [k, v] of Object.entries(themeById(s.theme).vars)) root.style.setProperty(k, v)
  root.dataset.motion = s.reduceMotion ? 'reduced' : 'full'
  root.dataset.flashes = flashesReduced(s) ? 'reduced' : 'full'
  root.dataset.size = s.largeUi ? 'large' : 'normal'
  root.lang = getLocale()
}

export function updateSettings(patch: Partial<Settings>): Settings {
  current = parseSettings({ ...getSettings(), ...patch })
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(current))
  } catch {
    // Settings are a convenience; they simply do not persist without storage.
  }
  applySettings(current)
  return current
}
