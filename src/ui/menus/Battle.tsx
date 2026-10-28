import { useState } from 'react'
import { Icon, type IconName } from './icons'
import { PageArt } from './MenuArt'
import { TipCard } from '../tips/TipCard'
import { BackButton } from './BackButton'
import { t } from '../../i18n'

interface Props {
  onSkirmish: () => void
  onPractice: () => void
  onPaste: () => void
  onEditor: () => void
  onOnline: () => void
  onMail: () => void
  onLadder: () => void
  onBack: () => void
}

/** The ways to fight a one-off match: against the AI or a friend, in a sandbox, or from a shared code. */
export function Battle({ onSkirmish, onPractice, onPaste, onEditor, onOnline, onMail, onLadder, onBack }: Props) {
  const modes = [
    { id: 'skirmish', icon: 'clash' as IconName, title: t('battle.skirmish'), text: t('battle.skirmishText'), run: onSkirmish },
    { id: 'ladder', icon: 'trophy' as IconName, title: t('battle.ladder'), text: t('battle.ladderText'), run: onLadder },
    { id: 'online', icon: 'chain' as IconName, title: t('battle.online'), text: t('battle.onlineText'), run: onOnline },
    { id: 'mail', icon: 'chain' as IconName, title: t('battle.mail'), text: t('battle.mailText'), run: onMail },
    { id: 'practice', icon: 'target' as IconName, title: t('battle.practice'), text: t('battle.practiceText'), run: onPractice },
    { id: 'editor', icon: 'grid' as IconName, title: t('battle.editor'), text: t('battle.editorText'), run: onEditor },
    { id: 'paste', icon: 'chain' as IconName, title: t('battle.paste'), text: t('battle.pasteText'), run: onPaste },
  ]
  const [focus, setFocus] = useState(modes[0].id)
  const shown = modes.find((m) => m.id === focus) ?? modes[0]
  return (
    <main className="app menu battle-menu two-pane">
      <PageArt icon="swords" />
      <h2>{t('battle.title')}</h2>
      <p className="tagline">{t('battle.tagline')}</p>
      <div className="pane-main">
        <div className="choices">
          {modes.map((m) => (
            <button key={m.id} className="choice" onClick={m.run} onMouseEnter={() => setFocus(m.id)} onFocus={() => setFocus(m.id)}>
              <strong><Icon name={m.icon} />{m.title}</strong>
              <span>{m.text}</span>
            </button>
          ))}
        </div>
      </div>
      <aside className="pane-side pane-detail" aria-hidden="true">
        <Icon name={shown.icon} />
        <h3>{shown.title}</h3>
        <p>{shown.text}</p>
      </aside>
      <div className="menu-buttons stacked">
        <BackButton onClick={onBack} />
      </div>
      <TipCard page="battle" />
    </main>
  )
}
