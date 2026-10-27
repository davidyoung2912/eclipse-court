/**
 * Manual signaling codes. A data-channel-only SDP blob is mostly boilerplate, so a code keeps just
 * what the other side needs (ICE credentials, DTLS fingerprint, role and candidates) and the full
 * SDP is rebuilt from a fixed template. Codes are URL-safe, so they work as `#j=<code>` links.
 */

export type SignalKind = 'offer' | 'answer'

export interface Signal {
  kind: SignalKind
  ufrag: string
  pwd: string
  /** DTLS fingerprint, hex without colons. */
  fingerprint: string
  /** Candidates as `foundation protocol priority ip port type [raddr rport]`. */
  candidates: string[]
}

export const SIGNAL_VERSION = '1'

const b64 = (text: string) =>
  btoa(String.fromCharCode(...new TextEncoder().encode(text)))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replace(/=+$/, '')

const unb64 = (code: string) => {
  const padded = code.replaceAll('-', '+').replaceAll('_', '/')
  const bin = atob(padded + '='.repeat((4 - (padded.length % 4)) % 4))
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)))
}

const attr = (lines: string[], name: string) => {
  const prefix = `a=${name}:`
  const line = lines.find((l) => l.startsWith(prefix))
  return line?.slice(prefix.length).trim()
}

/** Reads the parts of an SDP that a code carries; null if it lacks any of them. */
export function parseSdp(sdp: string, kind: SignalKind): Signal | null {
  const lines = sdp.split(/\r?\n/)
  const ufrag = attr(lines, 'ice-ufrag')
  const pwd = attr(lines, 'ice-pwd')
  const fp = attr(lines, 'fingerprint')
  if (!ufrag || !pwd || !fp?.startsWith('sha-256 ')) return null
  const fingerprint = fp.slice(8).replaceAll(':', '').toLowerCase()
  if (!/^[0-9a-f]{64}$/.test(fingerprint)) return null
  const candidates: string[] = []
  for (const l of lines) {
    if (!l.startsWith('a=candidate:')) continue
    const f = l.slice('a=candidate:'.length).trim().split(/\s+/)
    // foundation component protocol priority ip port "typ" type [raddr x rport y] ...
    if (f.length < 8 || f[6] !== 'typ' || f[2].toLowerCase() !== 'udp') continue
    const parts = [f[0], f[2].toLowerCase(), f[3], f[4], f[5], f[7]]
    const ri = f.indexOf('raddr')
    const pi = f.indexOf('rport')
    if (ri > 0 && pi > 0) parts.push(f[ri + 1], f[pi + 1])
    candidates.push(parts.join(' '))
  }
  return { kind, ufrag, pwd, fingerprint, candidates }
}

/** Rebuilds a full data-channel SDP from a signal. */
export function buildSdp(s: Signal): string {
  const fp = s.fingerprint.toUpperCase().match(/../g)!.join(':')
  const lines = [
    'v=0',
    'o=- 1 2 IN IP4 127.0.0.1',
    's=-',
    't=0 0',
    'a=group:BUNDLE 0',
    'a=msid-semantic: WMS',
    'm=application 9 UDP/DTLS/SCTP webrtc-datachannel',
    'c=IN IP4 0.0.0.0',
    ...s.candidates.map((c) => {
      const [foundation, protocol, priority, ip, port, type, raddr, rport] = c.split(' ')
      const rel = raddr ? ` raddr ${raddr} rport ${rport}` : ''
      return `a=candidate:${foundation} 1 ${protocol} ${priority} ${ip} ${port} typ ${type}${rel} generation 0`
    }),
    'a=end-of-candidates',
    `a=ice-ufrag:${s.ufrag}`,
    `a=ice-pwd:${s.pwd}`,
    `a=fingerprint:sha-256 ${fp}`,
    `a=setup:${s.kind === 'offer' ? 'actpass' : 'active'}`,
    'a=mid:0',
    'a=sctp-port:5000',
    'a=max-message-size:262144',
  ]
  return lines.join('\r\n') + '\r\n'
}

/** Packs a signal into a short URL-safe code. */
export function encodeSignal(s: Signal): string {
  const head = [s.kind === 'offer' ? 'o' : 'a', s.ufrag, s.pwd, s.fingerprint].join(' ')
  return SIGNAL_VERSION + b64([head, ...s.candidates].join('\n'))
}

/** Unpacks a code; null if it is not one (pasted with stray spaces or a link around it is fine). */
export function decodeSignal(input: string): Signal | null {
  let code = input.trim()
  const hash = code.match(/[#&]j=([^&\s]+)/)
  if (hash) code = hash[1]
  code = code.replace(/\s+/g, '')
  if (!code.startsWith(SIGNAL_VERSION) || !/^[A-Za-z0-9_-]+$/.test(code)) return null
  let text: string
  try {
    text = unb64(code.slice(SIGNAL_VERSION.length))
  } catch {
    return null
  }
  const [head, ...candidates] = text.split('\n')
  const [k, ufrag, pwd, fingerprint] = head.split(' ')
  if ((k !== 'o' && k !== 'a') || !ufrag || !pwd || !/^[0-9a-f]{64}$/.test(fingerprint ?? '')) return null
  if (candidates.some((c) => c.split(' ').length < 6)) return null
  return { kind: k === 'o' ? 'offer' : 'answer', ufrag, pwd, fingerprint, candidates }
}

/** The link a host shares: opening it starts the guest flow. */
export const joinLink = (base: string, code: string) => `${base.split('#')[0]}#j=${code}`
