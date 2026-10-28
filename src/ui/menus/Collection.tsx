import { useState, useSyncExternalStore } from 'react'
import { buy, equip, equippedId, owns, shopSnapshot, subscribeShop } from '../../shop'
import { cosmeticsOf, KIND_TITLES, KINDS, type Cosmetic } from '../../engine/data/cosmetics'
import { getSettings, themeById, updateSettings } from '../../settings'
import { sfx, unlockAudio } from '../../audio/synth'
import { Icon } from './icons'
import { PageArt } from './MenuArt'
import { BackButton } from './BackButton'
import { TipCard } from '../tips/TipCard'
import { t } from '../../i18n'

interface Props {
  onBack: () => void
}

export function Collection({ onBack }: Props) {
  const shop = useSyncExternalStore(subscribeShop, shopSnapshot)
  const [theme, setTheme] = useState(() => getSettings().theme)
  const isOn = (c: Cosmetic) => (c.kind === 'theme' ? theme === c.id : equippedId(c.kind, shop) === c.id)
  const use = (c: Cosmetic) => {
    if (c.kind === 'theme') setTheme(updateSettings({ theme: c.id }).theme)
    else equip(c)
    if (c.kind === 'sound') {
      unlockAudio()
      setTimeout(() => sfx.hit(2), 50)
    }
  }
  return (
    <main className="app menu blue-menu">
      <PageArt icon="star" />
      <h2>{t('collection.title')}</h2>
      <p className="tagline">{t('collection.tagline')}</p>
      <p className="shard-wallet" role="status"><Icon name="star" /><strong>{shop.shards}</strong> {t('collection.shards')}<small>{t('collection.earned', { count: shop.earned })}</small></p>
      {KINDS.map((kind) => (
        <section key={kind} className="collection-kind">
          <h3>{KIND_TITLES[kind]}</h3>
          <div className="choices">
            {cosmeticsOf(kind).map((c) => {
              const have = owns(c, shop)
              const on = have && isOn(c)
              return (
                <button key={c.id} className={`choice${on ? ' on' : ''}`} aria-pressed={have ? on : undefined}
                  disabled={!have && shop.shards < c.cost}
                  onClick={() => (have ? use(c) : buy(c) && use(c))}>
                  <strong>
                    {!have && <Icon name="lock" />}
                    {kind === 'theme' && <><i className="swatch" style={{ background: themeById(c.id).vars['--solari-gold'] }} /><i className="swatch" style={{ background: themeById(c.id).vars['--umbral-violet'] }} /></>}
                    {c.name}
                  </strong>
                  <span>{c.text}</span>
                  <span className="cost">{on ? t('collection.equipped') : have ? t(kind === 'theme' || kind === 'sound' ? 'collection.ownedUse' : 'collection.ownedEquip') : t('collection.cost', { cost: c.cost }) + (shop.shards < c.cost ? t('collection.short', { count: c.cost - shop.shards }) : '')}</span>
                </button>
              )
            })}
          </div>
        </section>
      ))}
      <p className="tagline">{t('collection.freeThemes')}</p>
      <div className="menu-buttons">
        <BackButton onClick={onBack} />
      </div>
      <TipCard page="collection" />
    </main>
  )
}
