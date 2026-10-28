import { useRef, useState, useSyncExternalStore } from 'react'
import { owns, shopSnapshot, subscribeShop } from '../../shop'
import { findCosmetic } from '../../engine/data/cosmetics'
import { getSettings, THEMES, themeUnlocked, updateSettings } from '../../settings'
import { totalStars, type Progress } from '../../progress'
import { Icon } from './icons'
import { PageArt } from './MenuArt'
import { TipCard } from '../tips/TipCard'
import { resetTips } from '../../tips'
import { resetOnboarding } from '../../onboarding'
import { BackButton } from './BackButton'
import { getVolumes, setVolumes, isMuted, setMuted, sfx, unlockAudio } from '../../audio/synth'
import { downloadSave, importSave } from '../../backup'

interface Props {
  progress: Progress
  /** Called when the guidance is brought back, so the guided lesson is offered again too. */
  onShowGuidance: () => void
  onBack: () => void
}

export function Settings({ progress, onShowGuidance, onBack }: Props) {
  const [settings, setSettings] = useState(getSettings)
  const stars = totalStars(progress)
  const shop = useSyncExternalStore(subscribeShop, shopSnapshot)
  const themes = THEMES.filter((t) => !t.cost || (findCosmetic('theme', t.id) && owns(findCosmetic('theme', t.id)!, shop)))
  const fileRef = useRef<HTMLInputElement>(null)
  const [note, setNote] = useState('')
  const restore = async (file: File | undefined) => {
    if (!file) return
    const n = importSave(await file.text())
    if (n === null) setNote('That file is not an Eclipse Court save.')
    else {
      setNote(`Restored ${n} records. Reloading…`)
      setTimeout(() => location.reload(), 600)
    }
  }
  const [vol, setVol] = useState(getVolumes)
  const volume = (patch: Partial<typeof vol>) => {
    unlockAudio()
    if (isMuted()) setMuted(false)
    setVolumes(patch)
    setVol(getVolumes())
    if (patch.sfx !== undefined) sfx.select()
  }
  const change = (patch: Partial<typeof settings>) => setSettings(updateSettings(patch))
  return (
    <main className="app menu blue-menu">
      <PageArt icon="gear" />
      <h2>Settings</h2>
      <h3>Look</h3>
      <div className="choices">
        {themes.map((t) => {
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
      <h3>Sound</h3>
      <label className="recharge">Effects <input type="range" min={0} max={1} step={0.05} value={vol.sfx} aria-label="Effects volume" onChange={(e) => volume({ sfx: Number(e.target.value) })} /></label>
      <label className="recharge">Music <input type="range" min={0} max={1} step={0.05} value={vol.music} aria-label="Music volume" onChange={(e) => volume({ music: Number(e.target.value) })} /></label>
      <h3>Accessibility</h3>
      <label className="recharge"><input type="checkbox" checked={settings.largeUi} onChange={() => change({ largeUi: !settings.largeUi })} /> Larger text and buttons</label>
      <label className="recharge"><input type="checkbox" checked={settings.marks} onChange={() => change({ marks: !settings.marks })} /> Mark the light on every square with + and − (colour is never the only clue)</label>
      <label className="recharge"><input type="checkbox" checked={settings.reduceMotion} onChange={() => change({ reduceMotion: !settings.reduceMotion })} /> Reduce motion: no animation or screen shake</label>
      <h3>Guidance</h3>
      <div className="menu-buttons">
        <button onClick={() => { resetTips(); resetOnboarding(); onShowGuidance(); setNote('Tips, the checklist and the guided lesson are back.') }}><Icon name="bulb" />Show Tips Again</button>
      </div>
      <h3>Your save</h3>
      <p className="setup-hint">Progress lives in this browser only. Keep a backup file in case it is cleared.</p>
      <div className="menu-buttons">
        <button onClick={() => { if (!downloadSave()) setNote('This browser cannot save files.') }}><Icon name="chain" />Export Save</button>
        <button onClick={() => fileRef.current?.click()}><Icon name="rise" />Import Save</button>
        <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => void restore(e.target.files?.[0])} />
      </div>
      {note && <p role="status">{note}</p>}
      <div className="menu-buttons">
        <BackButton onClick={onBack} />
      </div>
      <TipCard page="settings" />
    </main>
  )
}
