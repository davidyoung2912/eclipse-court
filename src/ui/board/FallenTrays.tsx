import { useEffect, useRef, useState } from 'react'
import { sfx } from '../../audio/synth'
import { fallenOf, materialLead } from '../../fallen'
import type { Court, GameState } from '../../engine/rules/types'
import { PieceArt } from '../../art/PieceArt'
import { t } from '../../i18n'

const COURTS: Court[] = ['solari', 'umbral']
const COURT_NAME: Record<Court, string> = { solari: 'Solari', umbral: 'Umbral' }

/** A row per court of the pieces it has lost, with the material lead beside the court that is ahead. New arrivals drop in with a clink. */
export function FallenTrays({ captured }: { captured: GameState['captured'] }) {
  // Pieces already fallen when the board opened sit still; later arrivals carry the drop animation.
  const [settled] = useState(() => new Set(captured.map((p) => p.id)))
  const count = useRef(captured.length)
  useEffect(() => {
    if (captured.length > count.current) sfx.clink()
    count.current = captured.length
  }, [captured.length])
  if (!captured.length) return null
  const lead = materialLead({ captured })
  return (
    <div className="fallen" aria-label={t('fallen.label')}>
      {COURTS.map((court) => (
        <div key={court} className={`fallen-row ${court}`}>
          <span className="fallen-name">{COURT_NAME[court]}</span>
          <span className="fallen-pieces">
            {fallenOf({ captured }, court).map((p) => (
              <svg key={p.id} className={settled.has(p.id) ? undefined : 'drop'} viewBox="-0.45 -0.45 0.9 0.9" role="img" aria-label={p.role}>
                <PieceArt role={p.role} court={court} />
              </svg>
            ))}
          </span>
          {lead[court] > 0 && <b className="fallen-lead" title={t('fallen.lead')}>+{lead[court]}</b>}
        </div>
      ))}
    </div>
  )
}
