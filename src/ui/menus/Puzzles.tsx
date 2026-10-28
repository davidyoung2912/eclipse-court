import { dailyPuzzleIndex, PUZZLE_TIERS, PUZZLES, puzzlesIn } from '../../engine/data/puzzles'
import type { Progress } from '../../progress'
import { rushBest } from '../../rush'
import { Icon } from './icons'
import { ResetButton } from './ResetButton'
import { PageArt } from './MenuArt'
import { TipCard } from '../tips/TipCard'
import { BackButton } from './BackButton'

interface Props {
  progress: Progress
  /** Lines about the puzzle just played, such as an achievement. */
  report?: string[]
  onPlay: (index: number, daily: boolean) => void
  onRush: () => void
  onReset: () => void
  onBack: () => void
}

export function Puzzles({ progress, report, onPlay, onRush, onReset, onBack }: Props) {
  const daily = dailyPuzzleIndex()
  const isSolved = (id: string) => progress.puzzles.includes(id)
  const solved = PUZZLES.filter((p) => isSolved(p.id)).length
  /** The tier to open: the first with a puzzle still unsolved. */
  const current = PUZZLE_TIERS.find(({ tier }) => puzzlesIn(tier).some((p) => !isSolved(p.id)))?.tier
  return (
    <main className="app menu puzzles-menu">
      <PageArt icon="puzzle" />
      <h2>Puzzles</h2>
      <p className="tagline">{solved} of {PUZZLES.length} solved. Win within the turns given; the board is set, the rest is up to you. Stuck? The Hint button helps, at no cost.</p>
      {report && report.length > 0 && (
        <div className="setup-card" role="status">{report.map((line) => <div key={line}>{line}</div>)}</div>
      )}
      <h3>Puzzle Rush</h3>
      <div className="choices">
        <button className="choice" onClick={onRush}>
          <strong><Icon name="bolt" />Start a Rush <span className="pill">best {rushBest()}</span></strong>
          <span>Puzzle after puzzle, easy to hard, in a random order. One failed puzzle ends the run.</span>
        </button>
      </div>
      <h3>Puzzle of the day</h3>
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
      <div className="menu-buttons stacked">
        <ResetButton label="Reset Puzzles" disabled={solved === 0} warning="Mark every puzzle as unsolved so you can retry them all?" onReset={onReset} />
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
      <strong><Icon name={solved ? 'check' : 'puzzle'} />{number === null ? '' : `${number}. `}{p.name} <span className="pill">win in {p.limit}</span></strong>
      <span>{p.text}</span>
    </button>
  )
}
