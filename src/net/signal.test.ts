import { describe, expect, it } from 'vitest'
import { buildSdp, decodeSignal, encodeSignal, joinLink, parseSdp } from './signal'

const FP = 'AB:CD:EF:01:23:45:67:89:AB:CD:EF:01:23:45:67:89:AB:CD:EF:01:23:45:67:89:AB:CD:EF:01:23:45:67:89'

const offerSdp = [
  'v=0',
  'o=- 4611731400430051336 2 IN IP4 127.0.0.1',
  's=-',
  't=0 0',
  'a=group:BUNDLE 0',
  'a=extmap-allow-mixed',
  'a=msid-semantic: WMS',
  'm=application 54321 UDP/DTLS/SCTP webrtc-datachannel',
  'c=IN IP4 203.0.113.9',
  'a=candidate:842163049 1 udp 1677729535 203.0.113.9 54321 typ srflx raddr 192.168.1.5 rport 54321 generation 0 network-cost 999',
  'a=candidate:1 1 udp 2113937151 192.168.1.5 54321 typ host generation 0 network-cost 999',
  'a=candidate:2 1 tcp 1518280447 192.168.1.5 9 typ host tcptype active generation 0',
  'a=candidate:3 1 udp 2113937151 7f2c9a3e-1111-4444-8888-aaaaaaaaaaaa.local 50000 typ host generation 0',
  'a=ice-ufrag:Zq3k',
  'a=ice-pwd:8f9s0d8f9s0d8f9s0d8f9s0d',
  'a=ice-options:trickle',
  `a=fingerprint:sha-256 ${FP}`,
  'a=setup:actpass',
  'a=mid:0',
  'a=sctp-port:5000',
  'a=max-message-size:262144',
  '',
].join('\r\n')

describe('signaling codes', () => {
  it('keeps credentials, fingerprint and UDP candidates, dropping TCP and the rest', () => {
    const s = parseSdp(offerSdp, 'offer')!
    expect(s.ufrag).toBe('Zq3k')
    expect(s.pwd).toBe('8f9s0d8f9s0d8f9s0d8f9s0d')
    expect(s.fingerprint).toBe(FP.replaceAll(':', '').toLowerCase())
    expect(s.candidates).toEqual([
      '842163049 udp 1677729535 203.0.113.9 54321 srflx 192.168.1.5 54321',
      '1 udp 2113937151 192.168.1.5 54321 host',
      '3 udp 2113937151 7f2c9a3e-1111-4444-8888-aaaaaaaaaaaa.local 50000 host',
    ])
  })

  it('round-trips through a code', () => {
    const s = parseSdp(offerSdp, 'offer')!
    expect(decodeSignal(encodeSignal(s))).toEqual(s)
    const a = { ...s, kind: 'answer' as const }
    expect(decodeSignal(encodeSignal(a))).toEqual(a)
  })

  it('makes a code that is URL-safe and much shorter than the SDP', () => {
    const code = encodeSignal(parseSdp(offerSdp, 'offer')!)
    expect(code).toMatch(/^[A-Za-z0-9_-]+$/)
    expect(code.length).toBeLessThan(offerSdp.length * 0.8)
  })

  it('rebuilds an SDP that parses back to the same signal', () => {
    const s = parseSdp(offerSdp, 'offer')!
    const rebuilt = buildSdp(s)
    expect(rebuilt).toContain('a=setup:actpass')
    expect(rebuilt).toContain(`a=fingerprint:sha-256 ${FP}`)
    expect(rebuilt).toContain('typ srflx raddr 192.168.1.5 rport 54321')
    expect(parseSdp(rebuilt, 'offer')).toEqual(s)
    expect(buildSdp({ ...s, kind: 'answer' })).toContain('a=setup:active')
  })

  it('accepts a code inside a link, with stray whitespace', () => {
    const s = parseSdp(offerSdp, 'offer')!
    const code = encodeSignal(s)
    expect(decodeSignal(joinLink('https://x.test/play/#old', code))).toEqual(s)
    expect(decodeSignal(`  ${code.slice(0, 20)}\n${code.slice(20)} \n`)).toEqual(s)
  })

  it('rejects junk and truncated codes', () => {
    const code = encodeSignal(parseSdp(offerSdp, 'offer')!)
    expect(decodeSignal('')).toBeNull()
    expect(decodeSignal('hello world')).toBeNull()
    expect(decodeSignal('2' + code.slice(1))).toBeNull()
    expect(decodeSignal(code.slice(0, 30))).toBeNull()
    expect(parseSdp('v=0', 'offer')).toBeNull()
  })
})
