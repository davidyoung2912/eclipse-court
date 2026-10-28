import { useEffect, useRef, useState } from 'react'
import { bandFor, BANDS, endlessTitle, loadEndless, requestEndless, type EndlessRecord, type Generated } from '../../endless'
import { Icon } from './icons'
import { PageArt } from './MenuArt'
import { BackButton } from './BackButton'
import { ResetButton } from './ResetButton'
import { t } from '../../i18n'

interface Props {
  /** Lines about the puzzle just played. */
  report?: string[]
  onStart: (puzzle: Generated, record: EndlessRecord) => void
  onReset: () => void
  onBack: () => void
}

export function Endless({ report, onStart, onReset, onBack }: Props) {
  const [record, setRecord] = useState(loadEndless)
  const [busy, setBusy] = useState(false)
  const alive = useRef(true)
  useEffect(() => {
    alive.current = true
    // Start the search for the next puzzle while the screen is read.
    void requestEndless(record.n, bandFor(record.rating))
    return () => { alive.current = false }
  }, [record.n, record.rating])
  const band = BANDS[bandFor(record.rating)]
  const play = async () => {
    setBusy(true)
    const puzzle = await requestEndless(record.n, bandFor(record.rating))
    if (alive.current) onStart(puzzle, record)
  }
  return (
    <main className="app menu endless-menu">
      <PageArt icon="puzzle" />
      <h2>{t('endless.title')}</h2>
      <p className="tagline">{t('endless.tagline')}</p>
      {report && report.length > 0 && (
        <div className="setup-card" role="status">{report.map((line) => <div key={line}>{line}</div>)}</div>
      )}
      <dl className="stat-tiles">
        {[
          { label: endlessTitle(record.rating), value: record.rating },
          { label: t('endless.solved'), value: record.solved },
          { label: t('endless.streak', { best: record.bestStreak }), value: record.streak },
          { label: t('endless.peak'), value: record.best },
        ].map(({ label, value }) => <div key={label}><dd>{value}</dd><dt>{label}</dt></div>)}
      </dl>
      <div className="choices">
        <button className="choice" onClick={play} disabled={busy}>
          <strong><Icon name="bolt" />{busy ? t('endless.finding') : t('endless.puzzleN', { n: record.n + 1 })} <span className="pill">{band.name}</span></strong>
          <span>{busy ? t('endless.setting') : t('endless.winWithin', { turns: band.lo === band.hi ? band.lo : t('endless.range', { lo: band.lo, hi: band.hi }) })}</span>
        </button>
      </div>
      <div className="menu-buttons stacked">
        <ResetButton label={t('endless.reset')} disabled={record.n === 0} warning={t('endless.resetWarning')} onReset={() => { onReset(); setRecord(loadEndless()) }} />
        <BackButton onClick={onBack} />
      </div>
    </main>
  )
}
