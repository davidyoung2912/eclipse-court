import { useEffect, useState, useSyncExternalStore } from 'react'
import { SEASON_TIERS, rewardFor, seasonDaysLeft, seasonId, tierProgress, tierReached, type SeasonItem } from '../../engine/data/season'
import { t } from '../../i18n'
import { bannersEarned, claimAllTiers, claimTier, claimable, refreshSeason, seasonSnapshot, subscribeSeason } from '../../season'
import { haptic } from '../../haptics'
import { Bar } from './Bar'
import { BackButton } from './BackButton'
import { Icon } from './icons'
import { PageArt } from './MenuArt'

const itemText = (item: SeasonItem | undefined) => {
  if (!item) return ''
  const what = item.kind === 'cosmetic' ? t('season.cosmetic', { name: item.cosmetic.name }) : item.kind === 'freeze' ? t('season.freeze') : item.kind === 'hints' ? t('season.hints') : t('season.banner', { name: item.name })
  return ` + ${what}`
}

const monthName = (season: number) => new Date(Math.floor(season / 100), (season % 100) - 1, 1).toLocaleString(undefined, { month: 'long', year: 'numeric' })

/** The month's 30-tier reward track, filled by play, with a claim button for each tier reached. */
export function Season({ onBack }: { onBack: () => void }) {
  useEffect(refreshSeason, [])
  const state = useSyncExternalStore(subscribeSeason, seasonSnapshot)
  const [note, setNote] = useState('')
  const id = seasonId()
  const live = state.season === id
  const xp = live ? state.xp : 0
  const reached = tierReached(xp)
  const open = live ? claimable(state) : []
  const progress = tierProgress(xp)
  const banners = bannersEarned(state)
  return (
    <main className="app menu blue-menu">
      <PageArt icon="star" />
      <h2>{t('season.title')} · {monthName(id)}</h2>
      <p className="lede">{t('season.intro')}</p>
      <p className="status">{t('season.daysLeft', { count: seasonDaysLeft() })} · {t('season.xp', { xp, tier: reached, max: SEASON_TIERS })}</p>
      <Bar fraction={reached / SEASON_TIERS} />
      <p className="tagline">{progress ? t('season.next', { into: progress.into, step: progress.step, tier: reached + 1 }) : t('season.done')}</p>
      {open.length > 0 && (
        <button className="primary" onClick={() => { haptic('unlock'); setNote(t('season.reward', { shards: claimAllTiers(), item: '' })) }}>
          <Icon name="star" />{t('season.claimAll', { count: open.length })}
        </button>
      )}
      {note && <p className="status" role="status">{note}</p>}
      <ol className="season-tiers">
        {Array.from({ length: SEASON_TIERS }, (_, i) => i + 1).map((tier) => {
          const reward = rewardFor(id, tier)
          const taken = live && state.claimed.includes(tier)
          const ready = open.includes(tier)
          return (
            <li key={tier} className={taken ? 'taken' : ready ? 'ready' : 'locked'}>
              <span className="tier-text">
                <strong>{t('season.tier', { tier })}</strong>
                <small>{t('season.reward', { shards: reward.shards, item: itemText(reward.item) })}</small>
              </span>
              {ready && (
                <button className="primary" onClick={() => {
                  const got = claimTier(tier)
                  if (got) { haptic('unlock'); setNote(`${t('season.reward', { shards: got.shards, item: itemText(got.item) })}${got.duplicate ? ` ${t('season.dupe')}` : ''}`) }
                }}>
                  <Icon name="star" />{t('season.claim')}
                </button>
              )}
              {taken && <small><Icon name="check" />{t('season.claimed')}</small>}
              {!taken && !ready && <small>{t('season.locked')}</small>}
            </li>
          )
        })}
      </ol>
      {banners.length > 0 && (
        <details open>
          <summary><h3>{t('season.banners')}</h3></summary>
          <ul className="mastery-tracks">{banners.map((b, i) => <li key={`${b}${i}`}><strong>{b}</strong></li>)}</ul>
        </details>
      )}
      {state.history.length > 0 && (
        <details>
          <summary><h3>{t('season.history')}</h3></summary>
          <ul className="mastery-tracks">
            {state.history.map((h) => <li key={h.season}>{t('season.historyRow', { month: monthName(h.season), tiers: h.tiers, banner: h.banner ? t('season.bannerMark') : '' })}</li>)}
          </ul>
        </details>
      )}
      <div className="menu-buttons stacked"><BackButton onClick={onBack} /></div>
    </main>
  )
}
