import { useEffect, useRef, useState } from 'react'
import type { Challenge } from '../../engine/challenge'
import { describeConfig } from '../../share'
import { guestAnswer, hostOffer, type GuestAnswer, type HostOffer } from '../../net/rtc'
import { createSession, type Session, type SessionView } from '../../net/session'
import { decodeSignal, joinLink } from '../../net/signal'
import { CONNECT_MS, NAT_HELP, withTimeout } from '../../net/timeout'
import { ShareButton } from '../ShareButton'
import { Icon } from './icons'
import { PageArt } from './MenuArt'
import { TipCard } from '../tips/TipCard'
import { BackButton } from './BackButton'
import { t } from '../../i18n'

interface Props {
  /** The host brings the match to offer; the guest takes whatever the host sends. */
  challenge?: Challenge
  /** An offer code from a join link, for the guest. */
  offer?: string
  /** Both players are connected and the match is known: play it. The game then owns the session. */
  onStart: (session: Session) => void
  /** Picking a dropped game back up: the session to reconnect, and what to do once the link is back. */
  resume?: Session
  onResumed?: (session: Session) => void
  onBack: () => void
}

type Step =
  | { name: 'making' }
  /** The host waits for the guest's answer code. */
  | { name: 'offer'; code: string }
  /** The guest has an answer code to send back and waits for the host. */
  | { name: 'answer'; code: string }
  | { name: 'paste' }
  | { name: 'connecting' }
  | { name: 'connected'; view: SessionView }
  | { name: 'failed'; text: string }

const copy = (text: string) => navigator.clipboard?.writeText(text).catch(() => {})

/** Where two players find each other: the host shows an offer and takes an answer, the guest does the reverse. */
export function Lobby({ challenge, offer, onStart, resume, onResumed, onBack }: Props) {
  const host = resume ? resume.role === 'host' : !!challenge
  const [step, setStep] = useState<Step>(host ? { name: 'making' } : { name: 'paste' })
  const [text, setText] = useState(offer ?? '')
  const [note, setNote] = useState<string | null>(null)
  const pending = useRef<HostOffer | GuestAnswer | null>(null)
  const session = useRef<Session | null>(null)
  /** Set on leaving, so a connection that finishes afterwards is closed rather than used. */
  const gone = useRef(false)
  /** Set once the game has taken the session, which the lobby must then leave open. */
  const started = useRef(false)

  const begin = (transport: Parameters<typeof createSession>[0]['transport']) => {
    if (gone.current) return transport.close()
    if (resume) {
      resume.reconnect(transport)
      return setStep({ name: 'connecting' })
    }
    session.current = createSession({
      transport, role: host ? 'host' : 'guest', challenge,
      onChange: (view) => {
        if (gone.current || started.current) return
        if (view.status === 'playing' && view.me && session.current) {
          started.current = true
          return onStart(session.current)
        }
        if (view.status === 'over') setStep({ name: 'failed', text: failure(view) })
        else setStep({ name: 'connected', view })
      },
    })
    setStep({ name: 'connected', view: session.current.view() })
  }

  const fail = (e: unknown) => {
    if (gone.current) return
    pending.current?.cancel()
    setStep({ name: 'failed', text: `${e instanceof Error ? e.message : t('lobby.failed')} ${NAT_HELP}` })
  }

  // The host makes its offer on arrival.
  useEffect(() => {
    gone.current = false
    session.current = resume ?? null
    const stop = resume?.listen((view) => {
      if (gone.current || started.current) return
      if (view.status === 'over') setStep({ name: 'failed', text: failure(view) })
      else if (view.link === 'up') {
        started.current = true
        onResumed?.(resume)
      }
    })
    if (host) {
      hostOffer().then((o) => {
        if (gone.current) return o.cancel()
        pending.current = o
        setStep({ name: 'offer', code: o.code })
      }, fail)
    }
    return () => {
      stop?.()
      gone.current = true
      pending.current?.cancel()
      if (!started.current) session.current?.close()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const connect = async () => {
    const code = text.trim()
    if (!decodeSignal(code)) return setNote(t(host ? 'lobby.badAnswer' : 'lobby.badJoin'))
    setNote(null)
    try {
      if (host) {
        const o = pending.current as HostOffer
        setStep({ name: 'connecting' })
        begin(await withTimeout(o.accept(code), CONNECT_MS, t('lobby.timedOut'), o.cancel))
      } else {
        const g = await guestAnswer(code)
        pending.current = g
        setStep({ name: 'answer', code: g.code })
        begin(await withTimeout(g.connected, CONNECT_MS * 2, t('lobby.hostSlow'), g.cancel))
      }
    } catch (e) {
      fail(e)
    }
  }

  const joinUrl = (code: string) => joinLink(window.location.href, code)
  const view = step.name === 'connected' ? step.view : null
  const shown = view?.challenge
  return (
    <main className="app menu battle-menu">
      <PageArt icon="chain" />
      <h2>{t(resume ? 'lobby.reconnect' : host ? 'lobby.host' : 'lobby.join')}</h2>
      {step.name === 'making' && <p className="tagline">{t('lobby.making')}</p>}
      {step.name === 'offer' && <>
        <p className="tagline">{t('lobby.offerText')}</p>
        <textarea className="code-box" rows={4} readOnly value={step.code} aria-label={t('lobby.yourJoinCode')} onFocus={(e) => e.target.select()} />
        <div className="menu-buttons">
          <button onClick={async () => { await copy(step.code); setNote(t('lobby.copied')) }}><Icon name="chain" />{t('lobby.copyCode')}</button>
          <ShareButton title={t('lobby.shareTitle')} label={t('lobby.shareLink')} link={() => joinUrl(step.code)} />
        </div>
        <h3>{t('lobby.theirAnswer')}</h3>
        <textarea className="code-box" rows={4} value={text} spellCheck={false} aria-label={t('lobby.answerCode')} onChange={(e) => { setText(e.target.value); setNote(null) }} />
      </>}
      {step.name === 'paste' && <>
        <p className="tagline">{t('lobby.pasteText')}</p>
        <textarea className="code-box" rows={5} value={text} spellCheck={false} aria-label={t('lobby.joinLinkOrCode')} onChange={(e) => { setText(e.target.value); setNote(null) }} />
      </>}
      {step.name === 'answer' && <>
        <p className="tagline">{t('lobby.answerText')}</p>
        <textarea className="code-box" rows={4} readOnly value={step.code} aria-label={t('lobby.yourAnswerCode')} onFocus={(e) => e.target.select()} />
        <div className="menu-buttons">
          <button onClick={async () => { await copy(step.code); setNote(t('lobby.copied')) }}><Icon name="chain" />{t('lobby.copyCode')}</button>
        </div>
        <p className="tagline">{t('lobby.waitingHost')}</p>
      </>}
      {step.name === 'connecting' && <p className="tagline">{t('lobby.connecting')}</p>}
      {shown && view && <>
        <p className="tagline">{t(view.status === 'playing' ? 'lobby.connected' : 'lobby.connectedWaiting')}{view.me && t('lobby.youPlay', { court: t(view.me === 'solari' ? 'lobby.solari' : 'lobby.umbral') })}</p>
        <ul className="setup-card">{describeConfig(shown).map((line) => <li key={line}>{line}</li>)}</ul>
      </>}
      {step.name === 'connected' && !shown && <p className="tagline">{t('lobby.connectedChoosing')}</p>}
      {step.name === 'failed' && <p role="alert">{step.text}</p>}
      {note && <p role="status">{note}</p>}
      <div className="menu-buttons stacked">
        {(step.name === 'offer' || step.name === 'paste') && (
          <button className="primary" disabled={!text.trim()} onClick={connect}><Icon name="play" />{t(host ? 'lobby.connect' : 'lobby.joinButton')}</button>
        )}
        <BackButton onClick={onBack} label={t(step.name === 'connected' ? 'common.leave' : 'common.back')} />
      </div>
      <p className="tagline">{t('lobby.stunNote')}</p>
      <TipCard page="online" />
    </main>
  )
}

/** A line for a session that ended before the game could begin. */
function failure(view: SessionView): string {
  switch (view.reason) {
    case 'version': return t('lobby.versionMismatch')
    case 'opponent-left': return t('lobby.opponentLeft')
    case 'desync': case 'illegal': return t('lobby.desync')
    case 'closed': return t('lobby.closed', { help: NAT_HELP })
    default: return t('lobby.ended')
  }
}
