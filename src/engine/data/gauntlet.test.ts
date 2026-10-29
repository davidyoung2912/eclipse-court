import { describe, expect, it } from 'vitest'
import { DIFFICULTY_LIST } from './difficulty'
import { BOSSES } from './bosses'
import { buildMap, ELITE_FROM, type NodeKind } from './gauntletMap'
import { playFrom, checkInvariants } from '../../sim/game'
import { readRun } from '../../run'
import { CLASSIC_ROLES, MAX_DRAFTED } from './draft'
import {
  applyReward, applyVictory, altarRelic, eventAvailable, eventChoices, MIN_BONUS, pactSpell, RELICS, resolveEvent, shrineBoon, EVENTS, relicUnlocked, type RelicId, type EventId, GAUNTLET_STAGES, MAX_ASCENSION, MAX_BONUS, parseRunCode, relicRules, restStages, runCode, runSummary, roster, runFoe, runMap, layerNodes, needsPick, enterNode, runBoss, runReward, runWon, stageFoe, stageGame, startRun, startingRelics, type Run,
} from './gauntlet'
import { ROLE_STATS } from './roster'
import { validConfig } from '../serialize'
import { VETERAN_WINS } from '../rules/growth'
import { otherCourt } from '../rules/board'
import type { GameState } from '../rules/types'

/** A run just past a node of `kind` taken in `layer`, found by searching seeds. */
function runAfter(kind: NodeKind, layer: number, ascension = 0): Run {
  for (let seed = 1; seed < 500; seed++) {
    const slot = buildMap(seed, ascension, GAUNTLET_STAGES)[layer - 1].findIndex((n) => n.kind === kind)
    if (slot >= 0) return { ...startRun('solari', CLASSIC_ROLES, seed, { ascension }), stage: layer + 1, path: [...Array<number>(layer - 1).fill(0), slot] }
  }
  throw new Error(`no ${kind} in layer ${layer}`)
}

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

  it('offers a fallen piece at a camp node', () => {
    const base: Run = { ...runAfter('rest', 3), fallen: [{ role: 'bruiser', wins: 3, bonus: 0 }] }
    for (let i = 0; i < 10; i++) expect(runReward(base, i)[0]).toEqual({ kind: 'revive', target: 0 })
    const camp = applyReward(base, { kind: 'revive', target: 0 })
    expect(camp.army.at(-1)).toMatchObject({ role: 'bruiser', wins: 3 })
    expect(camp.fallen).toEqual([])
    expect(runReward({ ...base, stage: 3, path: [] }, 1).some((r) => r.kind === 'revive')).toBe(false)
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
    const start = enterNode(newRun(), 0)
    const run = applyVictory(start, afterWin(start, [3], 1))
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
    expect(restStages()).toEqual([])
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
    const camp: Run = { ...run, stage: 4, fallen: [{ role: 'bruiser', wins: 3, bonus: 0 }] }
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
        const at = layerNodes(run).findIndex((n) => n.kind !== 'event' && n.kind !== 'rest')
        run = enterNode(run, at)
        const stage = runFoe(run)
        const [solari, umbral] = court === 'solari' ? (['hard', stage.difficulty] as const) : ([stage.difficulty, 'hard'] as const)
        const r = playFrom(start, seed + guard, solari, umbral, 600)
        expect(r.problems).toEqual([])
        expect(r.state.winner).not.toBeNull()
        if (r.state.winner !== court) break
        run = applyVictory(run, r.state)
        if (run.offers) run = applyReward(run, run.offers[0])
        if (run.event) run = resolveEvent(run, 0).run
        expect(foeCourt).not.toBe(court)
      }
      expect(run.stage).toBeGreaterThan(1)
    }
  }, 600_000)
})

describe('starting relics', () => {
  it('unlock one per won run and open a run with the chosen relic', () => {
    expect(startingRelics(0)).toEqual([])
    expect(startingRelics(1)).toEqual(['moonwell'])
    expect(startingRelics(6)).toHaveLength(6)
    expect(startingRelics(11)).toHaveLength(11)
    expect(startingRelics(0, 5)).toHaveLength(9)
    expect(startingRelics(11, 5)).toHaveLength(Object.keys(RELICS).length)
    expect(relicUnlocked('seal', 99, 3)).toBe(false)
    expect(relicUnlocked('seal', 0, 4)).toBe(true)
    const run = startRun('solari', CLASSIC_ROLES, 7, { relic: 'banner' })
    expect(run.relics).toEqual(['banner'])
    expect(readRun(JSON.parse(JSON.stringify(run)))).toEqual(run)
    expect(startRun('solari', CLASSIC_ROLES, 7).relics).toEqual([])
  })
})

describe('new relics', () => {
  it('has twenty relics, each with a way to open it', () => {
    expect(Object.keys(RELICS)).toHaveLength(20)
    expect(startingRelics(99, 5)).toHaveLength(20)
  })

  it('switch on match settings, with Seal favouring only the player', () => {
    const all = Object.keys(RELICS) as RelicId[]
    expect(relicRules(['glass', 'deathbell', 'ashring', 'seal'], 'umbral')).toMatchObject({ reverse: true, suddenDeath: 14, showdown: true, freeCast: 'umbral' })
    expect(relicRules(['seal']).freeCast).toBeUndefined()
    expect(relicRules(['harbinger', 'cutpurse', 'wilddie']).mayhem).toEqual(['spawns', 'thefts', 'swaps'])
    expect(relicRules(['swiftsun']).day).toHaveLength(6)
    expect(relicRules(['swiftsun', 'hourglass']).day).toBeUndefined()
    const run = { ...newRun('umbral'), relics: all }
    const state = stageGame(run)
    expect(validConfig(state.config)).toBe(true)
  })

  it('Ironheart adds fight-only HP that is not kept', () => {
    const run = { ...newRun(), relics: ['ironheart' as const] }
    const start = stageGame(run)
    const plain = stageGame(newRun())
    const mine = (s: GameState) => s.pieces.find((p) => p.id === 'solari-run-0')!
    expect(mine(start).maxHp).toBe(mine(plain).maxHp + 1)
    const next = applyVictory(run, afterWin(run))
    expect(next.leader.bonus).toBe(0)
    expect(next.army.every((p) => p.bonus === 0)).toBe(true)
  })

  it('Lens offers four, Waystone camps every stage, Ember keeps the best loss', () => {
    const run = { ...newRun(), relics: ['lens' as const] }
    for (let i = 0; i < 10; i++) expect(runReward(run, i)).toHaveLength(4)
    expect(restStages(['waystone'])).toHaveLength(GAUNTLET_STAGES - 1)
    expect(restStages([])).toEqual([])
    const ember = { ...newRun(), relics: ['ember' as const] }
    const next = applyVictory(ember, afterWin(ember, [2, 3]))
    expect(next.army).toHaveLength(ember.army.length - 1)
    expect(next.fallen).toHaveLength(1)
    const plain = applyVictory(newRun(), afterWin(newRun(), [2, 3]))
    expect(plain.fallen).toHaveLength(2)
  })

  it('Chalice grows the Leader after a cast and Lamp pays pieces on beacons', () => {
    const chalice = { ...newRun(), relics: ['chalice' as const] }
    const quiet = afterWin(chalice)
    expect(applyVictory(chalice, quiet).leader.bonus).toBe(0)
    const cast = applyVictory(chalice, { ...quiet, lastCast: { ...quiet.lastCast, solari: 'blink' } })
    expect(cast.leader.bonus).toBe(1)
    const lamp = { ...newRun(), relics: ['lamp' as const] }
    const won = afterWin(lamp)
    const b = won.config.beacons[0]
    const moved = { ...won, pieces: won.pieces.map((p) => (p.id === 'solari-run-1' ? { ...p, pos: b } : p)) }
    const next = applyVictory(lamp, moved)
    expect(next.army[0].wins).toBe(1)
    expect(next.army[1].wins).toBe(0)
    expect(applyVictory(newRun(), moved).army[0].wins).toBe(0)
  })
})

describe('events', () => {
  const faced = (event: EventId, run: Run = newRun()): Run => ({ ...run, stage: 3, path: [0, 0], event })

  it('are offered only when they could do something, and open on pick', () => {
    const run: Run = { ...newRun(), stage: 3 }
    expect((['altar', 'pact', 'shrine'] as EventId[]).every((e) => eventAvailable(run, e))).toBe(true)
    expect(eventAvailable({ ...run, army: [] }, 'altar')).toBe(false)
    expect(eventAvailable({ ...run, leader: { ...run.leader, bonus: MIN_BONUS } }, 'pact')).toBe(false)
    expect(eventAvailable({ ...run, relics: Object.keys(RELICS) as RelicId[] }, 'altar')).toBe(false)
    const opened = applyReward({ ...run, offers: [{ kind: 'event', event: 'shrine' }] }, { kind: 'event', event: 'shrine' })
    expect(opened.event).toBe('shrine')
    expect(opened.offers).toBeNull()
    const seen = new Set<string>()
    for (let i = 0; i < 60; i++) for (const r of runReward(run, i)) if (r.kind === 'event') seen.add(r.event)
    expect(seen.size).toBe(3)
    expect(EVENTS.altar.name).toBeTruthy()
  })

  it('altar: a sacrificed piece buys the relic, walking away changes nothing', () => {
    const run = faced('altar')
    const relic = altarRelic(run)!
    const { run: after } = resolveEvent(run, 1)
    expect(after.event).toBeNull()
    expect(after.army).toHaveLength(run.army.length - 1)
    expect(after.army[0]).toEqual(run.army[0])
    expect(after.relics).toEqual([relic])
    expect(eventChoices(run, 'altar')).toHaveLength(run.army.length + 1)
    const left = resolveEvent(run, run.army.length).run
    expect(left).toEqual({ ...run, event: null })
  })

  it('pact: max HP for a spell, never below the floor', () => {
    const run = faced('pact')
    const spell = pactSpell(run)!
    const signed = resolveEvent(run, 0).run
    expect(signed.leader.bonus).toBe(-1)
    expect(signed.loadout).toContain(spell)
    const twice = resolveEvent({ ...signed, event: 'pact' }, 0).run
    expect(twice.leader.bonus).toBe(MIN_BONUS)
    const refused = resolveEvent({ ...twice, event: 'pact' }, 0).run
    expect(refused.leader.bonus).toBe(MIN_BONUS)
    expect(resolveEvent(run, 1).run.loadout).toEqual(run.loadout)
    const fight = stageGame(signed)
    expect(fight.pieces.find((p) => p.id === 'solari-run-0')!.maxHp).toBe(ROLE_STATS.leader.hp - 1)
  })

  it('shrine: the same run always meets the same coin, blessing or curse', () => {
    let boon = 0
    let curse = 0
    for (let seed = 1; seed <= 40; seed++) {
      const run = faced('shrine', newRun('solari', seed))
      const { run: after, text } = resolveEvent(run, 0)
      expect(resolveEvent(run, 0)).toEqual({ run: after, text })
      expect(after.event).toBeNull()
      if (shrineBoon(run)) {
        boon++
        expect(roster(after).filter((p) => p.perk)).toHaveLength(1)
        expect(roster(after).find((p) => p.perk)!.wins).toBeGreaterThanOrEqual(4)
        expect(after.army).toHaveLength(run.army.length)
      } else {
        curse++
        expect(after.army).toHaveLength(run.army.length - 1)
        expect(after.fallen).toHaveLength(1)
      }
    }
    expect(boon).toBeGreaterThan(5)
    expect(curse).toBeGreaterThan(5)
    const run = faced('shrine')
    expect(resolveEvent(run, 1).run).toEqual({ ...run, event: null })
  })

  it('save and load, and a damaged event is dropped', () => {
    const run = faced('pact', { ...newRun(), leader: { role: 'leader', wins: 0, bonus: -2 } })
    expect(readRun(JSON.parse(JSON.stringify(run)))).toEqual(run)
    expect(readRun({ ...run, event: 'nope' })?.event).toBeNull()
    expect(readRun({ ...run, leader: { ...run.leader, bonus: -3 } })).toBeNull()
    expect(readRun({ ...run, offers: [{ kind: 'event', event: 'nope' }] })).toBeNull()
    const { event: _gone, ...old } = run
    expect(readRun(old)?.event).toBeNull()
  })
})

describe('the map', () => {
  const maps = Array.from({ length: 80 }, (_, i) => ({ seed: i + 1, ascension: i % (MAX_ASCENSION + 1) }))

  it('is the same for the same seed and shaped by the rules', () => {
    for (const { seed, ascension } of maps) {
      const map = buildMap(seed, ascension, GAUNTLET_STAGES)
      expect(buildMap(seed, ascension, GAUNTLET_STAGES)).toEqual(map)
      expect(map).toHaveLength(GAUNTLET_STAGES)
      map.forEach((layer, i) => {
        const kinds = layer.map((n) => n.kind)
        if (i === GAUNTLET_STAGES - 1) return expect(kinds).toEqual(['boss'])
        expect(layer.length).toBeGreaterThanOrEqual(2)
        expect(layer.length).toBeLessThanOrEqual(3)
        expect(kinds.some((k) => k === 'fight' || k === 'elite')).toBe(true)
        expect(kinds).not.toContain('boss')
        if (i === 0) expect(kinds.every((k) => k === 'fight')).toBe(true)
        if (i + 1 < ELITE_FROM) expect(kinds).not.toContain('elite')
        if (ascension >= 2) expect(kinds).not.toContain('rest')
      })
      if (ascension < 2) expect(map[GAUNTLET_STAGES - 2].map((n) => n.kind)).toContain('rest')
    }
    const kinds = new Set(maps.flatMap(({ seed }) => buildMap(seed, 0, GAUNTLET_STAGES).flat().map((n) => n.kind)))
    expect([...kinds].sort()).toEqual(['boss', 'elite', 'event', 'fight', 'rest'])
  })

  it('waits for a pick, and a fight node waits to be fought', () => {
    const run = newRun()
    expect(needsPick(run)).toBe(true)
    expect(enterNode(run, 9)).toBe(run)
    const fight = enterNode(run, 0)
    expect(fight.path).toEqual([0])
    expect(fight.stage).toBe(1)
    expect(needsPick(fight)).toBe(false)
    expect(enterNode(fight, 0)).toBe(fight)
    expect(runFoe(fight)).toEqual(stageFoe(run.seed, 1, 0, { kind: 'fight', slot: 0 }, 'umbral'))
    const won = applyVictory(fight, afterWin(fight))
    expect(won.stage).toBe(2)
    expect(won.path).toEqual([0])
    expect(won.offers).not.toBeNull()
    expect(needsPick(applyReward(won, won.offers![0]))).toBe(true)
  })

  it('moves a camp and an event straight on to the next stage', () => {
    const before = runAfter('rest', 4)
    const run: Run = { ...before, stage: 4, path: before.path.slice(0, 3), fallen: [{ role: 'bruiser', wins: 3, bonus: 0 }] }
    const camp = enterNode(run, before.path[3])
    expect(camp.stage).toBe(5)
    expect(camp.offers![0]).toEqual({ kind: 'revive', target: 0 })
    expect(needsPick(camp)).toBe(false)
    const e = runAfter('event', 4)
    const ev = enterNode({ ...e, stage: 4, path: e.path.slice(0, 3) }, e.path[3])
    expect(ev.stage).toBe(5)
    expect(ev.event ?? ev.offers).toBeTruthy()
    const chosen = ev.event ? resolveEvent(ev, ev.army.length ? 0 : 99).run : ev
    expect(chosen.event).toBeNull()
  })

  it('makes an elite harder, with a longer reward list', () => {
    for (let s = ELITE_FROM; s < GAUNTLET_STAGES; s++) {
      const plain = stageFoe(5, s, 0, { kind: 'fight', slot: 1 })
      const elite = stageFoe(5, s, 0, { kind: 'elite', slot: 1 })
      expect(elite.elite).toBe(true)
      expect(plain.elite).toBe(false)
      expect(elite.hpBonus).toBe(plain.hpBonus + 1)
      expect(elite.tags.length).toBe(plain.tags.length + 1)
      expect(DIFFICULTY_LIST.indexOf(elite.difficulty)).toBeGreaterThanOrEqual(DIFFICULTY_LIST.indexOf(plain.difficulty))
    }
    const run = runAfter('elite', 4)
    expect(runReward(run, 3)).toHaveLength(4)
    expect(runReward({ ...run, path: [...run.path.slice(0, -1), 0] }, 3).length).toBeLessThanOrEqual(4)
  })

  it('ends on a ladder boss on the foe’s court, with a valid fight', () => {
    for (let seed = 1; seed < 30; seed++) {
      expect(BOSSES).toContain(runBoss(seed))
      for (const court of ['solari', 'umbral'] as const) {
        const run: Run = { ...startRun(court, CLASSIC_ROLES, seed), stage: GAUNTLET_STAGES, path: Array<number>(GAUNTLET_STAGES - 1).fill(0) }
        const entered = enterNode(run, 0)
        const foe = runFoe(entered)
        expect(foe.boss).toBe(true)
        expect(foe.name).toBe(runBoss(seed).name)
        expect(foe.rules.eclipseRound).toBe(20)
        const state = stageGame(entered)
        expect(validConfig(state.config)).toBe(true)
        expect(checkInvariants(state)).toEqual([])
        if (foe.rules.freeCast) expect(foe.rules.freeCast).toBe(otherCourt(court))
        if (foe.rules.edge) expect(foe.rules.edge.court).toBe(otherCourt(court))
      }
    }
  })

  it('is saved with the run and rejects a path that does not fit the map', () => {
    const run = enterNode(newRun(), 0)
    expect(readRun(JSON.parse(JSON.stringify(run)))).toEqual(run)
    expect(readRun({ ...run, v: 1 })).toBeNull()
    expect(readRun({ ...run, path: undefined })).toBeNull()
    expect(readRun({ ...run, path: [5] })).toBeNull()
    expect(readRun({ ...run, path: [0, 0, 0] })).toBeNull()
    expect(readRun({ ...run, stage: 3, path: [0] })).toBeNull()
    expect(runMap(run)[0].length).toBeGreaterThan(0)
  })
})
