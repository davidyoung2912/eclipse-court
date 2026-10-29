import { useState, useSyncExternalStore } from 'react'
import { MAX_PLAYERS, MIN_PLAYERS, NONE, SHARDS_CUP_MATCH, SHARDS_CUP_WON, champion, roundName, sidesOf } from '../../engine/data/tournament'
import { NAME_MAX } from '../../engine/data/personas'
import { clearTournament, matchCourts, openMatch, startCup, startHotSeat, subscribeTournaments, tournamentSnapshot, type Active } from '../../tournaments'
import { PersonaFace } from '../../art/PersonaFace'
import { Icon } from './icons'
import { PageArt } from './MenuArt'
import { BackButton } from './BackButton'
import { TipCard } from '../tips/TipCard'
import { t } from '../../i18n'

interface Props {
  /** Lines about the match just played. */
  report?: string[]
  /** Plays the open match of the tournament in progress. */
  onPlay: () => void
  onBack: () => void
}

/** The bracket, round by round, with the winner of each match marked. */
function Bracket({ active }: { active: Active }) {
  const { bracket } = active
  const rounds = bracket.results.length
  const open = openMatch(active)
  return (
    <div className="bracket">
      {bracket.results.map((row, round) => (
        <section key={round} className="bracket-round">
          <h4>{roundName(round, rounds)}</h4>
          {row.map((winner, match) => {
            const [a, b] = sidesOf(bracket, { round, match })
            const bye = round === 0 && b === NONE
            const now = open?.round === round && open.match === match
            return (
              <div key={match} className={`bracket-match${now ? ' now' : ''}`}>
                {[a, b].map((who, i) => (
                  <div key={i} className={`bracket-side${who !== NONE && who === winner ? ' won' : ''}${winner !== NONE && who !== NONE && who !== winner ? ' lost' : ''}`}>
                    {who === NONE ? (bye && i === 1 ? t('tournament.bye') : '?') : bracket.names[who]}
                  </div>
                ))}
              </div>
            )
          })}
        </section>
      ))}
    </div>
  )
}

/** The names of 4 to 8 local players, and a button to deal the bracket. */
function HotSeatSetup() {
  const [names, setNames] = useState<string[]>(() => Array.from({ length: MIN_PLAYERS }, () => ''))
  const set = (i: number, v: string) => setNames((all) => all.map((n, k) => (k === i ? v : n)))
  return (
    <section className="setup-card">
      <h3>{t('tournament.hotseat')}</h3>
      <p>{t('tournament.hotseatText', { min: MIN_PLAYERS, max: MAX_PLAYERS })}</p>
      {names.map((n, i) => (
        <label key={i} className="name-row">
          <span>{t('tournament.player', { n: i + 1 })}</span>
          <input value={n} maxLength={NAME_MAX} placeholder={t('tournament.playerHolder', { n: i + 1 })} onChange={(e) => set(i, e.target.value)} />
        </label>
      ))}
      <div className="buttons">
        <button disabled={names.length >= MAX_PLAYERS} onClick={() => setNames((all) => [...all, ''])}>{t('tournament.addPlayer')}</button>
        <button disabled={names.length <= MIN_PLAYERS} onClick={() => setNames((all) => all.slice(0, -1))}>{t('tournament.removePlayer')}</button>
        <button className="primary" onClick={() => startHotSeat(names, Date.now())}><Icon name="play" />{t('tournament.deal')}</button>
      </div>
    </section>
  )
}

/** Local and solo tournaments: set one up, or show the one in progress with its next match and, at the end, its winner. */
export function Tournament({ report, onPlay, onBack }: Props) {
  const { active, cups } = useSyncExternalStore(subscribeTournaments, tournamentSnapshot)
  const lines = report && report.length > 0 && (
    <div className="setup-card" role="status">{report.map((line) => <div key={line}>{line}</div>)}</div>
  )

  if (!active)
    return (
      <main className="app menu">
        <PageArt icon="trophy" />
        <h2>{t('tournament.title')}</h2>
        <p className="tagline">{t('tournament.tagline')}</p>
        {lines}
        <section className="setup-card">
          <h3>{t('tournament.cup')}</h3>
          <p>{t('tournament.cupText', { match: SHARDS_CUP_MATCH, won: SHARDS_CUP_WON })}</p>
          <p>{t('tournament.cupRecord', { won: cups.won, entered: cups.entered, finals: cups.finals })}</p>
          <div className="buttons">
            <button className="primary" onClick={() => startCup(Date.now())}><Icon name="trophy" />{t('tournament.enterCup')}</button>
          </div>
        </section>
        <HotSeatSetup />
        <div className="menu-buttons stacked">
          <BackButton onClick={onBack} />
        </div>
        <TipCard page="battle" />
      </main>
    )

  const { bracket } = active
  const names = bracket.names
  const winner = champion(bracket)
  const ref = openMatch(active)
  const courts = matchCourts(active)
  const rounds = bracket.results.length
  const cup = active.kind === 'cup'

  return (
    <main className="app menu">
      <PageArt icon="trophy" />
      <h2>{cup ? t('tournament.cup') : t('tournament.hotseat')}</h2>
      {lines}
      {winner !== null ? (
        <section className="setup-card winner-card" role="status">
          <h3><Icon name="trophy" />{t('tournament.winner', { name: names[winner] })}</h3>
          {cup && winner > 0 && <PersonaFace id={active.field[winner - 1]} className="persona-arc-face" />}
          <p>{cup ? (winner === 0 ? t('tournament.cupWon') : t('tournament.cupLost', { name: names[winner] })) : t('tournament.hotseatWon', { name: names[winner], players: names.length })}</p>
        </section>
      ) : ref && courts ? (
        <section className="setup-card pass-card">
          <h3>{t('tournament.next', { round: roundName(ref.round, rounds) })}</h3>
          <p>
            <strong>{names[courts.solari]}</strong> {t('tournament.asSolari')} · <strong>{names[courts.umbral]}</strong> {t('tournament.asUmbral')}
          </p>
          {cup && <p>{t('tournament.cupFoe', { name: names[courts.umbral], level: ref.round === 0 ? t('tournament.normal') : t('tournament.hard') })}</p>}
          {!cup && active.draws > 0 && <p>{t('tournament.swapped')}</p>}
          {!cup && <p>{t('tournament.pass', { name: names[courts.solari] })}</p>}
          <div className="buttons">
            <button className="primary" onClick={onPlay}><Icon name="play" />{t('tournament.play')}</button>
          </div>
        </section>
      ) : null}
      <Bracket active={active} />
      <div className="menu-buttons stacked">
        <button onClick={clearTournament}>{winner !== null ? t('tournament.done') : t('tournament.abandon')}</button>
        <BackButton onClick={onBack} />
      </div>
      <TipCard page="battle" />
    </main>
  )
}
