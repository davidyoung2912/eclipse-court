import { useState } from 'react'
import { DIFFICULTY_LIST, type Difficulty } from '../../ai/profile'
import type { Challenge as ChallengeCode } from '../../engine/challenge'
import { describeConfig } from '../../share'
import { rulesetById, tierOfConfig } from '../../engine/data/setups'
import type { Court } from '../../engine/rules/types'
import { CourtPicker } from './CourtPicker'
import { Icon } from './icons'
import { LEVEL_ICON } from './levels'
import { PageArt } from './MenuArt'
import { TipCard } from '../tips/TipCard'
import { BackButton } from './BackButton'
import { t } from '../../i18n'

interface Props {
  challenge: ChallengeCode
  onPlay: (human: Court, difficulty: Difficulty, hotSeat: boolean) => void
  /** Opens a board from the editor in the editor; absent for other matches. */
  onEdit?: () => void
  onBack: () => void
}

/** A match someone sent: its rules, a court to take, and whether to face the AI or a friend. */
export function Challenge({ challenge, onPlay, onEdit, onBack }: Props) {
  const [court, setCourt] = useState<Court>(challenge.side)
  return (
    <main className="app menu">
      <PageArt icon="swords" />
      <h2>{t('challenge.title')}</h2>
      <p className="tagline">{t('challenge.tagline')}</p>
      <ul className="setup-card">
        <li>{t('challenge.rules', { name: rulesetById(tierOfConfig(challenge.config))?.name ?? '' })}</li>
        {describeConfig(challenge).map((line) => <li key={line}>{line}</li>)}
      </ul>
      <h3>{t('challenge.court')}</h3>
      <CourtPicker value={court} onChange={setCourt} />
      <h3>{t('challenge.play')}</h3>
      <div className="menu-buttons stacked">
        {DIFFICULTY_LIST.map((d) => (
          <button key={d} className={d === 'normal' ? 'primary' : undefined} onClick={() => onPlay(court, d, false)}>
            <Icon name={LEVEL_ICON[d]} />{t('challenge.againstAi', { level: t(`level.${d}`) })}
          </button>
        ))}
        <button onClick={() => onPlay(court, 'normal', true)}><Icon name="versus" />{t('challenge.friend')}</button>
        {onEdit && <button onClick={onEdit}><Icon name="grid" />{t('challenge.editor')}</button>}
        <BackButton onClick={onBack} />
      </div>
      <TipCard page="challenge" />
    </main>
  )
}
