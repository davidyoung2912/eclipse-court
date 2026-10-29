import { Icon } from './icons'
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
  onArcs: () => void
  onBack: () => void
}

/** The ways to fight a one-off match: against the AI or a friend, in a sandbox, or from a shared code. */
export function Battle({ onSkirmish, onPractice, onPaste, onEditor, onOnline, onMail, onLadder, onArcs, onBack }: Props) {
  return (
    <main className="app menu battle-menu">
      <PageArt icon="swords" />
      <h2>{t('battle.title')}</h2>
      <p className="tagline">{t('battle.tagline')}</p>
      <div className="choices">
        <button className="choice" onClick={onSkirmish}>
          <strong><Icon name="clash" />{t('battle.skirmish')}</strong>
          <span>{t('battle.skirmishText')}</span>
        </button>
        <button className="choice" onClick={onLadder}>
          <strong><Icon name="trophy" />{t('battle.ladder')}</strong>
          <span>{t('battle.ladderText')}</span>
        </button>
        <button className="choice" onClick={onArcs}>
          <strong><Icon name="swords" />{t('battle.arcs')}</strong>
          <span>{t('battle.arcsText')}</span>
        </button>
        <button className="choice" onClick={onOnline}>
          <strong><Icon name="chain" />{t('battle.online')}</strong>
          <span>{t('battle.onlineText')}</span>
        </button>
        <button className="choice" onClick={onMail}>
          <strong><Icon name="chain" />{t('battle.mail')}</strong>
          <span>{t('battle.mailText')}</span>
        </button>
        <button className="choice" onClick={onPractice}>
          <strong><Icon name="target" />{t('battle.practice')}</strong>
          <span>{t('battle.practiceText')}</span>
        </button>
        <button className="choice" onClick={onEditor}>
          <strong><Icon name="grid" />{t('battle.editor')}</strong>
          <span>{t('battle.editorText')}</span>
        </button>
        <button className="choice" onClick={onPaste}>
          <strong><Icon name="chain" />{t('battle.paste')}</strong>
          <span>{t('battle.pasteText')}</span>
        </button>
      </div>
      <div className="menu-buttons stacked">
        <BackButton onClick={onBack} />
      </div>
      <TipCard page="battle" />
    </main>
  )
}
