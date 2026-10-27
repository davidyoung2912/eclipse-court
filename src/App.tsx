import { lazy, useEffect, useRef, useState } from 'react'
import { challengeLink, parseShared, type Shared } from './share'
import type { Challenge as ChallengeCode } from './engine/challenge'
import { Challenge } from './ui/menus/Challenge'
import { PasteCode } from './ui/menus/PasteCode'
import { unlockAudio } from './audio/synth'
import { HOT_SEAT, versusAi } from './controllers'
import type { Difficulty } from './ai/profile'
import { aiDraft, aiLoadout } from './engine/data/aiDraft'
import { otherCourt } from './engine/rules/board'
import { skirmishConfig, type SetupChoice } from './engine/data/setups'
import { CAMPAIGN, campaignGame } from './engine/data/campaign'
import { dailyPuzzleIndex, PUZZLES } from './engine/data/puzzles'
import { dailyGame, dailyMatch, DAILY_COURT, isDailyMatch } from './engine/data/daily'
import { dailySeed } from './engine/data/setups'
import type { GameRecord } from './engine/log'
import { newGame } from './engine/reducer'
import { decodeRecord } from './engine/serialize'
import { replay } from './engine/log'
import type { PersonalityId } from './engine/data/personality'
import { addPlaytime, dailyResult, loadProgress, recordPuzzle, recordRun, recordTournament, resetCampaign, resetPuzzles, resetScenarios, resetStats, saveProgress } from './progress'
import { clearSaved, loadSaved, saveGame } from './saved'
import { settleGame } from './settleGame'
import type { Court, GameState } from './engine/rules/types'
import { Campaign, type Tab as CampaignTab } from './ui/menus/Campaign'
import { SCENARIOS, scenarioGame } from './engine/data/scenarios'
import { Daily } from './ui/menus/Daily'
import { Gauntlet } from './ui/menus/Gauntlet'
import { applyReward, applyVictory, runWon, stageFoe, stageGame, startRun, type Reward, type Run } from './engine/data/gauntlet'
import { clearRun, loadRun, saveRun } from './run'
import { Battle } from './ui/menus/Battle'
import { Puzzles } from './ui/menus/Puzzles'
import { Settings } from './ui/menus/Settings'
import { MainMenu } from './ui/menus/MainMenu'
import { Stats } from './ui/menus/Stats'
import { PlayTimer } from './ui/PlayTimer'
import { SkirmishSetup } from './ui/menus/SkirmishSetup'

// The board, duel and tutorial code load when first needed, so the menus open sooner.
const Game = lazy(() => import('./Game').then((m) => ({ default: m.Game })))
const Practice = lazy(() => import('./ui/menus/Practice').then((m) => ({ default: m.Practice })))
const Replay = lazy(() => import('./ui/menus/Replay').then((m) => ({ default: m.Replay })))
const Tutorial = lazy(() => import('./ui/tutorial/Tutorial').then((m) => ({ default: m.Tutorial })))

type Screen =
  | { name: 'menu' }
  | { name: 'battle' }
  | { name: 'skirmish' }
  | { name: 'campaign' }
  | { name: 'daily' }
  | { name: 'gauntlet' }
  | { name: 'tutorial' }
  | { name: 'stats' }
  | { name: 'puzzles' }
  | { name: 'practice' }
  | { name: 'settings' }
  | { name: 'replay'; record: GameRecord; /** Where Back goes; the stats page unless the replay came from a link. */ from?: 'menu' }
  | { name: 'challenge'; challenge: ChallengeCode }
  | { name: 'paste' }
  | {
    name: 'game'; human: Court; difficulty: Difficulty; record: GameRecord; campaignIndex: number | null
    /** Two people share the device; `human` and `difficulty` are then unused. */
    hotSeat?: boolean
    /** Set when the game is a puzzle: its index, whether it is the day's, and the turns allowed. */
    puzzle?: { index: number; daily: boolean }
    /** Set in a best-of-three: the opponent and the games won and lost so far. */
    series?: { wins: number; losses: number }
    /** A fight of the gauntlet run; the run itself is kept apart from the saved game. */
    gauntlet?: boolean
    /** A scenario of the campaign's second tab: its index. */
    scenario?: number
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

/** Set when the tutorial is left; the next Skirmish setup then opens on Classic rules and clears it. */
const CLASSIC_NEXT_KEY = 'eclipse-court:classic-next'

function classicNext(): boolean {
  try {
    return localStorage.getItem(CLASSIC_NEXT_KEY) === '1'
  } catch {
    return false
  }
}

function setClassicNext(on: boolean) {
  try {
    if (on) localStorage.setItem(CLASSIC_NEXT_KEY, '1')
    else localStorage.removeItem(CLASSIC_NEXT_KEY)
  } catch {
    // Without storage Skirmish simply opens on Standard.
  }
}

/** The screen a shared link or code opens. */
const sharedScreen = (shared: Shared): Screen =>
  shared.kind === 'challenge' ? { name: 'challenge', challenge: shared.challenge } : { name: 'replay', record: shared.record, from: 'menu' }

/** Reads a `#c=` or `#r=` link out of the address, then removes it so a reload does not reopen it. */
function takeLinkScreen(): Screen | null {
  const { hash, pathname, search } = window.location
  if (!/^#[cr]=/.test(hash)) return null
  history.replaceState(null, '', pathname + search)
  const shared = parseShared(hash)
  return shared && sharedScreen(shared)
}

/** The match a skirmish setup describes, for starting it or sending it as a challenge. */
function skirmishRecord(setup: SetupChoice, human: Court, difficulty: Difficulty, hotSeat: boolean, seed: number): GameRecord {
  const config = skirmishConfig(setup, human, seed, hotSeat ? {} : {
    roles: aiDraft(seed, difficulty),
    loadout: setup.loadout && aiLoadout(seed, otherCourt(human)),
  })
  return { initial: newGame(config), actions: [] }
}

export default function App() {
  const [screen, setScreen] = useState<Screen>(() => takeLinkScreen() ?? { name: 'menu' })
  const [progress, setProgress] = useState(loadProgress)
  /** What the battle just finished earned, shown on the campaign screen. */
  const [report, setReport] = useState<string[]>([])
  const [seen, setSeen] = useState(tutorialSeen)
  const [saved, setSaved] = useState(loadSaved)
  const [run, setRun] = useState(loadRun)
  const progressRef = useRef(progress)
  progressRef.current = progress
  /** Adds time played to the lifetime total, whichever play screen reports it. */
  const addTime = (seconds: number) => {
    const next = addPlaytime(progressRef.current, seconds)
    progressRef.current = next
    setProgress(next)
    saveProgress(next)
  }
  const [campaignTab, setCampaignTab] = useState<CampaignTab>('battles')

  // Browsers only allow sound after a gesture, so audio unlocks on the first touch.
  useEffect(() => {
    window.addEventListener('pointerdown', unlockAudio, { once: true })
    return () => window.removeEventListener('pointerdown', unlockAudio)
  }, [])

  // A link opened in a tab that is already running changes the address without reloading.
  useEffect(() => {
    const onHash = () => {
      const next = takeLinkScreen()
      if (next) setScreen(next)
    }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  if (screen.name === 'tutorial')
    return (
      <>
        <PlayTimer onFlush={addTime} />
        <Tutorial
          onExit={() => {
            markTutorialSeen()
            setClassicNext(true)
            setSeen(true)
            setScreen({ name: 'menu' })
          }}
        />
      </>
    )

  if (screen.name === 'stats')
    return (
      <Stats progress={progress} onReset={() => { const next = resetStats(progress); setProgress(next); saveProgress(next) }} onBack={() => setScreen({ name: 'menu' })}
        onReplay={progress.last ? () => {
          const record = decodeRecord(progress.last!)
          if (record) setScreen({ name: 'replay', record })
        } : undefined} />
    )

  if (screen.name === 'puzzles')
    return (
      <Puzzles progress={progress} report={report}
        onReset={() => { const next = resetPuzzles(progress); setProgress(next); saveProgress(next) }}
        onBack={() => setScreen({ name: 'menu' })}
        onPlay={(index, daily) => {
          setReport([])
          setScreen({
            name: 'game', human: 'solari', difficulty: PUZZLES[index].difficulty,
            record: { initial: PUZZLES[index].build(), actions: [] }, campaignIndex: null, puzzle: { index, daily },
          })
        }} />
    )

  if (screen.name === 'daily') {
    const match = dailyMatch()
    return (
      <Daily match={match} progress={progress} report={report} onBack={() => setScreen({ name: 'menu' })}
        onPlay={() => {
          setReport([])
          setScreen({ name: 'game', human: DAILY_COURT, difficulty: match.difficulty, record: { initial: dailyGame(match), actions: [] }, campaignIndex: null })
        }} />
    )
  }

  if (screen.name === 'battle')
    return <Battle onBack={() => setScreen({ name: 'menu' })} onSkirmish={() => setScreen({ name: 'skirmish' })} onPractice={() => setScreen({ name: 'practice' })} onPaste={() => setScreen({ name: 'paste' })} />

  if (screen.name === 'practice') return <Practice onPlaytime={addTime} onBack={() => setScreen({ name: 'battle' })} />

  if (screen.name === 'settings') return <Settings progress={progress} onBack={() => setScreen({ name: 'menu' })} />

  if (screen.name === 'replay') return <Replay record={screen.record} onBack={() => setScreen(screen.from ? { name: screen.from } : { name: 'stats' })} />

  if (screen.name === 'paste')
    return <PasteCode onBack={() => setScreen({ name: 'battle' })} onOpen={(shared) => setScreen(sharedScreen(shared))} />

  if (screen.name === 'challenge')
    return (
      <Challenge challenge={screen.challenge} onBack={() => setScreen({ name: 'menu' })}
        onPlay={(human, difficulty, hotSeat) =>
          setScreen({ name: 'game', human, difficulty, hotSeat, record: { initial: newGame(screen.challenge.config), actions: [] }, campaignIndex: null })} />
    )

  if (screen.name === 'skirmish')
    return (
      <SkirmishSetup
        progress={progress}
        initialTier={classicNext() ? 'classic' : 'standard'}
        onBack={() => setScreen({ name: 'battle' })}
        challengeLink={(human, difficulty, setup, hotSeat) =>
          challengeLink({ config: skirmishRecord(setup, human, difficulty, hotSeat, Date.now()).initial.config, side: otherCourt(human) })}
        onStart={(human, difficulty, setup, hotSeat) => {
          setClassicNext(false)
          setScreen({ name: 'game', human, difficulty, hotSeat, record: skirmishRecord(setup, human, difficulty, hotSeat, Date.now()), campaignIndex: null })
        }}
      />
    )

  if (screen.name === 'gauntlet') {
    const update = (next: Run | null) => {
      setRun(next)
      if (next) saveRun(next)
      else clearRun()
    }
    const endRun = (stage: number, won: boolean, lines: string[]) => {
      const result = recordRun(progress, stage, won)
      setProgress(result.progress)
      saveProgress(result.progress)
      setReport([...lines, ...result.earned.map((a) => `Achievement: ${a.name}`)])
      update(null)
    }
    return (
      <Gauntlet
        progress={progress} run={run} report={report} onBack={() => { setReport([]); setScreen({ name: 'menu' }) }}
        onStart={(court, roles) => { setReport([]); update(startRun(court, roles, Date.now())) }}
        onReward={(reward: Reward) => { if (run) update(applyReward(run, reward)) }}
        onAbandon={() => { if (run) endRun(run.stage, false, [`Run abandoned at stage ${run.stage}.`]) }}
        onFight={() => {
          if (!run) return
          const foe = stageFoe(run.seed, run.stage)
          setReport([])
          setScreen({ name: 'game', human: run.court, difficulty: foe.difficulty, record: { initial: stageGame(run), actions: [] }, campaignIndex: null, gauntlet: true })
        }}
      />
    )
  }

  if (screen.name === 'campaign')
    return (
      <Campaign
        progress={progress}
        report={report}
        tab={campaignTab}
        onTab={setCampaignTab}
        onReset={(tab) => { const next = tab === 'scenarios' ? resetScenarios(progress) : resetCampaign(progress); setProgress(next); saveProgress(next) }}
        onBack={() => setScreen({ name: 'menu' })}
        onPlayScenario={(i) => {
          setReport([])
          setScreen({
            name: 'game', human: 'solari', difficulty: SCENARIOS[i].difficulty,
            record: { initial: scenarioGame(SCENARIOS[i], Date.now()), actions: [] }, campaignIndex: null, scenario: i,
          })
        }}
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
    const { human, difficulty, record, campaignIndex, puzzle, series, hotSeat, gauntlet, scenario } = screen
    /** Puzzles and tournament games are not resumable, so they never touch the saved game. */
    /** Today's match as set for everyone, against the AI it names; only this one is scored for the day. */
    const today = dailyMatch()
    const daily = !hotSeat && !puzzle && !series && !gauntlet && scenario === undefined && campaignIndex === null && human === DAILY_COURT
      && difficulty === today.difficulty && isDailyMatch(record.initial.config)
    const transient = !!puzzle || !!series || !!gauntlet || scenario !== undefined

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
    const finishGame = (winner: GameState['winner'], finished: GameRecord, stats: boolean) =>
      settleGame(progress, { winner, finished, human, difficulty, campaignIndex, scenario, daily, today, stats })

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

    /** A gauntlet fight ends: a win carries the survivors on to a reward, anything else ends the run. */
    const finishFight = (winner: GameState['winner'], finished: GameRecord) => {
      setScreen({ name: 'gauntlet' })
      if (!run || winner === null) return
      const final = winner === human ? replay(finished) : null
      if (!final) {
        const result = recordRun(progress, run.stage, false)
        setProgress(result.progress)
        saveProgress(result.progress)
        setReport([`${winner === 'draw' ? 'A draw' : 'A defeat'} at stage ${run.stage}: the run is over.`, ...result.earned.map((a) => `Achievement: ${a.name}`)])
        setRun(null)
        clearRun()
        return
      }
      const next = applyVictory(run, final)
      if (runWon(next)) {
        const result = recordRun(progress, next.stage, true)
        setProgress(result.progress)
        saveProgress(result.progress)
        setReport(['The Eclipse Tyrant falls. The run is won!', ...result.earned.map((a) => `Achievement: ${a.name}`)])
        setRun(null)
        clearRun()
        return
      }
      setReport([`Stage ${run.stage} cleared.`])
      setRun(next)
      saveRun(next)
    }

    const foe = gauntlet && run ? stageFoe(run.seed, run.stage) : null
    return (
      <>
      <PlayTimer onFlush={addTime} />
      <Game
        key={record.initial.rng}
        controllers={hotSeat ? HOT_SEAT
          : foe ? versusAi(human, foe.difficulty, foe.personality)
          : versusAi(human, difficulty, daily ? today.personality : campaignIndex === null ? undefined : (CAMPAIGN[campaignIndex].personality satisfies PersonalityId))}
        record={record}
        puzzleLimit={puzzle && PUZZLES[puzzle.index].limit}
        puzzleHelp={puzzle && { hints: PUZZLES[puzzle.index].hints, solution: PUZZLES[puzzle.index].solution }}
        onSave={(progress) => {
          if (transient) return
          if (progress) saveGame({ human, difficulty, campaignIndex, hotSeat, record: progress })
          else clearSaved()
        }}
        onExit={(winner, finished) => {
          if (gauntlet) return finishFight(winner, finished)
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
          if (scenario !== undefined) setCampaignTab('scenarios')
          setScreen(daily ? { name: 'daily' } : scenario !== undefined ? { name: 'campaign' } : campaignIndex === null ? { name: 'menu' } : { name: 'campaign' })
        }}
      />
      </>
    )
  }

  return (
    <MainMenu firstRun={!seen} progress={progress} onBattle={() => setScreen({ name: 'battle' })}
      onResume={saved ? () => setScreen({ name: 'game', ...saved }) : undefined} onSkirmish={() => setScreen({ name: 'skirmish' })}
      onCampaign={() => { setReport([]); setCampaignTab('battles'); setScreen({ name: 'campaign' }) }} onGauntlet={() => { setReport([]); setScreen({ name: 'gauntlet' }) }} onStats={() => setScreen({ name: 'stats' })} onTutorial={() => setScreen({ name: 'tutorial' })}
      onDaily={() => { setReport([]); setScreen({ name: 'daily' }) }}
      dailyDone={{ match: !!dailyResult(progress, dailySeed()), puzzle: progress.puzzles.includes(PUZZLES[dailyPuzzleIndex()].id) }}
      onDailyPuzzle={() => {
        const index = dailyPuzzleIndex()
        setReport([])
        setScreen({ name: 'game', human: 'solari', difficulty: PUZZLES[index].difficulty, record: { initial: PUZZLES[index].build(), actions: [] }, campaignIndex: null, puzzle: { index, daily: true } })
      }}
      onPuzzles={() => { setReport([]); setScreen({ name: 'puzzles' }) }} onSettings={() => setScreen({ name: 'settings' })} />
  )
}
