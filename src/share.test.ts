import { describe, expect, it } from 'vitest'
import { decodeChallenge, encodeChallenge } from './engine/challenge'
import { matchConfig } from './engine/data/matchConfig'
import { recordOf, replaySteps } from './engine/log'
import { newGame } from './engine/reducer'
import { decodeRecord, encodeRecord, toBase64Url } from './engine/serialize'
import { skirmishConfig } from './engine/data/setups'
import { blankDesign, designChallenge } from './engine/data/editor'
import { describeConfig, parseShared } from './share'

const challenge = { config: matchConfig({ seed: 77, mode: 'hill', events: true }), side: 'umbral' } as const
const code = encodeChallenge(challenge)
const record = { initial: newGame(matchConfig({ seed: 5 })), actions: [{ type: 'pass' as const }] }

describe('challenge codes', () => {
  it('round-trip a config and a side', () => {
    expect(decodeChallenge(code)).toEqual(challenge)
  })

  it('refuse garbage, a bad side and another version', () => {
    expect(decodeChallenge('not a code!')).toBeNull()
    expect(decodeChallenge('')).toBeNull()
    expect(decodeChallenge(toBase64Url(JSON.stringify({ v: 1, c: challenge.config, s: 'moon' })))).toBeNull()
    expect(decodeChallenge(toBase64Url(JSON.stringify({ v: 0, c: challenge.config, s: 'solari' })))).toBeNull()
  })

  it('refuse a config that asks for too much', () => {
    const huge = (change: object) => toBase64Url(JSON.stringify({ v: 1, c: { ...challenge.config, ...change }, s: 'solari' }))
    expect(decodeChallenge(huge({ roundLimit: 10_000 }))).toBeNull()
    expect(decodeChallenge(huge({ eclipseRound: 0 }))).toBeNull()
    expect(decodeChallenge(huge({ day: Array(1000).fill(1) }))).toBeNull()
    expect(decodeChallenge(huge({ layout: [{ role: 'leader', x: 99, y: 0 }] }))).toBeNull()
    expect(decodeChallenge(huge({ recharge: 1e9 }))).toBeNull()
  })

  it('carry a turn clock and refuse silly ones', () => {
    const config = skirmishConfig({ mode: 'classic', board: 'classic', winMode: 'hill', clock: { seconds: 15, bank: 30 } }, 'solari', 3)
    expect(config.turnClock).toEqual({ seconds: 15, bank: 30 })
    expect(skirmishConfig({ mode: 'classic', board: 'classic' }, 'solari', 3).turnClock).toBeUndefined()
    const timed = { config, side: 'solari' } as const
    expect(decodeChallenge(encodeChallenge(timed))).toEqual(timed)
    const clocked = (turnClock: object) => toBase64Url(JSON.stringify({ v: 1, c: { ...challenge.config, turnClock }, s: 'solari' }))
    expect(decodeChallenge(clocked({ seconds: 0 }))).toBeNull()
    expect(decodeChallenge(clocked({ seconds: 1e9 }))).toBeNull()
    expect(decodeChallenge(clocked({ seconds: 10, bank: -5 }))).toBeNull()
    expect(decodeChallenge(clocked({ seconds: 10, bank: 20 }))).not.toBeNull()
  })

  it('replay a timeout as an ordinary pass', () => {
    const initial = newGame(matchConfig({ seed: 9, turnClock: { seconds: 10 } }))
    const timedOut = { initial, actions: [{ type: 'pass' as const }, { type: 'pass' as const }] }
    const back = decodeRecord(encodeRecord(timedOut))
    expect(back?.actions).toEqual(timedOut.actions)
    expect(back?.initial.round).toBe(1)
  })

  it('also protect replay codes', () => {
    const bad = toBase64Url(JSON.stringify({ v: 1, c: { ...challenge.config, roundLimit: 10_000 }, a: [] }))
    expect(decodeRecord(bad)).toBeNull()
  })
})

describe('parseShared', () => {
  it('reads links, fragments, pairs and bare codes', () => {
    const replay = encodeRecord(record)
    for (const text of [`https://example.com/play/#c=${code}`, `#c=${code}`, `c=${code}`, ` ${code} `])
      expect(parseShared(text)).toEqual({ kind: 'challenge', challenge })
    for (const text of [`https://example.com/#r=${replay}`, `r=${replay}`, replay]) {
      const shared = parseShared(text)
      expect(shared?.kind).toBe('replay')
      if (shared?.kind === 'replay') expect(replaySteps(shared.record.initial, shared.record.actions)).not.toBeNull()
    }
    expect(recordOf(replaySteps(record.initial, record.actions)!).actions).toHaveLength(1)
  })

  it('does not read a code as the wrong kind, and rejects the rest', () => {
    expect(parseShared(`#r=${code}`)).toBeNull()
    expect(parseShared(`#c=${encodeRecord(record)}`)).toBeNull()
    expect(parseShared('hello world')).toBeNull()
    expect(parseShared('#c=')).toBeNull()
  })
})

describe('editor boards', () => {
  it('open from a pasted link and are described as custom', () => {
    const made = designChallenge({ ...blankDesign(9), goal: 'leader' }, 4)!
    const shared = parseShared(encodeChallenge(made))
    expect(shared).toEqual({ kind: 'challenge', challenge: made })
    expect(describeConfig(made)[0]).toBe('Custom 9x9 board from the editor')
  })
})

describe('turn links', () => {
  it('open as a turn of a game by link, while a bare code stays a replay', () => {
    const c = encodeRecord(record)
    expect(parseShared(`g=${c}`)?.kind).toBe('turn')
    expect(parseShared(`#r=${c}`)?.kind).toBe('replay')
    expect(parseShared(c)?.kind).toBe('replay')
  })
})
