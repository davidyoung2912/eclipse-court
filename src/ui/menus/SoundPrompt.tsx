import { useState } from 'react'
import { markSoundAsked, setMuted, sfx, soundAsked, unlockAudio } from '../../audio/synth'
import { haptic } from '../../haptics'
import { t } from '../../i18n'
import { Icon } from './icons'

/** Asked once on first launch, since sound is off until the player turns it on. */
export function SoundPrompt({ onAnswer }: { onAnswer?: (on: boolean) => void }) {
  const [open, setOpen] = useState(() => !soundAsked())
  if (!open) return null
  const answer = (on: boolean) => {
    markSoundAsked()
    setOpen(false)
    if (on) {
      unlockAudio()
      setMuted(false)
      sfx.confirm()
    }
    haptic('confirm')
    onAnswer?.(on)
  }
  return (
    <div className="modal-backdrop">
      <div className="modal sound-prompt" role="dialog" aria-modal="true" aria-label={t('soundPrompt.title')}>
        <h2>{t('soundPrompt.title')}</h2>
        <p>{t('soundPrompt.body')}</p>
        <div className="buttons">
          <button className="primary" autoFocus onClick={() => answer(true)}><Icon name="speakerOn" />{t('soundPrompt.yes')}</button>
          <button onClick={() => answer(false)}>{t('soundPrompt.no')}</button>
        </div>
      </div>
    </div>
  )
}
