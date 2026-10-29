import { useState, useSyncExternalStore } from 'react'
import { CountUp } from '../CountUp'
import { buy, equip, equippedId, owns, shopSnapshot, subscribeShop } from '../../shop'
import { buyFreeze, buyHintPack, buyPrestige, canPrestige, HINT_PACK, MAX_FREEZES, MAX_PACK_HINTS, MAX_PRESTIGE, PRESTIGE_NAMES, prestigeCost, prestigeOf, PRICE_FREEZE, PRICE_HINT_PACK, sinksSnapshot, subscribeSinks } from '../../sinks'
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
  const sinks = useSyncExternalStore(subscribeSinks, sinksSnapshot)
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
      <section className="collection-kind">
        <h3>{t('sinks.title')}</h3>
        <p className="tagline">{t('sinks.tagline')}</p>
        <div className="choices">
          <button className="choice" disabled={sinks.freezes >= MAX_FREEZES || shop.shards < PRICE_FREEZE} onClick={() => { if (buyFreeze()) haptic('unlock') }}>
            <strong>{t('sinks.freeze')}</strong>
            <span>{t('sinks.freezeText', { held: sinks.freezes, max: MAX_FREEZES })}</span>
            <span className="cost">{sinks.freezes >= MAX_FREEZES ? t('sinks.full') : t('sinks.buy', { cost: PRICE_FREEZE })}</span>
          </button>
          <button className="choice" disabled={sinks.hints + HINT_PACK > MAX_PACK_HINTS || shop.shards < PRICE_HINT_PACK} onClick={() => { if (buyHintPack()) haptic('unlock') }}>
            <strong>{t('sinks.hints')}</strong>
            <span>{t('sinks.hintsText', { held: sinks.hints })}</span>
            <span className="cost">{sinks.hints + HINT_PACK > MAX_PACK_HINTS ? t('sinks.full') : t('sinks.buy', { cost: PRICE_HINT_PACK })}</span>
          </button>
        </div>
        <p className="tagline">{t('sinks.prestigeText')}</p>
      </section>
      {KINDS.map((kind) => (
        <section key={kind} className="collection-kind">
          <h3>{KIND_TITLES[kind]}</h3>
          <div className="choices">
            {cosmeticsOf(kind).map((c) => {
              const have = owns(c, shop)
              const on = have && isOn(c)
              const tier = prestigeOf(c, sinks)
              const nextCost = prestigeCost(c, tier + 1)
              return (
                <div key={c.id} className={`choice-row rarity-${rarityOf(c)}${tier ? ` prestige-${tier}` : ''}${glintOf(rarityOf(c)) ? ' glint' : ''}${fresh === cosmeticKey(c) ? ' unlocked' : ''}`}
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
                  {have && canPrestige(c) && (
                    <button className="prestige-btn" disabled={tier >= MAX_PRESTIGE || shop.shards < nextCost} aria-label={t('sinks.prestigeOf', { name: c.name })}
                      onClick={() => { if (buyPrestige(c)) haptic('unlock') }}>
                      {tier >= MAX_PRESTIGE ? t('sinks.prestigeMax') : t('sinks.prestigeNext', { tier: PRESTIGE_NAMES[tier + 1], cost: nextCost })}
                    </button>
                  )}
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
