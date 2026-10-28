import { afterEach, describe, expect, it, vi } from 'vitest'
import { matchConfig } from '../engine/data/matchConfig'
import { encodeChallenge, type Challenge } from '../engine/challenge'
import { newGame, reduce } from '../engine/reducer'
import { legalMoves } from '../engine/rules/moves'
import type { Action, GameState } from '../engine/rules/types'
import { actMessage, decodeMessage, encodeMessage, hello, PROTOCOL_VERSION, stateSum, type Message } from './protocol'
import { createSession, settleDuel, type Session } from './session'
import { loopbackPair } from './transport'

/** Lets queued deliveries arrive. */
const settle = async () => {
  for (let i = 0; i < 20; i++) await Promise.resolve()
}

const challenge: Challenge = { config: matchConfig({ seed: 7 }), side: 'umbral' }

/** A match that opens with two Footsoldiers side by side, so Solari can capture on its first move. */
const brawl: Challenge = {
  config: matchConfig({
    seed: 3,
    layout: [{ role: 'leader', x: 0, y: 3 }, { role: 'footsoldier', x: 3, y: 3 }],
    umbralLayout: [{ role: 'leader', x: 0, y: 3 }, { role: 'footsoldier', x: 2, y: 3 }],
  }),
  side: 'umbral',
}

async function connected(offer: Challenge = challenge) {
  const [a, b] = loopbackPair()
  const host = createSession({ transport: a, role: 'host', challenge: offer })
  const guest = createSession({ transport: b, role: 'guest' })
  await settle()
  return { host, guest }
}

/** The first legal move of whoever is to play, or a pass. */
const firstMove = (state: GameState): Action => {
  for (const p of state.pieces)
    if (p.court === state.turn) {
      const to = legalMoves(state, p)[0]
      if (to) return { type: 'move', pieceId: p.id, to }
    }
  return { type: 'pass' }
}

/** A hand-driven guest: the test sends and reads raw messages to a real host session. */
async function withFakeGuest(offer: Challenge = challenge) {
  const [a, b] = loopbackPair()
  const received: Message[] = []
  b.onMessage((text) => received.push(decodeMessage(text)!))
  const host = createSession({ transport: a, role: 'host', challenge: offer })
  const send = (m: Message) => b.send(encodeMessage(m))
  send(hello())
  await settle()
  send({ t: 'ready' })
  await settle()
  return { host, send, received, wire: b }
}

describe('handshake', () => {
  it('gives the host its court and the guest the one it was offered', async () => {
    const { host, guest } = await connected()
    expect(host.view().status).toBe('playing')
    expect(guest.view().status).toBe('playing')
    expect(host.view().me).toBe('solari')
    expect(guest.view().me).toBe('umbral')
    expect(guest.view().challenge).toEqual(challenge)
    expect(stateSum(guest.view().state!)).toBe(stateSum(host.view().state!))
  })

  it('ends both sides when the protocol versions differ', async () => {
    const [a, b] = loopbackPair()
    const host = createSession({ transport: a, role: 'host', challenge })
    b.send(encodeMessage({ t: 'hello', v: PROTOCOL_VERSION + 1, fmt: 1 }))
    await settle()
    expect(host.view()).toMatchObject({ status: 'over', reason: 'version' })
  })

  it('refuses a match that is not a valid challenge', async () => {
    const [a, b] = loopbackPair()
    const guest = createSession({ transport: a, role: 'guest' })
    b.send(encodeMessage(hello()))
    b.send(encodeMessage({ t: 'start', challenge: 'nonsense' }))
    await settle()
    expect(guest.view()).toMatchObject({ status: 'over', reason: 'protocol' })
  })

  it('refuses a message before hello', async () => {
    const [a, b] = loopbackPair()
    const host = createSession({ transport: a, role: 'host', challenge })
    b.send(encodeMessage({ t: 'ready' }))
    await settle()
    expect(host.view()).toMatchObject({ status: 'over', reason: 'protocol' })
  })
})

describe('play', () => {
  it('keeps both sides in step through a whole game', async () => {
    const { host, guest } = await connected()
    const sessions: Record<string, Session> = { solari: host, umbral: guest }
    for (let i = 0; i < 400 && host.view().status === 'playing'; i++) {
      const mover = sessions[host.view().state!.turn]
      expect(mover.play(firstMove(mover.view().state!))).toBe(true)
      await settle()
      expect(stateSum(host.view().state!)).toBe(stateSum(guest.view().state!))
    }
    expect(host.view().actions.length).toBeGreaterThan(10)
    expect(guest.view().actions).toEqual(host.view().actions)
    expect(guest.view()).toMatchObject({ status: 'over', reason: 'finished' })
    expect(host.view().winner).toBe(guest.view().winner)
    expect(host.view().winner).not.toBeNull()
  })

  it('refuses a move out of turn or one the rules refuse, sending nothing', async () => {
    const { host, guest } = await connected()
    expect(guest.play({ type: 'pass' })).toBe(false)
    expect(host.play({ type: 'move', pieceId: 'solari-leader-1', to: { x: 6, y: 6 } })).toBe(false)
    expect(host.view().actions).toHaveLength(0)
    await settle()
    expect(guest.view().actions).toHaveLength(0)
    expect(host.view().status).toBe('playing')
  })

  it('settles a capture on both sides with the same duel', async () => {
    const { host, guest } = await connected(brawl)
    const capture: Action = { type: 'move', pieceId: 'solari-footsoldier-1', to: { x: 4, y: 3 } }
    expect(host.play(capture)).toBe(true)
    await settle()
    const played = host.view().actions[0]
    expect(played).toMatchObject({ type: 'move', duel: settleDuel(newGame(brawl.config), capture) })
    expect(guest.view().actions[0]).toEqual(played)
    expect(guest.view().state!.lastDuel).not.toBeNull()
    expect(stateSum(guest.view().state!)).toBe(stateSum(host.view().state!))
  })

  it('overwrites a duel result the caller supplies with the real one', async () => {
    const { host } = await connected(brawl)
    host.play({ type: 'move', pieceId: 'solari-footsoldier-1', to: { x: 4, y: 3 }, duel: { attackerHp: 99, defenderHp: 0 } })
    expect(host.view().actions[0]).toMatchObject({ duel: settleDuel(newGame(brawl.config), { type: 'move', pieceId: 'solari-footsoldier-1', to: { x: 4, y: 3 } }) })
  })
})

describe('what the host refuses from the guest', () => {
  // The guest takes Umbral, so Solari (the host) moves first and the fake guest answers after.
  const answered = async (offer: Challenge = challenge) => {
    const t = await withFakeGuest(offer)
    const opening = firstMove(t.host.view().state!)
    t.host.play(opening)
    await settle()
    const state = t.host.view().state!
    return { ...t, state }
  }

  it('accepts a good reply', async () => {
    const { host, send, state } = await answered()
    const reply = firstMove(state)
    send(actMessage(1, reply, reduce(state, reply)))
    await settle()
    expect(host.view()).toMatchObject({ status: 'playing' })
    expect(host.view().actions).toHaveLength(2)
  })

  it('rejects a wrong action number', async () => {
    const { host, send, state } = await answered()
    const reply = firstMove(state)
    send(actMessage(5, reply, reduce(state, reply)))
    await settle()
    expect(host.view()).toMatchObject({ status: 'over', reason: 'desync' })
  })

  it('rejects an illegal move', async () => {
    const { host, send, state } = await answered()
    const bad: Action = { type: 'move', pieceId: 'umbral-leader-1', to: { x: 0, y: 0 } }
    send(actMessage(1, bad, state))
    await settle()
    expect(host.view()).toMatchObject({ status: 'over', reason: 'illegal' })
  })

  it('rejects a move of the host’s own piece', async () => {
    const { host, send, state } = await answered()
    const bad = firstMove({ ...state, turn: 'solari' })
    send(actMessage(1, bad, state))
    await settle()
    expect(host.view()).toMatchObject({ status: 'over', reason: 'illegal' })
  })

  it('rejects a tampered checksum', async () => {
    const { host, send, state } = await answered()
    const reply = firstMove(state)
    const message = actMessage(1, reply, reduce(state, reply)) as Extract<Message, { t: 'act' }>
    send({ ...message, sum: '00000000' })
    await settle()
    expect(host.view()).toMatchObject({ status: 'over', reason: 'desync' })
  })

  it('rejects a duel result that is not the computed one', async () => {
    const t = await withFakeGuest(brawl)
    // Solari passes, so the Umbral Footsoldier may capture.
    t.host.play({ type: 'pass' })
    await settle()
    const state = t.host.view().state!
    const forged: Action = { type: 'move', pieceId: 'umbral-footsoldier-1', to: { x: 3, y: 3 }, duel: { attackerHp: 5, defenderHp: 0 } }
    const real = settleDuel(state, forged)!
    expect(real).not.toEqual(forged.duel)
    t.send(actMessage(1, forged, reduce(state, forged)))
    await settle()
    expect(t.host.view()).toMatchObject({ status: 'over', reason: 'illegal' })
  })

  it('accepts the computed duel result', async () => {
    const t = await withFakeGuest(brawl)
    t.host.play({ type: 'pass' })
    await settle()
    const state = t.host.view().state!
    const bare: Action = { type: 'move', pieceId: 'umbral-footsoldier-1', to: { x: 3, y: 3 } }
    const honest = { ...bare, duel: settleDuel(state, bare)! }
    t.send(actMessage(1, honest, reduce(state, honest)))
    await settle()
    expect(t.host.view()).toMatchObject({ status: 'playing' })
    expect(t.host.view().actions).toHaveLength(2)
  })

  it('rejects garbage', async () => {
    const { host, wire } = await answered()
    wire.send('not json')
    await settle()
    expect(host.view()).toMatchObject({ status: 'over', reason: 'protocol' })
  })

  it('ignores anything after the session is over', async () => {
    const { host, send, state } = await answered()
    send({ t: 'resign' })
    await settle()
    expect(host.view()).toMatchObject({ status: 'over', reason: 'opponent-resigned', winner: 'solari' })
    const reply = firstMove(state)
    send(actMessage(1, reply, reduce(state, reply)))
    await settle()
    expect(host.view().actions).toHaveLength(1)
  })
})

describe('ending', () => {
  it('a resignation gives the game to the other side on both ends', async () => {
    const { host, guest } = await connected()
    guest.resign()
    await settle()
    expect(guest.view()).toMatchObject({ status: 'over', reason: 'resigned', winner: 'solari' })
    expect(host.view()).toMatchObject({ status: 'over', reason: 'opponent-resigned', winner: 'solari' })
  })

  it('leaving tells the other side', async () => {
    const { host, guest } = await connected()
    guest.close()
    await settle()
    expect(host.view()).toMatchObject({ status: 'over', reason: 'opponent-left', winner: null })
    expect(guest.play({ type: 'pass' })).toBe(false)
  })

  it('reports each change to its listener', async () => {
    const [a, b] = loopbackPair()
    const seen: string[] = []
    createSession({ transport: a, role: 'host', challenge, onChange: (v) => seen.push(v.status) })
    createSession({ transport: b, role: 'guest' })
    await settle()
    expect(seen).toEqual(['playing'])
  })
})

describe('protocol', () => {
  it('round-trips messages and refuses malformed ones', () => {
    const m: Message = { t: 'act', n: 3, a: [2], sum: 'abc' }
    expect(decodeMessage(encodeMessage(m))).toEqual(m)
    expect(decodeMessage(encodeMessage({ t: 'start', challenge: encodeChallenge(challenge) }))).not.toBeNull()
    for (const bad of ['', '[]', 'null', '{"t":"act","n":-1,"a":[],"sum":"x"}', '{"t":"act","n":1.5,"a":[],"sum":"x"}', '{"t":"nope"}', 'x'.repeat(30_000)])
      expect(decodeMessage(bad)).toBeNull()
  })

  it('checksums equal states alike and different ones apart', () => {
    const s = newGame(challenge.config)
    expect(stateSum({ ...s })).toBe(stateSum(s))
    expect(stateSum(reduce(s, { type: 'pass' }))).not.toBe(stateSum(s))
  })

  it('tells listeners about every change until they stop', async () => {
    const { host, guest } = await connected()
    const seen: number[] = []
    const stop = guest.listen((v) => seen.push(v.actions.length))
    host.play(firstMove(host.view().state!))
    await settle()
    expect(seen).toEqual([1])
    stop()
    guest.play(firstMove(guest.view().state!))
    await settle()
    expect(seen).toEqual([1])
  })
})

describe('resilience', () => {
  afterEach(() => vi.useRealTimers())

  /** A host and guest whose host-to-guest messages can be swallowed, to lose an action in flight. */
  async function lossy() {
    const [a, b] = loopbackPair()
    const state = { lose: false }
    const wire = { ...a, send: (t: string) => !state.lose && a.send(t) }
    const host = createSession({ transport: wire, role: 'host', challenge })
    const guest = createSession({ transport: b, role: 'guest' })
    await settle()
    return { host, guest, a, state }
  }

  const rejoin = async (host: Session, guest: Session) => {
    const [a, b] = loopbackPair()
    host.reconnect(a)
    guest.reconnect(b)
    await settle()
  }

  it('a dropped connection keeps the game and holds play until reconnected', async () => {
    const { host, guest, a } = await lossy()
    host.play(firstMove(host.view().state!))
    await settle()
    a.close()
    await settle()
    expect(host.view()).toMatchObject({ status: 'playing', link: 'down' })
    expect(guest.view()).toMatchObject({ status: 'playing', link: 'down' })
    expect(guest.play(firstMove(guest.view().state!))).toBe(false)
    await rejoin(host, guest)
    expect(host.view().link).toBe('up')
    expect(guest.view().link).toBe('up')
    expect(guest.play(firstMove(guest.view().state!))).toBe(true)
    await settle()
    expect(host.view().actions).toHaveLength(2)
  })

  it('an action lost in flight is resent on reconnect', async () => {
    const { host, guest, a, state } = await lossy()
    state.lose = true
    host.play(firstMove(host.view().state!))
    await settle()
    expect(guest.view().actions).toHaveLength(0)
    a.close()
    await settle()
    await rejoin(host, guest)
    expect(guest.view()).toMatchObject({ link: 'up', status: 'playing' })
    expect(guest.view().actions).toEqual(host.view().actions)
    expect(stateSum(guest.view().state!)).toBe(stateSum(host.view().state!))
  })

  it('a side that is behind waits for the other to resend', async () => {
    const { host, guest, a, state } = await lossy()
    state.lose = true
    host.play(firstMove(host.view().state!))
    a.close()
    await settle()
    const [x, y] = loopbackPair()
    guest.reconnect(y)
    await settle()
    expect(guest.view().link).toBe('down')
    host.reconnect(x)
    await settle()
    expect(guest.view().link).toBe('up')
    expect(guest.view().actions).toHaveLength(1)
  })

  it('games that disagree at reconnect end as a desync', async () => {
    const { host, guest, a } = await lossy()
    host.play(firstMove(host.view().state!))
    await settle()
    a.close()
    await settle()
    const [x, y] = loopbackPair()
    host.reconnect(x)
    y.onMessage(() => {})
    y.send(encodeMessage({ t: 'sync', n: 1, sum: 'deadbeef' }))
    await settle()
    expect(host.view()).toMatchObject({ status: 'over', reason: 'desync' })
    expect(guest.view().status).toBe('playing')
  })

  it('a silent connection is noticed by the heartbeat', async () => {
    vi.useFakeTimers()
    const [a, b] = loopbackPair()
    const wire = { ...b, send: () => {} }
    const host = createSession({ transport: a, role: 'host', challenge, beatMs: 1000, lostMs: 3000 })
    const guest = createSession({ transport: wire, role: 'guest', beatMs: 1000, lostMs: 3000 })
    await vi.advanceTimersByTimeAsync(0)
    b.send(encodeMessage(hello()))
    await vi.advanceTimersByTimeAsync(0)
    b.send(encodeMessage({ t: 'ready' }))
    await vi.advanceTimersByTimeAsync(2000)
    expect(host.view()).toMatchObject({ status: 'playing', link: 'up' })
    await vi.advanceTimersByTimeAsync(5000)
    expect(host.view()).toMatchObject({ status: 'playing', link: 'down' })
    host.close()
    guest.close()
  })

  it('beats keep a quiet but live connection up', async () => {
    vi.useFakeTimers()
    const [a, b] = loopbackPair()
    const host = createSession({ transport: a, role: 'host', challenge, beatMs: 1000, lostMs: 3000 })
    const guest = createSession({ transport: b, role: 'guest', beatMs: 1000, lostMs: 3000 })
    await vi.advanceTimersByTimeAsync(20_000)
    expect(host.view().link).toBe('up')
    expect(guest.view().link).toBe('up')
    host.close()
  })

  it('reports the game so far', async () => {
    const { host } = await connected()
    host.play(firstMove(host.view().state!))
    const report = JSON.parse(host.report())
    expect(report).toMatchObject({ role: 'host', link: 'up' })
    expect(report.actions).toHaveLength(1)
  })
})

describe('rematch', () => {
  it('starts a new match with the courts swapped once both sides ask', async () => {
    const { host, guest } = await connected()
    guest.resign()
    await settle()
    expect(host.view().rematch).toBe('ask')
    expect(host.rematch()).toBe(true)
    await settle()
    expect(host.view().rematch).toBe('sent')
    expect(guest.view().rematch).toBe('asked')
    expect(guest.rematch()).toBe(true)
    await settle()
    expect(host.view()).toMatchObject({ status: 'playing', reason: null, me: 'umbral', winner: null, rematch: 'none' })
    expect(guest.view()).toMatchObject({ status: 'playing', reason: null, me: 'solari', winner: null, rematch: 'none' })
    expect(host.view().actions).toHaveLength(0)
    expect(stateSum(guest.view().state!)).toBe(stateSum(host.view().state!))
    // The new match is playable both ways.
    expect(guest.play(firstMove(guest.view().state!))).toBe(true)
    await settle()
    expect(host.view().actions).toHaveLength(1)
    expect(host.play(firstMove(host.view().state!))).toBe(true)
    await settle()
    expect(guest.view().actions).toHaveLength(2)
  })

  it('is not offered during play, and needs both players to ask', async () => {
    const { host, guest } = await connected()
    expect(host.view().rematch).toBe('none')
    expect(host.rematch()).toBe(false)
    host.resign()
    await settle()
    guest.rematch()
    await settle()
    expect(host.view()).toMatchObject({ status: 'over', rematch: 'asked' })
  })

  it('is withdrawn when the other player leaves', async () => {
    const { host, guest } = await connected()
    host.resign()
    await settle()
    guest.close()
    await settle()
    expect(host.view().rematch).toBe('none')
    expect(host.rematch()).toBe(false)
  })
})

describe('quick chat and draw offers', () => {
  it('delivers a phrase to the other side', async () => {
    const { host, guest } = await connected()
    host.say('luck')
    await settle()
    expect(guest.view().chat).toMatchObject({ from: 'them', id: 'luck' })
    expect(host.view().chat).toMatchObject({ from: 'me', id: 'luck' })
  })

  it('refuses a phrase that is not on the list', () => {
    expect(decodeMessage(encodeMessage({ t: 'chat', id: 'luck' }))).toEqual({ t: 'chat', id: 'luck' })
    expect(decodeMessage('{"t":"chat","id":"<script>"}')).toBeNull()
  })

  it('ends the game as a draw when an offer is accepted', async () => {
    const { host, guest } = await connected()
    host.offerDraw()
    await settle()
    expect(guest.view().draw).toBe('asked')
    guest.answerDraw(true)
    await settle()
    for (const s of [host, guest]) {
      expect(s.view().reason).toBe('drawn')
      expect(s.view().winner).toBe('draw')
    }
  })

  it('carries on after a declined offer, and a move lapses an offer', async () => {
    const { host, guest } = await connected()
    host.offerDraw()
    await settle()
    guest.answerDraw(false)
    await settle()
    expect(host.view().draw).toBe('none')
    expect(host.view().status).toBe('playing')
    host.offerDraw()
    await settle()
    const mover = host.view().state!.turn === host.view().me ? host : guest
    expect(mover.play(firstMove(mover.view().state!))).toBe(true)
    await settle()
    expect(host.view().draw).toBe('none')
    expect(guest.view().draw).toBe('none')
  })

  it('treats offers that cross as an agreement', async () => {
    const { host, guest } = await connected()
    host.offerDraw()
    guest.offerDraw()
    await settle()
    expect(host.view().reason).toBe('drawn')
    expect(guest.view().reason).toBe('drawn')
  })
})
