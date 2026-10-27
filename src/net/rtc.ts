/**
 * The WebRTC glue: one peer connection with one data channel, wrapped as a `Transport`. Kept thin
 * on purpose (it is not unit tested); the protocol is tested over the loopback transport and the
 * signaling codes in `signal.test.ts`.
 */
import { buildSdp, decodeSignal, encodeSignal, parseSdp, type SignalKind } from './signal'
import type { Transport } from './transport'

export const ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun.cloudflare.com:3478' },
]

/** Longest wait for candidate gathering; a code made after this carries whatever was found. */
const GATHER_MS = 4000

export interface HostOffer {
  /** The offer code to give the guest. */
  code: string
  /** Takes the guest's answer code; resolves with the open channel, rejects on a bad code or failure. */
  accept: (answerCode: string) => Promise<Transport>
  cancel: () => void
}

export interface GuestAnswer {
  /** The answer code to send back to the host. */
  code: string
  /** Resolves once the host has applied the answer and the channel is open. */
  connected: Promise<Transport>
  cancel: () => void
}

export const rtcSupported = () => typeof RTCPeerConnection !== 'undefined'

function gathered(pc: RTCPeerConnection): Promise<void> {
  return new Promise((resolve) => {
    if (pc.iceGatheringState === 'complete') return resolve()
    const done = () => {
      clearTimeout(timer)
      pc.removeEventListener('icegatheringstatechange', onChange)
      resolve()
    }
    const onChange = () => pc.iceGatheringState === 'complete' && done()
    const timer = setTimeout(done, GATHER_MS)
    pc.addEventListener('icegatheringstatechange', onChange)
  })
}

function wrap(pc: RTCPeerConnection, channel: RTCDataChannel): Transport {
  let handler: ((text: string) => void) | undefined
  let closeHandler: (() => void) | undefined
  const inbox: string[] = []
  let closed = false
  const drain = () => {
    while (handler && inbox.length) handler(inbox.shift()!)
  }
  const shut = () => {
    if (closed) return
    closed = true
    closeHandler?.()
  }
  channel.onmessage = (e) => {
    if (typeof e.data === 'string') {
      inbox.push(e.data)
      drain()
    }
  }
  channel.onclose = shut
  pc.addEventListener('connectionstatechange', () => {
    if (pc.connectionState === 'failed' || pc.connectionState === 'closed') shut()
  })
  return {
    send: (text) => {
      if (!closed && channel.readyState === 'open') channel.send(text)
    },
    onMessage: (h) => {
      handler = h
      drain()
    },
    onClose: (h) => {
      closeHandler = h
      if (closed) h()
    },
    close: () => {
      channel.close()
      pc.close()
      shut()
    },
  }
}

const opened = (pc: RTCPeerConnection, channel: RTCDataChannel) =>
  new Promise<Transport>((resolve, reject) => {
    const fail = () => reject(new Error('The connection failed.'))
    if (channel.readyState === 'open') return resolve(wrap(pc, channel))
    channel.onopen = () => resolve(wrap(pc, channel))
    channel.onerror = fail
    pc.addEventListener('connectionstatechange', () => pc.connectionState === 'failed' && fail())
  })

async function codeFor(pc: RTCPeerConnection, kind: SignalKind): Promise<string> {
  await gathered(pc)
  const signal = parseSdp(pc.localDescription?.sdp ?? '', kind)
  if (!signal) throw new Error('Could not read the connection details.')
  return encodeSignal(signal)
}

/** Starts hosting: creates the data channel and the offer code. */
export async function hostOffer(): Promise<HostOffer> {
  const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS })
  const channel = pc.createDataChannel('eclipse-court', { ordered: true })
  await pc.setLocalDescription(await pc.createOffer())
  const code = await codeFor(pc, 'offer')
  return {
    code,
    cancel: () => pc.close(),
    accept: async (answerCode) => {
      const signal = decodeSignal(answerCode)
      if (!signal || signal.kind !== 'answer') throw new Error('That is not an answer code.')
      const open = opened(pc, channel)
      await pc.setRemoteDescription({ type: 'answer', sdp: buildSdp(signal) })
      return open
    },
  }
}

/** Joins from an offer code (or a link containing one): makes the answer code to send back. */
export async function guestAnswer(offerCode: string): Promise<GuestAnswer> {
  const signal = decodeSignal(offerCode)
  if (!signal || signal.kind !== 'offer') throw new Error('That is not an offer code.')
  const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS })
  const channelReady = new Promise<RTCDataChannel>((resolve) => {
    pc.ondatachannel = (e) => resolve(e.channel)
  })
  await pc.setRemoteDescription({ type: 'offer', sdp: buildSdp(signal) })
  await pc.setLocalDescription(await pc.createAnswer())
  const code = await codeFor(pc, 'answer')
  return {
    code,
    cancel: () => pc.close(),
    connected: channelReady.then((channel) => opened(pc, channel)),
  }
}
