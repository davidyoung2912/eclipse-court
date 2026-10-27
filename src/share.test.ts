import { describe, expect, it } from 'vitest'
import { decodeChallenge, encodeChallenge } from './engine/challenge'
import { matchConfig } from './engine/data/matchConfig'
import { recordOf, replaySteps } from './engine/log'
import { newGame } from './engine/reducer'
import { decodeRecord, encodeRecord, toBase64Url } from './engine/serialize'
import { parseShared } from './share'

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
