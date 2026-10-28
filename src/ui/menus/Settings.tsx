import { useRef, useState, useSyncExternalStore } from 'react'
import { owns, shopSnapshot, subscribeShop } from '../../shop'
import { findCosmetic } from '../../engine/data/cosmetics'
import { BANTER_LEVELS, DUEL_SPEEDS, HINT_LIMITS, FIGHT_LEVELS, getSettings, TAKE_BACK_RULES, THEMES, themeUnlocked, updateSettings } from '../../settings'
import { totalStars, type Progress } from '../../progress'
import { Icon, type IconName } from './icons'
import { PageArt } from './MenuArt'
import { TipCard } from '../tips/TipCard'
import { resetCoach, resetTips } from '../../tips'
import { resetOnboarding } from '../../onboarding'
import { BackButton } from './BackButton'
import { getVolumes, setVolumes, isMuted, setMuted, sfx, unlockAudio } from '../../audio/synth'
import { downloadSave, importSave } from '../../backup'
import { t } from '../../i18n'
import { haptic } from '../../haptics'

const SPEED_ICONS: Record<(typeof DUEL_SPEEDS)[number], IconName> = { normal: 'play', fast: 'onward', instant: 'bolt' }
const BANTER_ICONS: Record<(typeof BANTER_LEVELS)[number], IconName> = { full: 'speakerOn', quiet: 'moon', off: 'speakerOff' }
const HINT_ICONS: Record<(typeof HINT_LIMITS)[number], IconName> = { unlimited: 'bulb', three: 'checklist', off: 'close' }
const TAKE_BACK_ICONS: Record<(typeof TAKE_BACK_RULES)[number], IconName> = { always: 'undo', casual: 'leaf', off: 'close' }
const FIGHT_ICONS: Record<(typeof FIGHT_LEVELS)[number], IconName> = { easy: 'leaf', normal: 'shield', hard: 'flame' }

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
  const themes = THEMES.filter((th) => !th.cost || (findCosmetic('theme', th.id) && owns(findCosmetic('theme', th.id)!, shop)))
  const fileRef = useRef<HTMLInputElement>(null)
  const [note, setNote] = useState('')
  const restore = async (file: File | undefined) => {
    if (!file) return
    const n = importSave(await file.text())
    if (n === null) setNote(t('settings.badFile'))
    else {
      setNote(t('settings.restored', { count: n }))
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
      <h2>{t('settings.title')}</h2>
      <h3>{t('settings.look')}</h3>
      <div className="choices">
        {themes.map((th) => {
          const open = themeUnlocked(th, stars)
          return (
            <button key={th.id} className={`choice${settings.theme === th.id ? ' on' : ''}`} disabled={!open} onClick={() => change({ theme: th.id })}>
              <strong>
                {!open && <Icon name="lock" />}
                <i className="swatch" style={{ background: th.vars['--solari-gold'] ?? 'var(--solari-gold)' }} />
                <i className="swatch" style={{ background: th.vars['--umbral-violet'] ?? 'var(--umbral-violet)' }} />
                {th.name}
              </strong>
              <span>{open ? t('settings.themeOpen') : t('settings.themeLocked', { stars: th.stars })}</span>
            </button>
          )
        })}
      </div>
      <h3>{t('settings.sound')}</h3>
      <label className="recharge">{t('settings.effects')} <input type="range" min={0} max={1} step={0.05} value={vol.sfx} aria-label={t('settings.effectsVolume')} onChange={(e) => volume({ sfx: Number(e.target.value) })} /></label>
      <label className="recharge">{t('settings.music')} <input type="range" min={0} max={1} step={0.05} value={vol.music} aria-label={t('settings.musicVolume')} onChange={(e) => volume({ music: Number(e.target.value) })} /></label>
      <label className="recharge"><input type="checkbox" checked={settings.haptics} onChange={() => { change({ haptics: !settings.haptics }); if (!settings.haptics) haptic('confirm') }} /> {t('settings.haptics')}</label>
      <h3>{t('settings.accessibility')}</h3>
      <label className="recharge"><input type="checkbox" checked={settings.largeUi} onChange={() => change({ largeUi: !settings.largeUi })} /> {t('settings.largeUi')}</label>
      <label className="recharge"><input type="checkbox" checked={settings.marks} onChange={() => change({ marks: !settings.marks })} /> {t('settings.marks')}</label>
      <label className="recharge"><input type="checkbox" checked={settings.reduceMotion} onChange={() => change({ reduceMotion: !settings.reduceMotion })} /> {t('settings.reduceMotion')}</label>
      <label className="recharge"><input type="checkbox" checked={settings.reduceFlashes || settings.reduceMotion} disabled={settings.reduceMotion} onChange={() => change({ reduceFlashes: !settings.reduceFlashes })} /> {t('settings.reduceFlashes')}</label>
      <h3>{t('settings.playAids')}</h3>
      <label className="recharge"><input type="checkbox" checked={settings.aids} onChange={() => change({ aids: !settings.aids })} /> {t('settings.aids')}</label>
      <label className="recharge"><input type="checkbox" checked={settings.aiWhy} onChange={() => change({ aiWhy: !settings.aiWhy })} /> {t('settings.aiWhy')}</label>
      <label className="recharge"><input type="checkbox" checked={settings.lastMove} onChange={() => change({ lastMove: !settings.lastMove })} /> {t('settings.lastMove')}</label>
      <label className="recharge"><input type="checkbox" checked={settings.forecast} onChange={() => change({ forecast: !settings.forecast })} /> {t('settings.forecast')}</label>
      <label className="recharge"><input type="checkbox" checked={settings.eclipseChip} onChange={() => change({ eclipseChip: !settings.eclipseChip })} /> {t('settings.eclipseChip')}</label>
      <label className="recharge"><input type="checkbox" checked={settings.blunderCheck} onChange={() => change({ blunderCheck: !settings.blunderCheck })} /> {t('settings.blunderCheck')}</label>
      <label className="recharge"><input type="checkbox" checked={settings.oddsDetail} onChange={() => change({ oddsDetail: !settings.oddsDetail })} /> {t('settings.oddsDetail')}</label>
      <label className="recharge"><input type="checkbox" checked={settings.reminders} onChange={() => change({ reminders: !settings.reminders })} /> {t('settings.reminders')}</label>
      <label className="recharge"><input type="checkbox" checked={settings.duelAssist} onChange={() => change({ duelAssist: !settings.duelAssist })} /> {t('settings.duelAssist')}</label>
      <h3>{t('settings.hints')}</h3>
      <p className="setup-hint">{t('settings.hintsHint')}</p>
      <div className="choices row">
        {HINT_LIMITS.map((l) => (
          <button key={l} className={`choice${settings.hints === l ? ' on' : ''}`} aria-pressed={settings.hints === l} onClick={() => change({ hints: l })}><strong><Icon name={HINT_ICONS[l]} />{t(`settings.hints.${l}`)}</strong></button>
        ))}
      </div>
      <h3>{t('settings.takeBacks')}</h3>
      <p className="setup-hint">{t('settings.takeBacksHint')}</p>
      <div className="choices row">
        {TAKE_BACK_RULES.map((r) => (
          <button key={r} className={`choice${settings.takeBacks === r ? ' on' : ''}`} aria-pressed={settings.takeBacks === r} onClick={() => change({ takeBacks: r })}><strong><Icon name={TAKE_BACK_ICONS[r]} />{t(`settings.takeBacks.${r}`)}</strong></button>
        ))}
      </div>
      <h3>{t('settings.duels')}</h3>
      <p className="setup-hint">{t('settings.duelHint')}</p>
      <div className="choices row">
        {DUEL_SPEEDS.map((s) => (
          <button key={s} className={`choice${settings.duelSpeed === s ? ' on' : ''}`} aria-pressed={settings.duelSpeed === s} onClick={() => change({ duelSpeed: s })}><strong><Icon name={SPEED_ICONS[s]} />{t(`settings.speed.${s}`)}</strong></button>
        ))}
      </div>
      <h3>{t('settings.banter')}</h3>
      <p className="setup-hint">{t('settings.banterHint')}</p>
      <div className="choices row">
        {BANTER_LEVELS.map((l) => (
          <button key={l} className={`choice${settings.banter === l ? ' on' : ''}`} aria-pressed={settings.banter === l} onClick={() => change({ banter: l })}><strong><Icon name={BANTER_ICONS[l]} />{t(`settings.banter.${l}`)}</strong></button>
        ))}
      </div>
      <h3>{t('settings.fightDifficulty')}</h3>
      <p className="setup-hint">{t('settings.fightHint')}</p>
      <div className="choices row">
        {FIGHT_LEVELS.map((l) => (
          <button key={l} className={`choice${settings.fightDifficulty === l ? ' on' : ''}`} aria-pressed={settings.fightDifficulty === l} onClick={() => change({ fightDifficulty: l })}><strong><Icon name={FIGHT_ICONS[l]} />{t(`settings.fight.${l}`)}</strong></button>
        ))}
      </div>
      <h3>{t('settings.guidance')}</h3>
      <div className="menu-buttons">
        <button onClick={() => { resetTips(); resetOnboarding(); onShowGuidance(); setNote(t('settings.tipsBack')) }}><Icon name="bulb" />{t('settings.showTips')}</button>
        <button className="two-line" onClick={() => { resetCoach(); setNote(t('settings.coachBack')) }}><Icon name="target" />{t('settings.showCoach')}</button>
      </div>
      <h3>{t('settings.save')}</h3>
      <p className="setup-hint">{t('settings.saveHint')}</p>
      <div className="menu-buttons">
        <button onClick={() => { if (!downloadSave()) setNote(t('settings.noFiles')) }}><Icon name="chain" />{t('settings.export')}</button>
        <button onClick={() => fileRef.current?.click()}><Icon name="rise" />{t('settings.import')}</button>
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
