import { useState, useSyncExternalStore } from 'react'
import { buy, equip, equippedId, owns, shopSnapshot, subscribeShop } from '../../shop'
import { cosmeticsOf, KIND_TITLES, KINDS, type Cosmetic } from '../../engine/data/cosmetics'
import { getSettings, themeById, updateSettings } from '../../settings'
import { sfx, unlockAudio } from '../../audio/synth'
import { Icon } from './icons'
import { PageArt } from './MenuArt'
import { BackButton } from './BackButton'
import { TipCard } from '../tips/TipCard'

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
      <h2>Collection</h2>
      <p className="tagline">Spend Shards, earned from games, puzzles and achievements. Cosmetics change how the game looks and sounds, never how it plays.</p>
      <p className="shard-wallet" role="status"><Icon name="star" /><strong>{shop.shards}</strong> Shards<small>{shop.earned} earned in all</small></p>
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
                  <span className="cost">{on ? 'Equipped' : have ? (kind === 'theme' || kind === 'sound' ? 'Owned · tap to use' : 'Owned · tap to equip') : `${c.cost} Shards${shop.shards < c.cost ? ` · ${c.cost - shop.shards} short` : ''}`}</span>
                </button>
              )
            })}
          </div>
        </section>
      ))}
      <p className="tagline">The four star-themes (Ember, Frost, Verdant) stay free: they open in Settings as campaign stars are earned.</p>
      <div className="menu-buttons">
        <BackButton onClick={onBack} />
      </div>
      <TipCard page="collection" />
    </main>
  )
}
