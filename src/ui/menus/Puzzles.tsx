import { dailyPuzzleIndex, PUZZLES } from '../../engine/data/puzzles'
import type { Progress } from '../../progress'
import { Icon } from './icons'
import { ResetButton } from './ResetButton'
import { PageArt } from './MenuArt'

interface Props {
  progress: Progress
  /** Lines about the puzzle just played, such as an achievement. */
  report?: string[]
  onPlay: (index: number, daily: boolean) => void
  onReset: () => void
  onBack: () => void
}

export function Puzzles({ progress, report, onPlay, onReset, onBack }: Props) {
  const daily = dailyPuzzleIndex()
  const solved = PUZZLES.filter((p) => progress.puzzles.includes(p.id)).length
  return (
    <main className="app menu">
      <PageArt icon="puzzle" />
      <h2>Puzzles</h2>
      <p className="tagline">{solved} of {PUZZLES.length} solved. Win within the turns given; the board is set, the rest is up to you.</p>
      {report && report.length > 0 && (
        <div className="setup-card" role="status">{report.map((line) => <div key={line}>{line}</div>)}</div>
      )}
      <h3>Puzzle of the day</h3>
      <div className="choices">
        <PuzzleButton index={daily} solved={progress.puzzles.includes(PUZZLES[daily].id)} onPlay={() => onPlay(daily, true)} />
      </div>
      <h3>All puzzles</h3>
      <ol className="campaign">
        {PUZZLES.map((p, i) => (
          <li key={p.id}><PuzzleButton index={i} solved={progress.puzzles.includes(p.id)} onPlay={() => onPlay(i, false)} /></li>
        ))}
      </ol>
      <div className="menu-buttons stacked">
        <ResetButton label="Reset Puzzles" disabled={solved === 0} warning="Mark every puzzle as unsolved so you can retry them all?" onReset={onReset} />
        <button onClick={onBack}><Icon name="back" />Back</button>
      </div>
    </main>
  )
}

function PuzzleButton({ index, solved, onPlay }: { index: number; solved: boolean; onPlay: () => void }) {
  const p = PUZZLES[index]
  return (
    <button className={`choice${solved ? ' won' : ''}`} onClick={onPlay}>
      <strong><Icon name={solved ? 'check' : 'puzzle'} />{index + 1}. {p.name} <span className="pill">win in {p.limit}</span></strong>
      <span>{p.text}</span>
    </button>
  )
}
