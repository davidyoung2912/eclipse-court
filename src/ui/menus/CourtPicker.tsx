import type { Court } from '../../engine/rules/types'
import { PieceArt } from '../../art/PieceArt'
import { Icon, type IconName } from './icons'
import { t } from '../../i18n'

const COURTS: { court: Court; name: string; icon: IconName }[] = [
  { court: 'solari', name: 'Solari', icon: 'sun' },
  { court: 'umbral', name: 'Umbral', icon: 'moon' },
]

/** The Solari / Umbral choice, with each court's leader, icon and a line on how it plays. */
export function CourtPicker({ value, onChange }: { value: Court; onChange: (court: Court) => void }) {
  return (
    <div className="choices row">
      {COURTS.map((c) => (
        <button key={c.court} className={`choice ${c.court}${value === c.court ? ' on' : ''}`} onClick={() => onChange(c.court)}>
          <svg className="avatar" viewBox="-0.45 -0.45 0.9 0.9" aria-hidden="true"><PieceArt role="leader" court={c.court} /></svg>
          <strong><Icon name={c.icon} />{c.name}</strong>
          <span>{t(`setup.courtText.${c.court}`)}</span>
        </button>
      ))}
    </div>
  )
}
