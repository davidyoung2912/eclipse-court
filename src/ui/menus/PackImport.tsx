import { useState } from 'react'
import { puzzleGoal, type Pack } from '../../engine/data/pack'
import { GOAL_INFO } from '../../engine/data/editor'
import { t } from '../../i18n'
import { Icon } from './icons'
import { PageArt } from './MenuArt'
import { TipCard } from '../tips/TipCard'
import { BackButton } from './BackButton'

interface Props {
  pack: Pack
  /** Keeps the pack on the Puzzles screen; false when the shelf is full. */
  onKeep: (pack: Pack) => boolean
  onPuzzles: () => void
  onBack: () => void
}

/** A puzzle pack someone sent: what is in it, and a button to keep it with the other puzzles. */
export function PackImport({ pack, onKeep, onPuzzles, onBack }: Props) {
  const [result, setResult] = useState<boolean | null>(null)
  return (
    <main className="app menu">
      <PageArt icon="puzzle" />
      <h2>{t('pack.title')}</h2>
      <p className="tagline">{t('pack.tagline', { name: pack.name, count: pack.puzzles.length })}</p>
      <ol className="setup-card">
        {pack.puzzles.map((c, i) => {
          const { kind, limit } = puzzleGoal(c)
          return <li key={i}>{t('pack.goalLine', { goal: GOAL_INFO[kind].name, limit })}</li>
        })}
      </ol>
      {result === false && <p role="alert">{t('pack.full', { count: 10 })}</p>}
      <div className="menu-buttons stacked">
        {result === true
          ? <button className="primary" onClick={onPuzzles}><Icon name="puzzle" />{t('pack.kept')}</button>
          : <button className="primary" onClick={() => setResult(onKeep(pack))}><Icon name="check" />{t('pack.keep')}</button>}
        <BackButton onClick={onBack} />
      </div>
      <TipCard page="paste" />
    </main>
  )
}
