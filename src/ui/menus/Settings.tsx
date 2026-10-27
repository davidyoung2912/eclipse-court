import { useState } from 'react'
import { getSettings, THEMES, themeUnlocked, updateSettings } from '../../settings'
import { totalStars, type Progress } from '../../progress'
import { Icon } from './icons'
import { PageArt } from './MenuArt'
import { TipCard } from '../tips/TipCard'
import { resetTips } from '../../tips'
import { BackButton } from './BackButton'

interface Props {
  progress: Progress
  onBack: () => void
}

export function Settings({ progress, onBack }: Props) {
  const [settings, setSettings] = useState(getSettings)
  const stars = totalStars(progress)
  const change = (patch: Partial<typeof settings>) => setSettings(updateSettings(patch))
  return (
    <main className="app menu">
      <PageArt icon="gear" />
      <h2>Settings</h2>
      <h3>Look</h3>
      <div className="choices">
        {THEMES.map((t) => {
          const open = themeUnlocked(t, stars)
          return (
            <button key={t.id} className={`choice${settings.theme === t.id ? ' on' : ''}`} disabled={!open} onClick={() => change({ theme: t.id })}>
              <strong>
                {!open && <Icon name="lock" />}
                <i className="swatch" style={{ background: t.vars['--solari-gold'] ?? 'var(--solari-gold)' }} />
                <i className="swatch" style={{ background: t.vars['--umbral-violet'] ?? 'var(--umbral-violet)' }} />
                {t.name}
              </strong>
              <span>{open ? 'Board and piece colours.' : `Earn ${t.stars} campaign stars to unlock.`}</span>
            </button>
          )
        })}
      </div>
      <h3>Accessibility</h3>
      <label className="recharge"><input type="checkbox" checked={settings.marks} onChange={() => change({ marks: !settings.marks })} /> Mark the light on every square with + and − (colour is never the only clue)</label>
      <label className="recharge"><input type="checkbox" checked={settings.reduceMotion} onChange={() => change({ reduceMotion: !settings.reduceMotion })} /> Reduce motion: no animation or screen shake</label>
      <h3>Guidance</h3>
      <div className="menu-buttons">
        <button onClick={resetTips}><Icon name="bulb" />Show Tips Again</button>
      </div>
      <div className="menu-buttons">
        <BackButton onClick={onBack} />
      </div>
      <TipCard page="settings" />
    </main>
  )
}
