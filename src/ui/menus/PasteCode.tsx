import { useState } from 'react'
import { parseShared, type Shared } from '../../share'
import { Icon } from './icons'
import { PageArt } from './MenuArt'
import { TipCard } from '../tips/TipCard'
import { BackButton } from './BackButton'
import { t } from '../../i18n'

interface Props {
  onOpen: (shared: Shared) => void
  onBack: () => void
}

/** For people who cannot open links: paste a challenge or replay link, or just its code. */
export function PasteCode({ onOpen, onBack }: Props) {
  const [text, setText] = useState('')
  const [error, setError] = useState(false)
  return (
    <main className="app menu battle-menu">
      <PageArt icon="chain" />
      <h2>{t('paste.title')}</h2>
      <p className="tagline">{t('paste.tagline')}</p>
      <textarea className="code-box" rows={5} value={text} spellCheck={false} aria-label={t('paste.label')}
        onChange={(e) => { setText(e.target.value); setError(false) }} />
      {error && <p role="alert">{t('paste.invalid')}</p>}
      <div className="menu-buttons stacked">
        <button className="primary" disabled={!text.trim()} onClick={() => {
          const shared = parseShared(text)
          if (shared) onOpen(shared)
          else setError(true)
        }}><Icon name="play" />{t('paste.open')}</button>
        <BackButton onClick={onBack} />
      </div>
      <TipCard page="paste" />
    </main>
  )
}
