import { describe, expect, it } from 'vitest'
import { DIFFICULTY_LIST } from './difficulty'
import { playFrom, checkInvariants } from '../../sim/game'
import { readRun } from '../../run'
import { CLASSIC_ROLES, MAX_DRAFTED } from './draft'
import {
  applyReward, applyVictory, GAUNTLET_STAGES, MAX_ASCENSION, MAX_BONUS, parseRunCode, relicRules, restStages, runCode, runSummary, REST_STAGES, roster, runReward, runWon, stageFoe, stageGame, startRun, type Run,
} from './gauntlet'
import { ROLE_STATS } from './roster'
import { validConfig } from '../serialize'
import { VETERAN_WINS } from '../rules/growth'
import { otherCourt } from '../rules/board'
import type { GameState } from '../rules/types'

const newRun = (court: 'solari' | 'umbral' = 'solari', seed = 7) => startRun(court, CLASSIC_ROLES, seed)

describe('stage generator', () => {
  it('is deterministic and gets harder', () => {
    for (let s = 1; s <= GAUNTLET_STAGES; s++) expect(stageFoe(5, s)).toEqual(stageFoe(5, s))
    expect(stageFoe(5, 1).difficulty).toBe('easy')
    expect(stageFoe(5, GAUNTLET_STAGES).difficulty).toBe('hard')
    expect(stageFoe(5, 1).tags).toEqual([])
    expect(stageFoe(5, GAUNTLET_STAGES).boss).toBe(true)
    expect(stageFoe(5, GAUNTLET_STAGES).rules.eclipseRound).toBe(20)
    expect(stageFoe(5, 1).army.length).toBeLessThan(stageFoe(5, GAUNTLET_STAGES).army.length)
    expect(DIFFICULTY_LIST).toContain(stageFoe(9, 4).difficulty)
  })

  it('never draws two win conditions', () => {
    for (let seed = 1; seed < 60; seed++)
      for (let s = 1; s <= GAUNTLET_STAGES; s++) {
        const tags = stageFoe(seed, s).tags.filter((t) => ['Capture their Leader', 'Score race', 'King of the Hill'].includes(t))
        expect(tags.length).toBeLessThanOrEqual(1)
      }
  })
})

describe('building a fight', () => {
  it('fields the army with its earned strength, for either court', () => {
    for (const court of ['solari', 'umbral'] as const) {
      const run = newRun(court)
      run.army[0] = { role: 'footsoldier', wins: 2, bonus: 1, perk: undefined }
      run.army[1] = { role: 'footsoldier', wins: 4, bonus: 0, perk: 'ward' }
      const state = stageGame(run)
      expect(validConfig(state.config)).toBe(true)
      expect(checkInvariants(state)).toEqual([])
      const mine = state.pieces.filter((p) => p.court === court)
      expect(mine).toHaveLength(roster(run).length)
      expect(state.pieces.filter((p) => p.court === otherCourt(court))).toHaveLength(stageFoe(run.seed, 1).army.length + 1)
      const first = mine.find((p) => p.id === `${court}-run-1`)!
      expect(first).toMatchObject({ role: 'footsoldier', wins: 2, maxHp: ROLE_STATS.footsoldier.hp + 2, hp: ROLE_STATS.footsoldier.hp + 2 })
      expect(mine.find((p) => p.id === `${court}-run-2`)).toMatchObject({ perk: 'ward', wins: 4 })
      expect(state.config.growth).toBe(true)
      expect(state.config.loadouts![court]).toEqual(run.loadout)
    }
  })

  it('applies relics to the match', () => {
    const run = { ...newRun(), relics: ['moonwell', 'dawnstone', 'banner', 'hourglass'] as Run['relics'] }
    const { config } = stageGame(run)
    expect(config).toMatchObject({ recharge: 8, promotion: true })
    expect(config.eclipseRound).toBe(38)
    expect(config.day).toHaveLength(10)
  })
})

/** The position after the player's army has won: every piece alive, but for the ones named. */
const afterWin = (run: Run, lose: number[] = [], wins = 0): GameState => {
  const state = stageGame(run)
  return {
    ...state,
    winner: run.court,
    pieces: state.pieces
      .filter((p) => !(p.court === run.court && lose.some((i) => p.id === `${run.court}-run-${i}`)))
      .map((p) => (p.court === run.court ? { ...p, wins: (p.wins ?? 0) + wins } : p)),
  }
}

describe('after a win', () => {
  it('keeps survivors, sets the fallen aside and offers rewards', () => {
    const run = newRun()
    const next = applyVictory(run, afterWin(run, [3, 4], 1))
    expect(next.stage).toBe(2)
    expect(next.army).toHaveLength(run.army.length - 2)
    expect(next.fallen).toHaveLength(2)
    expect(next.army.every((p) => p.wins === 1)).toBe(true)
    expect(next.leader.wins).toBe(1)
    expect(next.offers!.length).toBeGreaterThan(0)
    expect(next.offers!.length).toBeLessThanOrEqual(3)
  })

  it('turns two wins into a Veteran whose extra HP is not counted as a reward', () => {
    const run = newRun()
    const state = afterWin(run, [], 2)
    state.pieces = state.pieces.map((p) => (p.court === run.court ? { ...p, maxHp: p.maxHp + 1 } : p))
    const next = applyVictory(run, state)
    expect(next.army.every((p) => p.bonus === 0 && p.wins === VETERAN_WINS)).toBe(true)
  })

  it('replaces a fallen Leader and wins the run after the last stage', () => {
    const run = newRun()
    const next = applyVictory(run, afterWin(run, [0]))
    expect(next.leader).toEqual({ role: 'leader', wins: 0, bonus: 0 })
    const last: Run = { ...run, stage: GAUNTLET_STAGES }
    const won = applyVictory(last, afterWin(last))
    expect(runWon(won)).toBe(true)
    expect(won.offers).toBeNull()
  })

  it('carries a promoted piece on in its new role', () => {
    const run = newRun()
    const state = afterWin(run)
    const i = roster(run).findIndex((p) => p.role === 'footsoldier')
    state.pieces = state.pieces.map((p) => (p.id === `solari-run-${i}` ? { ...p, role: 'charger', maxHp: 6, hp: 6 } : p))
    expect(applyVictory(run, state).army[i - 1]).toMatchObject({ role: 'charger', bonus: 0 })
  })
})

describe('rewards', () => {
  it('are deterministic and different offers each time they are rolled', () => {
    const run = newRun()
    expect(runReward(run, 11)).toEqual(runReward(run, 11))
    const kinds = new Set(Array.from({ length: 30 }, (_, i) => runReward(run, i).map((r) => r.kind).join()))
    expect(kinds.size).toBeGreaterThan(3)
  })

  it('offers a fallen piece at a rest stop', () => {
    const base: Run = { ...newRun(), stage: REST_STAGES[0] + 1, fallen: [{ role: 'bruiser', wins: 3, bonus: 0 }] }
    for (let i = 0; i < 10; i++) expect(runReward(base, i)[0]).toEqual({ kind: 'revive', target: 0 })
    const camp = applyReward(base, { kind: 'revive', target: 0 })
    expect(camp.army.at(-1)).toMatchObject({ role: 'bruiser', wins: 3 })
    expect(camp.fallen).toEqual([])
    expect(runReward({ ...base, stage: 3 }, 1).some((r) => r.kind === 'revive')).toBe(false)
  })

  it('apply, clear the offers and respect the caps', () => {
    const run: Run = { ...newRun(), offers: [{ kind: 'hp', target: 0 }] }
    const hp = applyReward(run, { kind: 'hp', target: 0 })
    expect(hp.leader.bonus).toBe(1)
    expect(hp.offers).toBeNull()
    expect(applyReward({ ...run, leader: { ...run.leader, bonus: MAX_BONUS } }, { kind: 'hp', target: 0 }).leader.bonus).toBe(MAX_BONUS)
    const perk = applyReward(run, { kind: 'perk', target: 1, perk: 'might' })
    expect(perk.army[0]).toMatchObject({ perk: 'might', wins: 4 })
    expect(applyReward(run, { kind: 'spell', spell: 'hasten' }).loadout).toContain('hasten')
    expect(applyReward(applyReward(run, { kind: 'relic', relic: 'banner' }), { kind: 'relic', relic: 'banner' }).relics).toEqual(['banner'])
    const full: Run = { ...run, army: Array.from({ length: MAX_DRAFTED }, () => ({ role: 'footsoldier' as const, wins: 0, bonus: 0 })) }
    expect(applyReward(full, { kind: 'piece', role: 'flier' }).army).toHaveLength(MAX_DRAFTED)
    expect(roster(applyReward(run, { kind: 'piece', role: 'flier' }))).toHaveLength(roster(run).length + 1)
  })
})

describe('saving a run', () => {
  it('round-trips and refuses damaged data', () => {
    const run = applyVictory(newRun(), afterWin(newRun(), [3], 1))
    expect(readRun(JSON.parse(JSON.stringify(run)))).toEqual(run)
    expect(readRun(null)).toBeNull()
    expect(readRun({ ...run, v: 99 })).toBeNull()
    expect(readRun({ ...run, stage: 99 })).toBeNull()
    expect(readRun({ ...run, army: [{ role: 'dragon', wins: 0, bonus: 0 }] })).toBeNull()
    expect(readRun({ ...run, offers: [{ kind: 'spell', spell: 'nope' }] })).toBeNull()
    expect(readRun({ ...run, loadout: ['nope'] })).toBeNull()
  })
})

describe('ascension', () => {
  it('leaves level 0 as it was and stacks harder rules on top', () => {
    for (let s = 1; s <= GAUNTLET_STAGES; s++) expect(stageFoe(5, s, 0)).toEqual(stageFoe(5, s))
    for (let a = 1; a <= MAX_ASCENSION; a++)
      for (let s = 1; s <= GAUNTLET_STAGES; s++) {
        const base = stageFoe(5, s, 0)
        const hard = stageFoe(5, s, a)
        expect(hard.hpBonus).toBeGreaterThan(base.hpBonus)
        expect(hard.tags.length).toBeGreaterThanOrEqual(base.tags.length)
      }
    expect(stageFoe(5, 1, 3).difficulty).toBe('normal')
    expect(stageFoe(5, GAUNTLET_STAGES, 3).difficulty).toBe('hard')
    expect(stageFoe(5, GAUNTLET_STAGES, 4).tags.length).toBe(stageFoe(5, GAUNTLET_STAGES, 0).tags.length + 1)
    expect(stageFoe(5, GAUNTLET_STAGES, 5).rules.eclipseRound).toBe(14)
    expect(restStages(1)).toEqual(REST_STAGES)
    expect(restStages(2)).toEqual([])
  })

  it('never draws two win conditions, even with an extra rule', () => {
    for (let seed = 1; seed < 60; seed++)
      for (let s = 1; s <= GAUNTLET_STAGES; s++) {
        const tags = stageFoe(seed, s, MAX_ASCENSION).tags.filter((t) => ['Capture their Leader', 'Score race', 'King of the Hill'].includes(t))
        expect(tags.length).toBeLessThanOrEqual(1)
      }
  })

  it('builds valid fights and skips camps at high ascension', () => {
    const run = startRun('umbral', CLASSIC_ROLES, 9, { ascension: MAX_ASCENSION })
    expect(run.ascension).toBe(MAX_ASCENSION)
    const state = stageGame({ ...run, relics: ['sundial', 'omen'] })
    expect(validConfig(state.config)).toBe(true)
    expect(state.config.passives).toBe(true)
    expect(state.config.events).toBe(true)
    expect(relicRules(['sundial', 'omen'])).toEqual({ passives: true, events: true })
    const camp: Run = { ...run, stage: REST_STAGES[0] + 1, fallen: [{ role: 'bruiser', wins: 3, bonus: 0 }] }
    for (let i = 0; i < 10; i++) expect(runReward(camp, i).some((r) => r.kind === 'revive')).toBe(false)
  })

  it('reads old saves as level 0 and keeps the level otherwise', () => {
    const run = newRun()
    const { ascension: _a, daily: _d, ...old } = run
    expect(readRun(old)).toMatchObject({ ascension: 0, daily: 0 })
    expect(readRun({ ...run, ascension: 3, daily: 20261101 })).toMatchObject({ ascension: 3, daily: 20261101 })
    expect(readRun({ ...run, ascension: 9 })?.ascension).toBe(0)
  })

  it('round-trips run codes and summarises a run', () => {
    expect(parseRunCode(runCode(123456, 3))).toEqual({ seed: 123456, ascension: 3 })
    expect(parseRunCode(' g2-ZZ '.toLowerCase())).toEqual({ seed: 1295, ascension: 2 })
    for (const bad of ['', 'G9-1', 'x1-2', 'G1-', 'G1-zzzzzzz']) expect(parseRunCode(bad)).toBeNull()
    const text = runSummary({ ...newRun(), ascension: 2 }, 4, false)
    expect(text).toContain('ascension 2')
    expect(text).toContain('fell at stage 4')
    expect(text).toContain(`Code ${runCode(7, 2)}`)
    expect(runSummary(newRun(), GAUNTLET_STAGES + 1, true)).toContain('WON')
  })
})

describe('gauntlet soak', () => {
  it('plays AI-vs-AI runs stage by stage without deadlocking or breaking the board', () => {
    for (const [court, seed] of [['solari', 3], ['umbral', 4]] as const) {
      let run = startRun(court, CLASSIC_ROLES, seed)
      const foeCourt = otherCourt(court)
      for (let guard = 0; guard < GAUNTLET_STAGES && !runWon(run); guard++) {
        const start = stageGame(run)
        const stage = stageFoe(run.seed, run.stage)
        const [solari, umbral] = court === 'solari' ? (['hard', stage.difficulty] as const) : ([stage.difficulty, 'hard'] as const)
        const r = playFrom(start, seed + guard, solari, umbral, 600)
        expect(r.problems).toEqual([])
        expect(r.state.winner).not.toBeNull()
        if (r.state.winner !== court) break
        run = applyVictory(run, r.state)
        if (run.offers) run = applyReward(run, run.offers[0])
        expect(foeCourt).not.toBe(court)
      }
      expect(run.stage).toBeGreaterThan(1)
    }
  }, 600_000)
})
