import { useSyncExternalStore } from 'react'
import { ARCS, ARC_FIGHTS, ARC_UNLOCK_WINS, SHARDS_ARC_DONE, SHARDS_ARC_FIGHT } from '../../engine/data/personaArcs'
import { COSMETICS } from '../../engine/data/cosmetics'
import { personaById, type PersonaId } from '../../engine/data/personas'
import { arcDone, arcOpen, arcSnapshot, stepsOf, subscribeArcs } from '../../personaArcs'
import { personaRecordSnapshot, subscribePersonaRecord } from '../../personaRecord'
import { PersonaFace } from '../../art/PersonaFace'
import { Icon } from './icons'
import { PageArt } from './MenuArt'
import { BackButton } from './BackButton'
import { TipCard } from '../tips/TipCard'
import { t } from '../../i18n'

interface Props {
  /** Lines about the fight just played. */
  report?: string[]
  onPlay: (persona: PersonaId, step: number) => void
  onBack: () => void
}

/** Each persona's three-fight arc: opened by beating them once, ending in a Shard prize and a capture effect. */
export function Arcs({ report, onPlay, onBack }: Props) {
  const arcs = useSyncExternalStore(subscribeArcs, arcSnapshot)
  const record = useSyncExternalStore(subscribePersonaRecord, personaRecordSnapshot)
  return (
    <main className="app menu">
      <PageArt icon="swords" />
      <h2>{t('arcs.title')}</h2>
      <p className="tagline">{t('arcs.tagline', { wins: ARC_UNLOCK_WINS, fights: ARC_FIGHTS, fight: SHARDS_ARC_FIGHT, done: SHARDS_ARC_DONE })}</p>
      {report && report.length > 0 && (
        <div className="setup-card" role="status">{report.map((line) => <div key={line}>{line}</div>)}</div>
      )}
      <div className="choices">
        {ARCS.map((arc) => {
          const persona = personaById(arc.persona)!
          const open = arcOpen(record[arc.persona])
          const done = arcDone(arc.persona, arcs)
          const step = stepsOf(arc.persona, arcs)
          const next = arc.fights[Math.min(step, ARC_FIGHTS - 1)]
          const prize = COSMETICS.find((c) => c.kind === 'capture' && c.id === arc.prize)
          return (
            <section key={arc.persona} className="setup-card persona-arc">
              <h3><PersonaFace id={arc.persona} className="persona-arc-face" />{persona.name}: {arc.title}</h3>
              {!open ? (
                <p>{t('arcs.locked', { name: persona.name, wins: ARC_UNLOCK_WINS })}</p>
              ) : (
                <>
                  <p>{done ? t('arcs.done', { prize: prize?.name ?? '' }) : t('arcs.progress', { step, fights: ARC_FIGHTS })}</p>
                  <p><strong>{next.name}</strong>: {next.blurb}</p>
                  <div className="buttons">
                    <button className={done ? undefined : 'primary'} onClick={() => onPlay(arc.persona, Math.min(step, ARC_FIGHTS - 1))}>
                      <Icon name="play" />{done ? t('arcs.replay') : step === 0 ? t('arcs.begin') : t('arcs.next')}
                    </button>
                  </div>
                </>
              )}
            </section>
          )
        })}
      </div>
      <div className="menu-buttons stacked">
        <BackButton onClick={onBack} />
      </div>
      <TipCard page="battle" />
    </main>
  )
}
