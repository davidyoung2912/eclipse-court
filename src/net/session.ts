import { AUTO_DUEL_SKILL } from '../ai/profile'
import { autoDuel } from '../ai/autoDuel'
import { decodeChallenge, encodeChallenge, type Challenge } from '../engine/challenge'
import { newGame, reduce } from '../engine/reducer'
import { duelCells } from '../engine/rules/cells'
import { otherCourt } from '../engine/rules/board'
import { squareLuminance } from '../engine/rules/luminance'
import { pieceAt } from '../engine/rules/moves'
import type { Action, Court, DuelOutcome, GameState } from '../engine/rules/types'
import { actionOf, actMessage, decodeMessage, encodeMessage, hello, PROTOCOL_VERSION, stateSum, type Message } from './protocol'
import type { Transport } from './transport'
import { FORMAT_VERSION } from '../engine/serialize'

export type Status = 'connecting' | 'playing' | 'over'

/** Why a session ended. Anything but `finished` and the two resignations is a failure. */
export type EndReason =
  | 'finished'
  | 'resigned'
  | 'opponent-resigned'
  /** The connection dropped. */
  | 'closed'
  /** The other build speaks a different protocol or code format. */
  | 'version'
  /** A message that makes no sense here. */
  | 'protocol'
  /** An action the rules refuse, out of turn, or with a duel result that is not the one both sides compute. */
  | 'illegal'
  /** The two games no longer agree. */
  | 'desync'

export interface SessionView {
  status: Status
  reason: EndReason | null
  /** The court this player controls; known to the guest once the host's match arrives. */
  me: Court | null
  challenge: Challenge | null
  state: GameState | null
  /** Every action played so far, in order. */
  actions: readonly Action[]
  /** The winner, counting a resignation; null while undecided or if the session failed. */
  winner: GameState['winner']
}

export interface Session {
  view: () => SessionView
  /** Plays the local court's action, settling any capture, and sends it. False if the rules refuse it or it is not this player's turn. */
  play: (action: Action) => boolean
  resign: () => void
  /** Calls `fn` with the view after every change; returns a function that stops listening. */
  listen: (fn: (view: SessionView) => void) => () => void
  close: () => void
}

interface Options {
  transport: Transport
  /** The host chooses the match; the guest takes whatever the host offers. */
  role: 'host' | 'guest'
  /** The match to play, for the host. `side` is the court the guest takes. */
  challenge?: Challenge
  onChange?: (view: SessionView) => void
}

/**
 * A capture's duel is settled by the duel AI at a fixed skill on both sides, seeded from the
 * position, so the mover and the receiver compute the same result and a forged one is spotted.
 * Undefined if the action is not a capture.
 */
export function settleDuel(state: GameState, action: Action): DuelOutcome | undefined {
  if (action.type !== 'move') return undefined
  const attacker = state.pieces.find((p) => p.id === action.pieceId)
  const defender = pieceAt(state, action.to)
  if (!attacker || !defender) return undefined
  return autoDuel(attacker, defender, squareLuminance(state, action.to), [AUTO_DUEL_SKILL, AUTO_DUEL_SKILL], state.rng + state.round, [1, 1], duelCells(state, attacker, defender))
}

const sameDuel = (a: DuelOutcome | undefined, b: DuelOutcome | undefined) =>
  a === b || (!!a && !!b && a.attackerHp === b.attackerHp && a.defenderHp === b.defenderHp)

/** Gives a move its settled duel (or none, if it captures nothing) and leaves other actions alone. */
const settled = (state: GameState, action: Action): Action => {
  if (action.type !== 'move') return action
  const { duel: _ignored, ...rest } = action
  const duel = settleDuel(state, action)
  return duel ? { ...rest, duel } : rest
}

/**
 * One player's side of an online game. It speaks the protocol over a transport, keeps the game,
 * and checks everything the other side sends against the rules before applying it, so neither
 * player can force an illegal move or a doctored duel on the other.
 */
export function createSession({ transport, role, challenge: offered, onChange }: Options): Session {
  let status: Status = 'connecting'
  let reason: EndReason | null = null
  let challenge: Challenge | null = offered ?? null
  let me: Court | null = offered ? otherCourt(offered.side) : null
  let state: GameState | null = offered ? newGame(offered.config) : null
  let resignedBy: Court | null = null
  let greeted = false
  const actions: Action[] = []

  const view = (): SessionView => ({
    status, reason, me, challenge, state, actions: [...actions],
    winner: resignedBy ? otherCourt(resignedBy) : state?.winner ?? null,
  })
  const listeners = new Set<(view: SessionView) => void>()
  const changed = () => {
    const v = view()
    onChange?.(v)
    listeners.forEach((fn) => fn(v))
  }
  const send = (message: Message) => transport.send(encodeMessage(message))

  const end = (why: EndReason) => {
    if (status === 'over') return
    status = 'over'
    reason = why
    // A game that ran its course leaves the channel open (a resignation may still be in flight); a broken one is not worth keeping.
    if (why === 'version' || why === 'protocol' || why === 'illegal' || why === 'desync') transport.close()
    changed()
  }

  /** Records an action already checked and applied, ending the session if it decided the game. */
  const apply = (action: Action, next: GameState) => {
    actions.push(action)
    state = next
    if (next.winner) end('finished')
    else changed()
  }

  const receive = (m: Message) => {
    if (m.t === 'hello') {
      if (greeted) return end('protocol')
      greeted = true
      if (m.v !== PROTOCOL_VERSION || m.fmt !== FORMAT_VERSION) return end('version')
      if (role === 'host' && challenge) send({ t: 'start', challenge: encodeChallenge(challenge) })
      return
    }
    if (!greeted) return end('protocol')
    if (m.t === 'start') {
      if (role !== 'guest' || state) return end('protocol')
      const offer = decodeChallenge(m.challenge)
      if (!offer) return end('protocol')
      challenge = offer
      me = offer.side
      state = newGame(offer.config)
      status = 'playing'
      send({ t: 'ready' })
      return changed()
    }
    if (m.t === 'ready') {
      if (role !== 'host' || status !== 'connecting') return end('protocol')
      status = 'playing'
      return changed()
    }
    if (status !== 'playing' || !state || !me) return end('protocol')
    if (m.t === 'resign') {
      resignedBy = otherCourt(me)
      return end('opponent-resigned')
    }
    if (m.t !== 'act') return end('protocol')
    const action = actionOf(m)
    if (!action) return end('protocol')
    if (m.n !== actions.length) return end('desync')
    if (state.turn === me) return end('illegal')
    if (!sameDuel(action.type === 'move' ? action.duel : undefined, settleDuel(state, action))) return end('illegal')
    const next = reduce(state, action)
    if (next === state) return end('illegal')
    if (stateSum(next) !== m.sum) return end('desync')
    apply(action, next)
  }

  transport.onClose(() => end('closed'))
  transport.onMessage((text) => {
    if (status === 'over') return
    const m = decodeMessage(text)
    if (m) receive(m)
    else end('protocol')
  })
  send(hello())

  return {
    view,
    play: (action) => {
      if (status !== 'playing' || !state || state.turn !== me) return false
      const ready = settled(state, action)
      const next = reduce(state, ready)
      if (next === state) return false
      send(actMessage(actions.length, ready, next))
      apply(ready, next)
      return true
    },
    resign: () => {
      if (status !== 'playing' || !me) return
      resignedBy = me
      send({ t: 'resign' })
      end('resigned')
    },
    listen: (fn) => {
      listeners.add(fn)
      return () => void listeners.delete(fn)
    },
    close: () => {
      if (status === 'over') return transport.close()
      end('closed')
      transport.close()
    },
  }
}
