import { dailyPuzzleIndex, PUZZLE_TIERS, PUZZLES, puzzlesIn } from '../../engine/data/puzzles'
import type { Progress } from '../../progress'
import { puzzleGoal } from '../../engine/data/pack'
import { GOAL_INFO } from '../../engine/data/editor'
import type { KeptPack } from '../../packs'
import { loadEndless } from '../../endless'
import { rushBest } from '../../rush'
import { Icon } from './icons'
import { ResetButton } from './ResetButton'
import { PageArt } from './MenuArt'
import { TipCard } from '../tips/TipCard'
import { BackButton } from './BackButton'
import { t } from '../../i18n'

interface Props {
  progress: Progress
  /** Lines about the puzzle just played, such as an achievement. */
  report?: string[]
  /** A puzzle (or Rush) left unfinished. */
  resume?: { name: string; rush: boolean; onResume: () => void }
  /** Packs kept from the editor or a link. */
  packs: KeptPack[]
  onPlayPack: (id: string, index: number) => void
  onDeletePack: (id: string) => void
  onPlay: (index: number, daily: boolean) => void
  onRush: () => void
  onEndless: () => void
  onReset: () => void
  onBack: () => void
}

export function Puzzles({ progress, report, resume, packs, onPlayPack, onDeletePack, onPlay, onRush, onEndless, onReset, onBack }: Props) {
  const daily = dailyPuzzleIndex()
  const isSolved = (id: string) => progress.puzzles.includes(id)
  const solved = PUZZLES.filter((p) => isSolved(p.id)).length
  /** The tier to open: the first with a puzzle still unsolved. */
  const current = PUZZLE_TIERS.find(({ tier }) => puzzlesIn(tier).some((p) => !isSolved(p.id)))?.tier
  return (
    <main className="app menu puzzles-menu">
      <PageArt icon="puzzle" />
      <h2>{t('puzzles.title')}</h2>
      <p className="tagline">{t('puzzles.tagline', { solved, total: PUZZLES.length })}</p>
      {report && report.length > 0 && (
        <div className="setup-card" role="status">{report.map((line) => <div key={line}>{line}</div>)}</div>
      )}
      {resume && (
        <div className="choices">
          <button className="choice" onClick={resume.onResume}>
            <strong><Icon name="onward" />{t(resume.rush ? 'puzzles.resumeRush' : 'puzzles.resume')}</strong>
            <span>{t('puzzles.pickUp', { name: resume.name })}</span>
          </button>
        </div>
      )}
      <h3>{t('puzzles.rush')}</h3>
      <div className="choices">
        <button className="choice" onClick={onRush}>
          <strong><Icon name="bolt" />{t('puzzles.startRush')} <span className="pill">{t('puzzles.best', { value: rushBest() })}</span></strong>
          <span>{t('puzzles.rushText')}</span>
        </button>
      </div>
      <h3>{t('puzzles.endless')}</h3>
      <div className="choices">
        <button className="choice" onClick={onEndless}>
          <strong><Icon name="puzzle" />{t('puzzles.endlessPuzzles')} <span className="pill">{t('puzzles.rated', { value: loadEndless().rating })}</span></strong>
          <span>{t('puzzles.endlessText')}</span>
        </button>
      </div>
      <h3>{t('puzzles.daily')}</h3>
      <div className="choices">
        <PuzzleButton index={daily} number={null} solved={isSolved(PUZZLES[daily].id)} onPlay={() => onPlay(daily, true)} />
      </div>
      {PUZZLE_TIERS.map(({ tier, name, blurb }) => {
        const list = puzzlesIn(tier)
        if (list.length === 0) return null
        return (
          <details key={tier} className="tier-fold" open={tier === current}>
            <summary><h3>{name} ({list.filter((p) => isSolved(p.id)).length}/{list.length})</h3></summary>
            <p className="tagline">{blurb}</p>
            <ol className="campaign">
              {list.map((p, i) => {
                const index = PUZZLES.indexOf(p)
                return <li key={p.id}><PuzzleButton index={index} number={i + 1} solved={isSolved(p.id)} onPlay={() => onPlay(index, false)} /></li>
              })}
            </ol>
          </details>
        )
      })}
      <h3>{t('puzzles.packs')}</h3>
      <p className="tagline">{packs.length ? t('puzzles.packsText') : t('puzzles.packPaste')}</p>
      {packs.map((pack) => (
        <details key={pack.id} className="tier-fold">
          <summary><h3>{pack.name} ({pack.solved.length}/{pack.puzzles.length})</h3></summary>
          <ol className="campaign">
            {pack.puzzles.map((c, i) => {
              const { kind, limit } = puzzleGoal(c)
              const done = pack.solved.includes(i)
              return (
                <li key={i}>
                  <button className={`choice${done ? ' won' : ''}`} onClick={() => onPlayPack(pack.id, i)}>
                    <strong><Icon name={done ? 'check' : 'puzzle'} />{i + 1}. {GOAL_INFO[kind].name} <span className="pill">{t('puzzles.packLimit', { count: limit })}</span></strong>
                    <span>{GOAL_INFO[kind].text}</span>
                  </button>
                </li>
              )
            })}
          </ol>
          <ResetButton label={t('puzzles.packDelete')} warning={t('puzzles.packDeleteWarning')} onReset={() => onDeletePack(pack.id)} />
        </details>
      ))}
      <div className="menu-buttons stacked">
        <ResetButton label={t('puzzles.reset')} disabled={solved === 0} warning={t('puzzles.resetWarning')} onReset={onReset} />
        <BackButton onClick={onBack} />
      </div>
      <TipCard page="puzzles" />
    </main>
  )
}

function PuzzleButton({ index, number, solved, onPlay }: { index: number; number: number | null; solved: boolean; onPlay: () => void }) {
  const p = PUZZLES[index]
  return (
    <button className={`choice${solved ? ' won' : ''}`} onClick={onPlay}>
      <strong><Icon name={solved ? 'check' : 'puzzle'} />{number === null ? '' : `${number}. `}{p.name} <span className="pill">{t('puzzles.winIn', { count: p.limit })}</span></strong>
      <span>{p.text}</span>
    </button>
  )
}
