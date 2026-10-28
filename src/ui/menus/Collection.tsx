import { useState, useSyncExternalStore } from 'react'
import { CountUp } from '../CountUp'
import { buy, equip, equippedId, owns, shopSnapshot, subscribeShop } from '../../shop'
import { glintOf } from '../../progression'
import { cosmeticKey, cosmeticsOf, KIND_TITLES, KINDS, rarityOf, type Cosmetic } from '../../engine/data/cosmetics'
import { getSettings, themeById, updateSettings } from '../../settings'
import { sfx, unlockAudio } from '../../audio/synth'
import { FLIP_MS, REVEAL_SPARKS } from '../../rewardFx'
import { haptic } from '../../haptics'
import { Icon } from './icons'
import { PageArt } from './MenuArt'
import { BackButton } from './BackButton'
import { Showcase } from './Showcase'
import { TipCard } from '../tips/TipCard'
import { t } from '../../i18n'
import type { Rarity } from '../../engine/data/cosmetics'

/** The glint's period, strength and an id-based delay so neighbouring rows do not sweep together. */
function glintStyle(rarity: Rarity, id: string): Record<string, string> {
  const g = glintOf(rarity)
  if (!g) return {}
  const seed = [...id].reduce((n, ch) => (n * 31 + ch.charCodeAt(0)) % 997, 7)
  return { '--glint-period': `${g.period}ms`, '--glint-alpha': String(g.strength), '--glint-delay': `${-(seed / 997) * g.period}ms` }
}

interface Props {
  onBack: () => void
}

export function Collection({ onBack }: Props) {
  const shop = useSyncExternalStore(subscribeShop, shopSnapshot)
  const [theme, setTheme] = useState(() => getSettings().theme)
  const [preview, setPreview] = useState<Cosmetic | null>(null)
  const [fresh, setFresh] = useState('')
  const isOn = (c: Cosmetic) => (c.kind === 'theme' ? theme === c.id : equippedId(c.kind, shop) === c.id)
  const use = (c: Cosmetic) => {
    if (c.kind === 'theme') setTheme(updateSettings({ theme: c.id }).theme)
    else equip(c)
    setPreview(c)
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
      <p className="shard-wallet" role="status"><Icon name="star" /><strong><CountUp value={shop.shards} /></strong> {t('collection.shards')}<small>{t('collection.earned', { count: shop.earned })}</small></p>
      {preview && <Showcase cosmetic={preview} />}
      {KINDS.map((kind) => (
        <section key={kind} className="collection-kind">
          <h3>{KIND_TITLES[kind]}</h3>
          <div className="choices">
            {cosmeticsOf(kind).map((c) => {
              const have = owns(c, shop)
              const on = have && isOn(c)
              return (
                <div key={c.id} className={`choice-row rarity-${rarityOf(c)}${glintOf(rarityOf(c)) ? ' glint' : ''}${fresh === cosmeticKey(c) ? ' unlocked' : ''}`}
                  style={{ ...glintStyle(rarityOf(c), c.id), ...(fresh === cosmeticKey(c) ? { ['--flip' as string]: `${FLIP_MS[rarityOf(c)]}ms` } : null) }}>
                  {fresh === cosmeticKey(c) && Array.from({ length: REVEAL_SPARKS[rarityOf(c)] }, (_, i) => (
                    <i key={i} className="reveal-spark" aria-hidden="true" style={{ ['--angle' as string]: `${(360 / REVEAL_SPARKS[rarityOf(c)]) * i}deg` }} />
                  ))}
                  <button className={`choice${on ? ' on' : ''}`} aria-pressed={have ? on : undefined}
                    disabled={!have && shop.shards < c.cost}
                    onClick={() => {
                      if (have) return use(c)
                      if (buy(c)) { setFresh(cosmeticKey(c)); use(c); haptic('unlock') }
                    }}>
                    <strong>
                      {!have && <Icon name="lock" />}
                      {kind === 'theme' && <><i className="swatch" style={{ background: themeById(c.id).vars['--solari-gold'] }} /><i className="swatch" style={{ background: themeById(c.id).vars['--umbral-violet'] }} /></>}
                      {c.name}
                    </strong>
                    <span>{c.text}</span>
                    <span className="cost">{on ? t('collection.equipped') : have ? t(kind === 'theme' || kind === 'sound' ? 'collection.ownedUse' : 'collection.ownedEquip') : t('collection.cost', { cost: c.cost }) + (shop.shards < c.cost ? t('collection.short', { count: c.cost - shop.shards }) : '')}</span>
                  </button>
                  <button className="preview-btn" aria-pressed={preview?.kind === c.kind && preview.id === c.id}
                    aria-label={t('collection.previewOf', { name: c.name })} onClick={() => setPreview(c)}>
                    {t('collection.preview')}
                  </button>
                </div>
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
