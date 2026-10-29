import { aiLoadout } from '../engine/data/aiDraft'
import { PERSONALITIES, type PersonalityId } from '../engine/data/personality'
import type { GameState, MatchMode } from '../engine/rules/types'
import { playGame } from './game'
import { modeGames } from './modes'

/** The target is an even split; the full scripts hold it to about 40-60% over hundreds of games. */
export const TARGET_BAND = 0.1
/** How many standard deviations of sampling noise a small batch is allowed on top of the target band. */
const NOISE_SIGMAS = 1.5

/** The share a fair side may score over `games` games: the target band widened by sampling noise, so small seeded batches only fail on a real skew. */
export function bandFor(games: number): { lo: number; hi: number } {
  const slack = TARGET_BAND + NOISE_SIGMAS * Math.sqrt(0.25 / Math.max(1, games))
  return { lo: Math.max(0, 0.5 - slack), hi: Math.min(1, 0.5 + slack) }
}

/** Solari's score: a win is one point, a draw half. Unfinished games do not count. */
export function solariShare(winners: readonly GameState['winner'][]): number {
  const done = winners.filter((w) => w)
  if (!done.length) return 0.5
  return done.reduce((sum, w) => sum + (w === 'solari' ? 1 : w === 'draw' ? 0.5 : 0), 0) / done.length
}

/** A court's score is in band when neither court runs away with the batch. */
export function courtsInBand(share: number, games: number): boolean {
  const { lo, hi } = bandFor(games)
  return share >= lo && share <= hi
}

/** Games per mode (the classic board is the Beacons mode): the Beacon modes cost most, so they get fewer and a wider band. */
export const MODE_BATCH: Partial<Record<MatchMode, number>> = { beacons: 8, leader: 8, score: 16, hill: 16 }

export interface ModeBalance { mode: MatchMode; games: number; share: number; unfinished: number }

export function modeBalance(mode: MatchMode, games: number, seed = 1): ModeBalance {
  const results = modeGames(games, { mode, events: true, showdown: true }, seed)
  return { mode, games, share: solariShare(results.map((r) => r.winner)), unfinished: results.filter((r) => !r.winner).length }
}

export const STYLES = Object.keys(PERSONALITIES) as PersonalityId[]
/** The quick modes keep a styles batch cheap; the full `npm run styles` covers them all. */
export const STYLE_MODES: MatchMode[] = ['score', 'hill']
/** A style's score may sit further from even than a court's, since some styles are meant to be a little stronger. */
export const STYLE_BAND = { lo: 0.2, hi: 0.8 }

export interface StyleScore { style: PersonalityId; played: number; points: number; unfinished: number }

/** Every style meets every other once from each court in each quick mode. */
export function styleScores(seed = 7): StyleScore[] {
  const rows = new Map(STYLES.map((s) => [s, { style: s, played: 0, points: 0, unfinished: 0 }]))
  for (const mode of STYLE_MODES)
    for (const a of STYLES)
      for (const b of STYLES) {
        if (a === b) continue
        const loadouts = { solari: aiLoadout(seed, 'solari'), umbral: aiLoadout(seed + 1, 'umbral') }
        const r = playGame(seed, 'normal', 'normal', 600, { loadouts, mode }, { solari: a, umbral: b })
        const [ra, rb] = [rows.get(a)!, rows.get(b)!]
        ra.played++
        rb.played++
        const w = r.state.winner
        if (!w) { ra.unfinished++; rb.unfinished++ }
        else if (w === 'draw') { ra.points += 0.5; rb.points += 0.5 }
        else (w === 'solari' ? ra : rb).points++
      }
  return [...rows.values()]
}
