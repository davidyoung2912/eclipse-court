import { useState, useSyncExternalStore } from 'react'
import { BOSS_UNLOCK } from '../../engine/data/bosses'
import { foeById, LADDER_BOSSES, LADDER_FOES, rankOf, RANKS, suggestFoe } from '../../engine/data/ladder'
import { ladderVoice, rivalLine } from '../../personaMenu'
import { personaById } from '../../engine/data/personas'
import { PERSONALITIES } from '../../engine/data/personality'
import { canStartSeason, ladderSnapshot, seasonHistory, seasonReward, startSeason, subscribeLadder, type SeasonReward } from '../../ladder'
import { earnShards } from '../../shop'
import { Icon, type IconName } from './icons'
import { PageArt } from './MenuArt'
import { Portrait } from '../../art/Portrait'
import { getSettings } from '../../settings'
import { PersonaFace } from '../../art/PersonaFace'
import { bossPortrait } from '../../art/portraits'
import { BackButton } from './BackButton'
import { TipCard } from '../tips/TipCard'
import { daysLeftInMonth, featuredRuleset } from '../../engine/data/featured'
import { t } from '../../i18n'

interface Props {
  /** Lines about the game just played. */
  report?: string[]
  onPlay: (foeId: string) => void
  onBack: () => void
}

/** Each rank's own icon, shown on the opponents who sit in that rank. */
const RANK_ICONS: Record<string, IconName> = {
  Squire: 'squire', Knight: 'knight', Captain: 'captain', Marshal: 'marshal', Warden: 'warden', 'Eclipse Champion': 'champion',
}

/** The ranked ladder: a rating earned against the AI personas, with the opponent that keeps the match close suggested. */
export function Ladder({ report, onPlay, onBack }: Props) {
  const store = useSyncExternalStore(subscribeLadder, ladderSnapshot)
  const suggested = suggestFoe(store.rating)
  const [chosen, setChosen] = useState<string | null>(null)
  const [paid, setPaid] = useState<SeasonReward | null>(null)
  const seasons = seasonHistory(store)
  const lastSeason = seasons[seasons.length - 1]
  const foe = foeById(chosen ?? suggested.id) ?? suggested
  const voice = ladderVoice(foe.personality)
  const voiced = voice ? personaById(voice) : undefined
  const theme = featuredRuleset()
  const next = RANKS.find((r) => r.from > store.rating)
  /** Opponents grouped under the rank their rating sits in, weakest first. */
  const groups = LADDER_FOES.reduce<{ rank: string; foes: (typeof LADDER_FOES)[number][] }[]>((out, f) => {
    const rank = rankOf(f.rating)
    const last = out[out.length - 1]
    if (last?.rank === rank) last.foes.push(f)
    else out.push({ rank, foes: [f] })
    return out
  }, [])
  /** The player's own rank opens; when no opponent sits in it, the one holding the suggested opponent does. */
  const openRank = groups.some((g) => g.rank === rankOf(store.rating)) ? rankOf(store.rating) : rankOf(suggested.rating)
  return (
    <main className="app menu battle-menu">
      <PageArt icon="trophy" />
      <h2>{t('ladder.title')}</h2>
      <p className="tagline">{t('ladder.tagline')}</p>
      <p className="setup-hint">{t('featured.line')}<strong>{theme.name}</strong>. {theme.text} {t('featured.left', { days: t('common.day', { count: daysLeftInMonth() }) })}</p>
      {report && report.length > 0 && (
        <div className="setup-card" role="status">{report.map((line) => <div key={line}>{line}</div>)}</div>
      )}
      <dl className="stat-tiles">
        <div><dd>{store.rating}</dd><dt>{rankOf(store.rating)}</dt></div>
        <div><dd>{store.peak}</dd><dt>{t('ladder.peak')}</dt></div>
        <div><dd>{store.wins} / {store.losses} / {store.draws}</dd><dt>{t('ladder.record')}</dt></div>
      </dl>
      <p className="tagline">{t('ladder.season', { season: store.season, peak: store.seasonPeak })}</p>
      {paid && <div className="setup-card" role="status">{t('ladder.paid', { season: paid.season, peak: paid.peak, rank: paid.rank, shards: paid.shards })}</div>}
      {lastSeason && <p className="season-banner" data-rank={rankOf(lastSeason.peak)}><Icon name={RANK_ICONS[lastSeason.rank] ?? 'swords'} />{t('ladder.banner', { season: lastSeason.season, rank: lastSeason.rank })}</p>}
      {next && <p className="tagline">{t('ladder.toNext', { points: next.from - store.rating, title: next.title })}</p>}
      {voiced && getSettings().banter !== 'off' && (
        <aside className="persona-greet" aria-label={t('ladder.greetLabel', { persona: voiced.name, foe: foe.name })}>
          <PersonaFace id={voiced.id} className="persona-bubble-face" />
          <p><b>{voiced.name}</b>{rivalLine(voiced.id, foe.id, store.rivals[foe.id])}</p>
        </aside>
      )}
      {groups.map(({ rank, foes }) => (
        <details key={rank} className="tier-fold" open={rank === openRank}>
          <summary><h3><Icon name={RANK_ICONS[rank] ?? 'swords'} />{rank}{rank === rankOf(store.rating) ? t('ladder.yourRank') : ''} ({foes.length})</h3></summary>
          <div className="choices">
            {foes.map((f) => (
              <button key={f.id} className={`choice${f.id === foe.id ? ' on' : ''}`} aria-pressed={f.id === foe.id} onClick={() => setChosen(f.id)}>
                <strong><Icon name={RANK_ICONS[rank] ?? 'swords'} />{f.name} · {f.rating}{f.id === suggested.id ? t('ladder.suggested') : ''}{store.rivals[f.id] ? ` · ${store.rivals[f.id].w}–${store.rivals[f.id].l}${store.rivals[f.id].d ? `–${store.rivals[f.id].d}` : ''}` : ''}</strong>
                <span>{PERSONALITIES[f.personality].text}</span>
              </button>
            ))}
          </div>
        </details>
      ))}
      <details className="tier-fold" open={foe.boss !== undefined}>
        <summary><h3><Icon name="champion" />{t('ladder.bosses', { count: LADDER_BOSSES.length })}</h3></summary>
        {store.peak < BOSS_UNLOCK ? (
          <p className="tagline">{t('ladder.bossLocked', { rating: BOSS_UNLOCK })}</p>
        ) : (
          <div className="choices">
            {LADDER_BOSSES.map((f) => (
              <button key={f.id} className={`choice${f.id === foe.id ? ' on' : ''}`} aria-pressed={f.id === foe.id} onClick={() => setChosen(f.id)}>
                <strong><Icon name="champion" />{f.name} · {f.rating}{store.rivals[f.id] ? ` · ${store.rivals[f.id].w}–${store.rivals[f.id].l}${store.rivals[f.id].d ? `–${store.rivals[f.id].d}` : ''}` : ''}</strong>
                <span>{t('ladder.bossRule', { rule: f.boss?.rule ?? '' })}</span>
                {bossPortrait(f.id) && <Portrait id={bossPortrait(f.id)!} className="avatar" />}
              </button>
            ))}
          </div>
        )}
      </details>
      {seasons.length > 0 && (
        <details className="tier-fold">
          <summary><h3><Icon name="trophy" />{t('ladder.history', { count: seasons.length })}</h3></summary>
          <ul className="season-list">
            {seasons.slice().reverse().map((h) => (
              <li key={h.season}><strong>{t('ladder.historyRow', { season: h.season })}</strong>{t('ladder.historyDetail', { peak: h.peak, rank: h.rank, shards: h.shards })}</li>
            ))}
          </ul>
        </details>
      )}
      {store.history.length > 0 && (
        <p className="tagline">{t('ladder.recent', { results: store.history.slice().reverse().map((h) => `${h.result === 'win' ? 'W' : h.result === 'loss' ? 'L' : 'D'} ${h.change >= 0 ? '+' : ''}${h.change}`).join(' · ') })}</p>
      )}
      <div className="menu-buttons stacked">
        <button className="primary" disabled={foe.boss !== undefined && store.peak < BOSS_UNLOCK} onClick={() => onPlay(foe.id)}><Icon name="play" />{t('ladder.play', { name: foe.name })}</button>
        {canStartSeason(store) && <button onClick={() => { if (window.confirm(t('ladder.confirmSeason', { shards: seasonReward(store.season, store.seasonPeak).shards, rank: rankOf(store.seasonPeak) }))) { const r = startSeason(); if (r) { earnShards(r.shards); setPaid(r) } } }}><Icon name="cycle" />{t('ladder.startSeason', { season: store.season + 1 })}</button>}
        <BackButton onClick={onBack} />
      </div>
      <TipCard page="ladder" />
    </main>
  )
}
