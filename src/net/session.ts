import { AUTO_DUEL_SKILL } from '../ai/profile'
import { autoDuel } from '../ai/autoDuel'
import { decodeChallenge, encodeChallenge, type Challenge } from '../engine/challenge'
import { newGame, reduce } from '../engine/reducer'
import { duelCells } from '../engine/rules/cells'
import { otherCourt } from '../engine/rules/board'
import { squareLuminance } from '../engine/rules/luminance'
import { pieceAt } from '../engine/rules/moves'
import type { Action, Court, DuelOutcome, GameState } from '../engine/rules/types'
import { actionOf, actMessage, type ChatId, decodeMessage, encodeMessage, hello, PROTOCOL_VERSION, stateSum, type Message } from './protocol'
import { pack } from '../engine/serialize'
import type { Transport } from './transport'
import { FORMAT_VERSION } from '../engine/serialize'

export type Status = 'connecting' | 'playing' | 'over'

/** Why a session ended. Anything but `finished` and the two resignations is a failure. */
export type EndReason =
  | 'finished'
  | 'resigned'
  | 'opponent-resigned'
  /** Both players agreed to a draw. */
  | 'drawn'
  /** The connection dropped. */
  | 'closed'
  /** The other player chose to leave. */
  | 'opponent-left'
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
  /** Whether the other player can be heard; it drops mid-game when the connection goes quiet or closes, and `reconnect` can restore it. */
  link: 'up' | 'down'
  /** Playing again after the game: `ask` once it ended and the other side is still there, `sent` once asked, `asked` if only they have. */
  rematch: 'none' | 'ask' | 'sent' | 'asked'
  /** A draw offer: `offered` by this player, `asked` by the other, or `none`. */
  draw: 'none' | 'offered' | 'asked'
  /** The latest quick phrase said by either player; `n` counts them so an equal phrase still shows again. */
  chat: { n: number; from: 'me' | 'them'; id: ChatId } | null
  /** The winner, counting a resignation; null while undecided or if the session failed. */
  winner: GameState['winner']
}

export interface Session {
  role: 'host' | 'guest'
  view: () => SessionView
  /** Plays the local court's action, settling any capture, and sends it. False if the rules refuse it or it is not this player's turn. */
  play: (action: Action) => boolean
  resign: () => void
  /** Offers a draw to the other player. */
  offerDraw: () => void
  /** Answers the other player's draw offer. */
  answerDraw: (accept: boolean) => void
  /** Says a quick phrase to the other player. */
  say: (id: ChatId) => void
  /** Asks for another match with the courts swapped; it starts once both players have asked. False if the game is not over or the other side has gone. */
  rematch: () => boolean
  /** Takes a fresh transport after the link dropped, swaps game positions with the other side and resends whatever either missed. */
  reconnect: (transport: Transport) => void
  /** A text describing the game so far, to attach to a bug report after a desync. */
  report: () => string
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
  /** How often to send a heartbeat, and how long without hearing anything before the link counts as dropped (milliseconds). */
  beatMs?: number
  lostMs?: number
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
export function createSession({ transport: first, role, challenge: offered, onChange, beatMs = 4000, lostMs = 12000 }: Options): Session {
  let transport = first
  let status: Status = 'connecting'
  let reason: EndReason | null = null
  let challenge: Challenge | null = offered ?? null
  let me: Court | null = offered ? otherCourt(offered.side) : null
  let state: GameState | null = offered ? newGame(offered.config) : null
  let resignedBy: Court | null = null
  let draw: SessionView['draw'] = 'none'
  let chat: SessionView['chat'] = null
  let greeted = false
  let link: 'up' | 'down' = 'up'
  const actions: Action[] = []
  /** The checksum after each action, with the starting position's first, so a peer's `sync` can be checked at any point. */
  const sums: string[] = state ? [stateSum(state)] : []
  /** After a reconnect, the action count the other side is ahead by; the link stays down until it is reached. */
  let catchUp: number | null = null
  let lastHeard = Date.now()
  let beating: ReturnType<typeof setInterval> | undefined
  /** Whether the channel is still open, and who has asked for a rematch. */
  let open = true
  let asked = false
  let askedByThem = false

  const rematchState = (): SessionView['rematch'] => {
    if (status !== 'over' || !open || (reason !== 'finished' && reason !== 'resigned' && reason !== 'opponent-resigned' && reason !== 'drawn')) return 'none'
    return asked ? 'sent' : askedByThem ? 'asked' : 'ask'
  }
  const view = (): SessionView => ({
    status, reason, me, challenge, state, actions: [...actions], link, rematch: rematchState(),
    draw, chat,
    winner: resignedBy ? otherCourt(resignedBy) : reason === 'drawn' ? 'draw' : state?.winner ?? null,
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
    clearInterval(beating)
    // A game that ran its course leaves the channel open (a resignation may still be in flight); a broken one is not worth keeping.
    if (why === 'version' || why === 'protocol' || why === 'illegal' || why === 'desync') transport.close()
    changed()
  }

  /** Records an action already checked and applied, ending the session if it decided the game. */
  const apply = (action: Action, next: GameState) => {
    draw = 'none'
    actions.push(action)
    sums.push(stateSum(next))
    state = next
    if (next.winner) end('finished')
    else {
      if (catchUp !== null && actions.length >= catchUp) {
        catchUp = null
        link = 'up'
      }
      changed()
    }
  }

  /** The connection is gone or silent; the game is kept so it can be picked up again. */
  const drop = () => {
    if (status !== 'playing') return end('closed')
    if (link === 'down') return
    link = 'down'
    transport.close()
    changed()
  }

  /** Beats the heart while the match is on, and notices when nothing comes back. */
  const startBeat = () => {
    clearInterval(beating)
    beating = setInterval(() => {
      if (status !== 'playing') return
      if (link === 'up' && Date.now() - lastHeard > lostMs) return drop()
      send({ t: 'beat' })
    }, beatMs)
    ;(beating as { unref?: () => void }).unref?.()
  }

  /** Answers the other side's position after a reconnect: sends what they lack, or waits for what we lack. */
  const resync = (m: Extract<Message, { t: 'sync' }>) => {
    if (status !== 'playing' || !state) return end('protocol')
    if (m.n > actions.length) {
      catchUp = m.n
      return
    }
    if (sums[m.n] !== m.sum) return end('desync')
    for (let i = m.n; i < actions.length; i++) send({ t: 'act', n: i, a: pack(actions[i]), sum: sums[i + 1] })
    catchUp = null
    link = 'up'
    changed()
  }

  /** Both players want another match: the host deals it, with the courts swapped, and the guest follows on `start`. */
  const maybeRematch = () => {
    if (!asked || !askedByThem || rematchState() === 'none') return
    if (role !== 'host' || !challenge) return
    challenge = { config: challenge.config, side: otherCourt(challenge.side) }
    me = otherCourt(challenge.side)
    reset(newGame(challenge.config))
    status = 'connecting'
    reason = null
    send({ t: 'start', challenge: encodeChallenge(challenge) })
    changed()
  }

  /** Clears the last game so a new one can begin. */
  const reset = (fresh: GameState) => {
    actions.length = 0
    sums.length = 0
    sums.push(stateSum(fresh))
    state = fresh
    resignedBy = null
    draw = 'none'
    chat = null
    asked = false
    askedByThem = false
    catchUp = null
    link = 'up'
    lastHeard = Date.now()
  }

  const receive = (m: Message) => {
    lastHeard = Date.now()
    if (m.t === 'beat') return
    if (m.t === 'rematch') {
      if (rematchState() === 'none') return
      askedByThem = true
      changed()
      return maybeRematch()
    }
    if (m.t === 'bye') return end(status === 'playing' ? 'opponent-left' : 'closed')
    if (m.t === 'sync') return resync(m)
    if (m.t === 'hello') {
      if (greeted) return end('protocol')
      greeted = true
      if (m.v !== PROTOCOL_VERSION || m.fmt !== FORMAT_VERSION) return end('version')
      if (role === 'host' && challenge) send({ t: 'start', challenge: encodeChallenge(challenge) })
      return
    }
    if (!greeted) return end('protocol')
    if (m.t === 'start') {
      const again = status === 'over' && asked && askedByThem
      if (role !== 'guest' || (state && !again)) return end('protocol')
      const offer = decodeChallenge(m.challenge)
      if (!offer) return end('protocol')
      challenge = offer
      me = offer.side
      reset(newGame(offer.config))
      status = 'playing'
      reason = null
      startBeat()
      send({ t: 'ready' })
      return changed()
    }
    if (m.t === 'ready') {
      if (role !== 'host' || status !== 'connecting') return end('protocol')
      status = 'playing'
      startBeat()
      return changed()
    }
    if (m.t === 'chat' || m.t === 'draw' || m.t === 'draw-yes' || m.t === 'draw-no') {
      if (status !== 'playing') return
      if (m.t === 'chat') chat = { n: (chat?.n ?? 0) + 1, from: 'them', id: m.id }
      // Offers that cross each other are an agreement.
      else if (m.t === 'draw') {
        if (draw === 'offered') return end('drawn')
        draw = 'asked'
      } else if (draw === 'offered') {
        draw = 'none'
        if (m.t === 'draw-yes') return end('drawn')
      }
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

  /** Listens to one transport; once it is replaced, whatever it still says is ignored. */
  const attach = (t: Transport) => {
    t.onClose(() => {
      if (t !== transport) return
      open = false
      drop()
      if (status === 'over') changed()
    })
    t.onMessage((text) => {
      if (t !== transport) return
      if (status === 'over' && rematchState() === 'none') return
      if (status === 'over') {
        // After a finished game only the rematch exchange is heard.
        const m = decodeMessage(text)
        if (m && (m.t === 'rematch' || m.t === 'start')) receive(m)
        return
      }
      const m = decodeMessage(text)
      if (m) receive(m)
      else end('protocol')
    })
  }
  attach(transport)
  send(hello())

  return {
    role,
    view,
    play: (action) => {
      if (status !== 'playing' || link !== 'up' || !state || state.turn !== me) return false
      const ready = settled(state, action)
      const next = reduce(state, ready)
      if (next === state) return false
      send(actMessage(actions.length, ready, next))
      apply(ready, next)
      return true
    },
    reconnect: (next) => {
      if (status !== 'playing') return next.close()
      const old = transport
      transport = next
      if (old !== next) old.close()
      attach(next)
      lastHeard = Date.now()
      link = 'down'
      catchUp = null
      changed()
      send({ t: 'sync', n: actions.length, sum: sums[actions.length] })
    },
    report: () => JSON.stringify({
      reason, role, link,
      challenge: challenge ? encodeChallenge(challenge) : null,
      actions: actions.map(pack),
      sum: state ? stateSum(state) : null,
    }),
    rematch: () => {
      if (rematchState() !== 'ask' && rematchState() !== 'asked') return false
      asked = true
      send({ t: 'rematch' })
      changed()
      maybeRematch()
      return true
    },
    resign: () => {
      if (status !== 'playing' || !me) return
      resignedBy = me
      send({ t: 'resign' })
      end('resigned')
    },
    offerDraw: () => {
      if (status !== 'playing' || draw !== 'none') return
      draw = 'offered'
      send({ t: 'draw' })
      changed()
    },
    answerDraw: (accept) => {
      if (status !== 'playing' || draw !== 'asked') return
      draw = 'none'
      send({ t: accept ? 'draw-yes' : 'draw-no' })
      if (accept) return end('drawn')
      changed()
    },
    say: (id) => {
      if (status !== 'playing') return
      chat = { n: (chat?.n ?? 0) + 1, from: 'me', id }
      send({ t: 'chat', id })
      changed()
    },
    listen: (fn) => {
      listeners.add(fn)
      return () => void listeners.delete(fn)
    },
    close: () => {
      if (status !== 'over') send({ t: 'bye' })
      end('closed')
      transport.close()
    },
  }
}
