import { useEffect, useState } from 'react'
import { unlockAudio } from './audio/synth'
import { Game } from './Game'
import { HOT_SEAT, versusAi } from './controllers'
import type { Difficulty } from './ai/profile'
import { aiDraft, aiLoadout } from './ai/draft'
import { otherCourt } from './engine/rules/board'
import { skirmishConfig } from './engine/data/setups'
import { CAMPAIGN, campaignGame } from './engine/data/campaign'
import { dailyPuzzleIndex, PUZZLES } from './engine/data/puzzles'
import type { GameRecord } from './engine/log'
import { newGame } from './engine/reducer'
import { decodeRecord, encodeRecord } from './engine/serialize'
import type { PersonalityId } from './ai/personality'
import { loadProgress, recordGame, recordPuzzle, recordTournament, saveProgress, STAR_TEXT, starsEarned, summarise } from './progress'
import { clearSaved, loadSaved, saveGame } from './saved'
import type { Court, GameState } from './engine/rules/types'
import { Campaign } from './ui/menus/Campaign'
import { Practice } from './ui/menus/Practice'
import { Puzzles } from './ui/menus/Puzzles'
import { Settings } from './ui/menus/Settings'
import { MainMenu } from './ui/menus/MainMenu'
import { Replay } from './ui/menus/Replay'
import { Stats } from './ui/menus/Stats'
import { Tutorial } from './ui/tutorial/Tutorial'
import { SkirmishSetup } from './ui/menus/SkirmishSetup'

type Screen =
  | { name: 'menu' }
  | { name: 'skirmish' }
  | { name: 'campaign' }
  | { name: 'tutorial' }
  | { name: 'stats' }
  | { name: 'puzzles' }
  | { name: 'practice' }
  | { name: 'settings' }
  | { name: 'replay'; record: GameRecord }
  | {
    name: 'game'; human: Court; difficulty: Difficulty; record: GameRecord; campaignIndex: number | null
    /** Two people share the device; `human` and `difficulty` are then unused. */
    hotSeat?: boolean
    /** Set when the game is a puzzle: its index, whether it is the day's, and the turns allowed. */
    puzzle?: { index: number; daily: boolean }
    /** Set in a best-of-three: the opponent and the games won and lost so far. */
    series?: { wins: number; losses: number }
  }

const TUTORIAL_KEY = 'eclipse-court:tutorial'

function tutorialSeen(): boolean {
  try {
    return localStorage.getItem(TUTORIAL_KEY) === '1'
  } catch {
    return true
  }
}

function markTutorialSeen() {
  try {
    localStorage.setItem(TUTORIAL_KEY, '1')
  } catch {
    // Without storage the tutorial is simply offered again next time.
  }
}

export default function App() {
  const [screen, setScreen] = useState<Screen>({ name: 'menu' })
  const [progress, setProgress] = useState(loadProgress)
  /** What the battle just finished earned, shown on the campaign screen. */
  const [report, setReport] = useState<string[]>([])
  const [seen, setSeen] = useState(tutorialSeen)
  const [saved, setSaved] = useState(loadSaved)

  // Browsers only allow sound after a gesture, so audio unlocks on the first touch.
  useEffect(() => {
    window.addEventListener('pointerdown', unlockAudio, { once: true })
    return () => window.removeEventListener('pointerdown', unlockAudio)
  }, [])

  if (screen.name === 'tutorial')
    return (
      <Tutorial
        onExit={() => {
          markTutorialSeen()
          setSeen(true)
          setScreen({ name: 'menu' })
        }}
      />
    )

  if (screen.name === 'stats')
    return (
      <Stats progress={progress} onBack={() => setScreen({ name: 'menu' })}
        onReplay={progress.last ? () => {
          const record = decodeRecord(progress.last!)
          if (record) setScreen({ name: 'replay', record })
        } : undefined} />
    )

  if (screen.name === 'puzzles')
    return (
      <Puzzles progress={progress} report={report} onBack={() => setScreen({ name: 'menu' })}
        onPlay={(index, daily) => {
          setReport([])
          setScreen({
            name: 'game', human: 'solari', difficulty: PUZZLES[index].difficulty,
            record: { initial: PUZZLES[index].build(), actions: [] }, campaignIndex: null, puzzle: { index, daily },
          })
        }} />
    )

  if (screen.name === 'practice') return <Practice onBack={() => setScreen({ name: 'menu' })} />

  if (screen.name === 'settings') return <Settings progress={progress} onBack={() => setScreen({ name: 'menu' })} />

  if (screen.name === 'replay') return <Replay record={screen.record} onBack={() => setScreen({ name: 'stats' })} />

  if (screen.name === 'skirmish')
    return (
      <SkirmishSetup
        progress={progress}
        onBack={() => setScreen({ name: 'menu' })}
        onStart={(human, difficulty, setup, hotSeat) => {
          const seed = Date.now()
          const config = skirmishConfig(setup, human, seed, hotSeat ? {} : {
            roles: aiDraft(seed, difficulty),
            loadout: setup.loadout && aiLoadout(seed, otherCourt(human)),
          })
          setScreen({ name: 'game', human, difficulty, hotSeat, record: { initial: newGame(config), actions: [] }, campaignIndex: null })
        }}
      />
    )

  if (screen.name === 'campaign')
    return (
      <Campaign
        progress={progress}
        report={report}
        onBack={() => setScreen({ name: 'menu' })}
        onPlay={(i, series) => {
          setReport([])
          const opponent = CAMPAIGN[i]
          setScreen({
            name: 'game', human: 'solari', difficulty: opponent.difficulty,
            record: { initial: campaignGame(opponent, Date.now()), actions: [] }, campaignIndex: i,
            series: series ? { wins: 0, losses: 0 } : undefined,
          })
        }}
      />
    )

  if (screen.name === 'game') {
    const { human, difficulty, record, campaignIndex, puzzle, series, hotSeat } = screen
    /** Puzzles and tournament games are not resumable, so they never touch the saved game. */
    const transient = !!puzzle || !!series

    const finishPuzzle = (winner: GameState['winner']) => {
      const solved = winner === human
      if (solved) {
        const { progress: next, earned } = recordPuzzle(progress, PUZZLES[puzzle!.index].id, puzzle!.daily && puzzle!.index === dailyPuzzleIndex())
        setProgress(next)
        saveProgress(next)
        setReport(earned.map((a) => `Achievement: ${a.name}`))
      } else setReport([])
      setScreen({ name: 'puzzles' })
    }

    /** Records a finished game and returns the lines to show about it. */
    const finishGame = (winner: GameState['winner'], finished: GameRecord, stats: boolean) => {
      const summary = winner ? summarise(finished, human, difficulty, stats ? campaignIndex : null) : null
      if (!summary) return { summary: null, lines: [] as string[], progress }
      const { progress: next, earned } = recordGame(progress, summary, encodeRecord(finished))
      const stars = starsEarned(summary)
      return {
        summary,
        progress: next,
        lines: [
          ...(stats && campaignIndex !== null && summary.won ? [`Stars: ${STAR_TEXT.filter((t) => stars & t.bit).map((t) => t.text).join(', ')}.`] : []),
          ...earned.map((a) => `Achievement: ${a.name}`),
        ],
      }
    }

    const finishSeries = (winner: GameState['winner'], finished: GameRecord) => {
      const opponent = CAMPAIGN[campaignIndex!]
      const done = finishGame(winner, finished, false)
      let { wins, losses } = series!
      if (done.summary?.won) wins++
      else if (done.summary && !done.summary.draw) losses++
      let next = done.progress
      const lines = [...report, ...(done.summary ? [`Game ${wins + losses + (done.summary.draw ? 1 : 0)}: ${done.summary.won ? 'won' : done.summary.draw ? 'drawn' : 'lost'}.`] : []), ...done.lines]
      const over = wins === 2 || losses === 2
      if (over) {
        const result = recordTournament(next, wins === 2)
        next = result.progress
        lines.push(`${opponent.name}: tournament ${wins === 2 ? 'won' : 'lost'} ${wins}–${losses}.`, ...result.earned.map((a) => `Achievement: ${a.name}`))
      } else if (!done.summary) lines.push('Tournament abandoned.')
      setProgress(next)
      saveProgress(next)
      setReport(lines)
      if (over || !done.summary) return setScreen({ name: 'campaign' })
      setScreen({
        name: 'game', human, difficulty, campaignIndex, series: { wins, losses },
        record: { initial: campaignGame(opponent, Date.now()), actions: [] },
      })
    }

    return (
      <Game
        key={record.initial.rng}
        controllers={hotSeat ? HOT_SEAT
          : versusAi(human, difficulty, campaignIndex === null ? undefined : (CAMPAIGN[campaignIndex].personality satisfies PersonalityId))}
        record={record}
        puzzleLimit={puzzle && PUZZLES[puzzle.index].limit}
        onSave={(progress) => {
          if (transient) return
          if (progress) saveGame({ human, difficulty, campaignIndex, hotSeat, record: progress })
          else clearSaved()
        }}
        onExit={(winner, finished) => {
          if (puzzle) return finishPuzzle(winner)
          if (series) return finishSeries(winner, finished)
          clearSaved()
          setSaved(null)
          // Games between two people say nothing about the player's own record.
          if (hotSeat) return setScreen({ name: 'menu' })
          const done = finishGame(winner, finished, true)
          setProgress(done.progress)
          if (done.summary) saveProgress(done.progress)
          setReport(done.lines)
          setScreen(campaignIndex === null ? { name: 'menu' } : { name: 'campaign' })
        }}
      />
    )
  }

  return (
    <MainMenu firstRun={!seen}
      onResume={saved ? () => setScreen({ name: 'game', ...saved }) : undefined} onSkirmish={() => setScreen({ name: 'skirmish' })}
      onCampaign={() => { setReport([]); setScreen({ name: 'campaign' }) }} onStats={() => setScreen({ name: 'stats' })} onTutorial={() => setScreen({ name: 'tutorial' })}
      onPuzzles={() => { setReport([]); setScreen({ name: 'puzzles' }) }} onPractice={() => setScreen({ name: 'practice' })} onSettings={() => setScreen({ name: 'settings' })} />
  )
}
