import { lazy, useEffect, useRef, useState, type ComponentProps } from 'react'
import { challengeLink, parseShared, type Shared } from './share'
import type { Challenge as ChallengeCode } from './engine/challenge'
import { Challenge } from './ui/menus/Challenge'
import { PasteCode } from './ui/menus/PasteCode'
import { Editor } from './ui/menus/Editor'
import { designFromConfig, isCustom, type Design } from './engine/data/editor'
import { editorDraft, saveDraft } from './editor'
import { unlockAudio } from './audio/synth'
import { HOT_SEAT, versusAi, versusOnline } from './controllers'
import type { Session } from './net/session'
import type { Difficulty } from './ai/profile'
import { aiDraft, aiLoadout } from './engine/data/aiDraft'
import { otherCourt } from './engine/rules/board'
import { skirmishConfig, type SetupChoice } from './engine/data/setups'
import { CAMPAIGN, campaignGame } from './engine/data/campaign'
import { dailyPuzzleIndex, PUZZLES, type Puzzle } from './engine/data/puzzles'
import { applyResult, bandFor, endlessPuzzle, loadEndless, puzzleRating, requestEndless, resetEndless, saveEndless, SHARDS_ENDLESS } from './endless'
import { Endless } from './ui/menus/Endless'
import { recordGameResult } from './records'
import { claimBounties } from './bounties'
import { recordRush, rushOrder, RUSH_SHARD_CAP } from './rush'
import { CLASSIC_ROLES } from './engine/data/draft'
import { dailyGame, dailyMatch, DAILY_COURT, isDailyMatch } from './engine/data/daily'
import { dailySeed } from './engine/data/setups'
import { isWeeklyMatch, weeklyGame, weeklyMatch, weeklyScore, WEEKLY_COURT } from './engine/data/weekly'
import { forWeek, recordWeekly, weeklySnapshot } from './weekly'
import { foeById, ladderGame, LADDER_COURT } from './engine/data/ladder'
import { recordLadder } from './ladder'
import { adviceFor, isFirstBattle, onboardingSnapshot, recordAiGame } from './onboarding'
import { Ladder } from './ui/menus/Ladder'
import type { GameRecord } from './engine/log'
import { newGame } from './engine/reducer'
import { decodeRecord } from './engine/serialize'
import { replay } from './engine/log'
import type { PersonalityId } from './engine/data/personality'
import { addPlaytime, dailyResult, loadProgress, recordPractice, recordPuzzle, recordReview, recordRun, recordTournament, recordVersus, resetCampaign, resetCoop, resetPuzzles, resetScenarios, resetStats, saveProgress } from './progress'
import { clearSaved, loadSaved, saveGame } from './saved'
import { clearFight, clearPuzzle, loadFight, loadPuzzle, saveFight, savePuzzle } from './fights'
import { settleGame } from './settleGame'
import { earnShards, SHARDS_DAILY_PUZZLE, SHARDS_GAUNTLET_STAGE, SHARDS_GAUNTLET_WIN, SHARDS_PUZZLE } from './shop'
import { recordRoleDuels } from './roleGoals'
import { rememberCourt, masterySnapshot } from './mastery'
import { Collection } from './ui/menus/Collection'
import type { Court, GameState } from './engine/rules/types'
import type { SideSummary } from './ai/review'
import { loadChoices, oneOf, saveChoices } from './lastChoices'
import { Campaign, type Tab as CampaignTab } from './ui/menus/Campaign'
import { SCENARIOS, scenarioGame } from './engine/data/scenarios'
import { COOP_SCENARIOS, coopGame } from './engine/data/coop'
import { Daily } from './ui/menus/Daily'
import { Weekly } from './ui/menus/Weekly'
import { Gauntlet } from './ui/menus/Gauntlet'
import { applyReward, applyVictory, runSummary, runWon, stageFoe, stageGame, startRun, type Reward, type Run } from './engine/data/gauntlet'
import { recordAscension } from './ascension'
import { clearRun, loadRun, saveRun } from './run'
import { saveLegacy } from './legacy'
import { legacyOf, withLegacy } from './engine/data/legacy'
import { Battle } from './ui/menus/Battle'
import { Puzzles } from './ui/menus/Puzzles'
import { Story } from './ui/menus/Story'
import { StoryReader } from './ui/story/StoryReader'
import { afterVictory, battleCourt, bondById, chapterById, scenarioOf, storyBattleGame, type EndingId } from './engine/data/story'
import { StoryEnding } from './ui/story/StoryEnding'
import { markBondRead, markChapterRead, recordEnding, recordStoryLoss, recordStoryWin, storySnapshot, visibleBeats } from './story'
import { Settings } from './ui/menus/Settings'
import { MainMenu } from './ui/menus/MainMenu'
import { Stats } from './ui/menus/Stats'
import { PlayTimer } from './ui/PlayTimer'
import { Online } from './ui/menus/Online'
import { Lobby } from './ui/menus/Lobby'
import { Mail } from './ui/menus/Mail'
import { MailSend } from './ui/menus/MailSend'
import { mailGame, putMail, recordOfGame } from './mail'
import { SkirmishSetup } from './ui/menus/SkirmishSetup'

// The board, duel and tutorial code load when first needed, so the menus open sooner.
const Game = lazy(() => import('./Game').then((m) => ({ default: m.Game })))
const Practice = lazy(() => import('./ui/menus/Practice').then((m) => ({ default: m.Practice })))
const Replay = lazy(() => import('./ui/menus/Replay').then((m) => ({ default: m.Replay })))
const Tutorial = lazy(() => import('./ui/tutorial/Tutorial').then((m) => ({ default: m.Tutorial })))

type Screen =
  | { name: 'menu' }
  | { name: 'battle' }
  | { name: 'skirmish'; /** Opened to host an online game. */ online?: boolean; /** Opened to start a game played by link. */ mail?: boolean }
  | { name: 'campaign' }
  | { name: 'story' }
  | { name: 'chapter'; id: string }
  /** The scene after a chapter's battle. */
  | { name: 'aftermath'; id: string; won: boolean }
  /** A bond scene between two characters. */
  | { name: 'bond'; id: string }
  /** The choice that ends the story, and the epilogue read once it is made. */
  | { name: 'ending'; id: string }
  | { name: 'epilogue'; id: string; ending: EndingId }
  | { name: 'daily' }
  | { name: 'weekly' }
  | { name: 'ladder' }
  | { name: 'gauntlet' }
  | { name: 'tutorial' }
  | { name: 'stats' }
  | { name: 'puzzles' }
  | { name: 'endless' }
  | { name: 'practice' }
  | { name: 'settings' }
  | { name: 'collection' }
  | { name: 'replay'; record: GameRecord; /** Where Back goes; the stats page unless the replay came from a link. */ from?: 'menu' | 'mail'; /** Opened from a watch link: a spectator's view, which cannot take over the game. */ watch?: boolean; /** The record is the last game the player finished, so its review can earn achievements. */ own?: boolean }
  | { name: 'challenge'; challenge: ChallengeCode }
  | { name: 'paste' }
  /** Games played by link: the list, with a move that arrived by link waiting to be accepted. */
  | { name: 'mail'; incoming?: GameRecord }
  /** The link to send for a game played by link. */
  | { name: 'mailsend'; id: string }
  | { name: 'editor' }
  /** Online play: the menu, the skirmish setup that hosts, and the lobby (a host brings its match, a guest may bring an offer code). */
  | { name: 'online' }
  | { name: 'lobby'; challenge?: ChallengeCode; offer?: string; /** A dropped game to pick up again, with the game so far. */ resume?: { session: Session; record: GameRecord } }
  | {
    name: 'game'; human: Court; difficulty: Difficulty; record: GameRecord; campaignIndex: number | null
    /** Two people share the device; `human` and `difficulty` are then unused. */
    hotSeat?: boolean
    /** The other player is across an online connection; `human` is your court. */
    online?: Session
    /** Set when the game is a puzzle: its index, whether it is the day's, and the turns allowed. */
    puzzle?: { index: number; daily: boolean; /** An Endless puzzle: the puzzle itself, and the rating it was served against. */ endless?: { puzzle: Puzzle; number: number; rating: number }; /** A Puzzle Rush run: its order and the puzzles solved so far. */ rush?: { order: number[]; score: number } }
    /** Set in a best-of-three: the opponent and the games won and lost so far. */
    series?: { wins: number; losses: number }
    /** A fight of the gauntlet run; the run itself is kept apart from the saved game. */
    gauntlet?: boolean
    /** A scenario of the campaign's second tab: its index. */
    scenario?: number
    /** A co-op scenario of the campaign's third tab: its index. Two people share Solari. */
    coop?: number
    /** A chapter of the story whose battle this is; story games are not resumable and touch no campaign progress. */
    story?: string
    /** A ranked ladder game: the id of the opponent; not resumable. */
    ladder?: string
    /** A try-out from the board editor: nothing is recorded and Back returns to the editor. */
    editor?: boolean
    /** A try-out from a position in a reviewed game: nothing is recorded and Back returns to the menu. */
    tryout?: boolean
    /** A game played by link: its id in the saved list. The other court is not here, and each move ends the visit. */
    mail?: string
  }

const TUTORIAL_KEY = 'eclipse-court:tutorial'

function tutorialSeen(): boolean {
  try {
    return localStorage.getItem(TUTORIAL_KEY) === '1'
  } catch {
    return true
  }
}

/** Forgets that the lesson was done, so the menu offers it again and the checklist's first step is open. */
function clearTutorialSeen() {
  try {
    localStorage.removeItem(TUTORIAL_KEY)
  } catch {
    // Nothing was stored.
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
  shared.kind === 'challenge' ? { name: 'challenge', challenge: shared.challenge }
    : shared.kind === 'turn' ? { name: 'mail', incoming: shared.record }
    : shared.kind === 'watch' ? { name: 'replay', record: shared.record, from: 'menu', watch: true }
    : { name: 'replay', record: shared.record, from: 'menu' }

/** Reads a `#c=`, `#r=` or `#g=` link out of the address, then removes it so a reload does not reopen it. */
function takeLinkScreen(): Screen | null {
  const { hash, pathname, search } = window.location
  if (!/^#[crgj]=/.test(hash)) return null
  history.replaceState(null, '', pathname + search)
  if (hash.startsWith('#j=')) return { name: 'lobby', offer: hash.slice(3) }
  const shared = parseShared(hash)
  return shared && sharedScreen(shared)
}

/** The match a skirmish setup describes, for starting it or sending it as a challenge. */
function skirmishRecord(setup: SetupChoice, human: Court, difficulty: Difficulty, hotSeat: boolean, seed: number): GameRecord {
  const config = skirmishConfig(setup, human, seed, hotSeat ? {} : {
    roles: aiDraft(seed, difficulty),
    loadout: (setup.loadout || setup.legacy) && aiLoadout(seed, otherCourt(human)),
  })
  const initial = newGame(config)
  return { initial: config.setup === 'legacy' && setup.legacy ? withLegacy(initial, setup.legacy, human) : initial, actions: [] }
}

export default function App() {
  const [screen, setScreen] = useState<Screen>(() => takeLinkScreen() ?? { name: 'menu' })
  const [progress, setProgress] = useState(loadProgress)
  const [design, setDesign] = useState(editorDraft)
  const changeDesign = (next: Design) => { setDesign(next); saveDraft(next) }
  /** What the battle just finished earned, shown on the campaign screen. */
  const [report, setReport] = useState<string[]>([])
  const [seen, setSeen] = useState(tutorialSeen)
  const [saved, setSaved] = useState(loadSaved)
  const [run, setRun] = useState(loadRun)
  const [runText, setRunText] = useState<string | null>(null)
  /** Settles a run that has ended: ascension and daily records, their Shards, and the summary to share. Returns lines for the report. */
  const closeRun = (ended: Run, stage: number, won: boolean) => {
    const out = recordAscension(ended, stage, won)
    earnShards(out.shards)
    const legacy = legacyOf(ended)
    if (legacy && saveLegacy(legacy)) out.lines.push('Your army is kept as a Legacy: pick Legacy under Army in Skirmish to field it.')
    setRunText(runSummary(ended, stage, won))
    return out.lines
  }
  const progressRef = useRef(progress)
  progressRef.current = progress
  /** Adds time played to the lifetime total, whichever play screen reports it. */
  const addTime = (seconds: number) => {
    const next = addPlaytime(progressRef.current, seconds)
    progressRef.current = next
    setProgress(next)
    saveProgress(next)
  }
  const [campaignTab, setCampaignTab] = useState<CampaignTab>(() => oneOf<CampaignTab>(loadChoices('campaign').tab, ['battles', 'scenarios', 'coop'], 'battles'))

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
          if (record) setScreen({ name: 'replay', record, own: true })
        } : undefined} />
    )

  if (screen.name === 'story')
    return <Story onOpen={(id) => setScreen({ name: 'chapter', id })} onEnding={(id) => setScreen({ name: 'ending', id })}
      onBond={(id) => setScreen({ name: 'bond', id })} onBack={() => setScreen({ name: 'menu' })} />

  if (screen.name === 'bond') {
    const bond = bondById(screen.id)
    const after = bond && chapterById(bond.after)
    if (!bond || !after) return <Story onOpen={(id) => setScreen({ name: 'chapter', id })} onBack={() => setScreen({ name: 'menu' })} />
    return (
      <StoryReader key={bond.id} chapter={{ ...after, title: bond.title }} beats={visibleBeats(bond.beats, storySnapshot())}
        onBack={() => setScreen({ name: 'story' })} onDone={() => { markBondRead(bond.id); setScreen({ name: 'story' }) }} />
    )
  }

  if (screen.name === 'chapter') {
    const chapter = chapterById(screen.id)
    if (!chapter) return <Story onOpen={(id) => setScreen({ name: 'chapter', id })} onBack={() => setScreen({ name: 'menu' })} />
    const { battle } = chapter
    return (
      <StoryReader key={chapter.id} chapter={chapter} beats={visibleBeats(chapter.beats, storySnapshot())}
        finishLabel={battle ? 'To battle' : undefined} onBack={() => setScreen({ name: 'story' })}
        onDone={() => {
          const game = battle && storyBattleGame(battle, storySnapshot().characters, Date.now())
          if (!battle || !game) {
            markChapterRead(chapter.id)
            return setScreen({ name: 'story' })
          }
          setScreen({ name: 'game', human: battleCourt(battle), difficulty: scenarioOf(battle)?.difficulty ?? 'normal', record: { initial: game, actions: [] }, campaignIndex: null, story: chapter.id })
        }} />
    )
  }

  if (screen.name === 'aftermath') {
    const chapter = chapterById(screen.id)
    const scene = chapter?.battle && (screen.won ? chapter.battle.won : chapter.battle.lost)
    if (!chapter || !scene) return <Story onOpen={(id) => setScreen({ name: 'chapter', id })} onBack={() => setScreen({ name: 'menu' })} />
    return (
      <StoryReader key={`${chapter.id}-${screen.won}`} chapter={chapter} beats={visibleBeats(scene, storySnapshot())}
        onBack={() => setScreen({ name: 'story' })}
        onDone={() => setScreen(screen.won && chapter.ending ? { name: 'ending', id: chapter.id } : { name: 'story' })} />
    )
  }

  if (screen.name === 'ending') {
    const chapter = chapterById(screen.id)
    if (!chapter?.ending) return <Story onOpen={(id) => setScreen({ name: 'chapter', id })} onBack={() => setScreen({ name: 'menu' })} />
    return (
      <StoryEnding choice={chapter.ending} story={storySnapshot()} chapterId={chapter.id} onBack={() => setScreen({ name: 'story' })}
        onChoose={(ending) => { recordEnding(ending); setScreen({ name: 'epilogue', id: chapter.id, ending }) }} />
    )
  }

  if (screen.name === 'epilogue') {
    const chapter = chapterById(screen.id)
    const option = chapter?.ending?.options.find((o) => o.id === screen.ending)
    if (!chapter || !option) return <Story onOpen={(id) => setScreen({ name: 'chapter', id })} onBack={() => setScreen({ name: 'menu' })} />
    return (
      <StoryReader key={`${chapter.id}-${option.id}`} chapter={chapter} beats={visibleBeats(option.beats, storySnapshot())}
        onBack={() => setScreen({ name: 'story' })} onDone={() => setScreen({ name: 'story' })} />
    )
  }

  if (screen.name === 'puzzles') {
    const left = loadPuzzle(PUZZLES.length)
    return (
      <Puzzles progress={progress} report={report}
        resume={left ? { name: PUZZLES[left.index].name, rush: !!left.rush, onResume: () => {
          setReport([])
          setScreen({ name: 'game', human: 'solari', difficulty: PUZZLES[left.index].difficulty, record: left.record, campaignIndex: null, puzzle: { index: left.index, daily: left.daily, rush: left.rush } })
        } } : undefined}
        onReset={() => { const next = resetPuzzles(progress); setProgress(next); saveProgress(next) }}
        onBack={() => setScreen({ name: 'menu' })}
        onEndless={() => { setReport([]); setScreen({ name: 'endless' }) }}
        onRush={() => {
          const order = rushOrder(Date.now() % 1000000007)
          const index = order[0]
          setReport([])
          setScreen({ name: 'game', human: 'solari', difficulty: PUZZLES[index].difficulty, record: { initial: PUZZLES[index].build(), actions: [] }, campaignIndex: null, puzzle: { index, daily: false, rush: { order, score: 0 } } })
        }}
        onPlay={(index, daily) => {
          setReport([])
          setScreen({
            name: 'game', human: 'solari', difficulty: PUZZLES[index].difficulty,
            record: { initial: PUZZLES[index].build(), actions: [] }, campaignIndex: null, puzzle: { index, daily },
          })
        }} />
    )
  }

  if (screen.name === 'endless') {
    return (
      <Endless report={report}
        onReset={resetEndless}
        onBack={() => setScreen({ name: 'puzzles' })}
        onStart={(g, rec) => {
          const p = endlessPuzzle(g, rec.n + 1)
          setReport([])
          // The next one is searched for while this one is played.
          void requestEndless(rec.n + 1, bandFor(rec.rating))
          setScreen({ name: 'game', human: 'solari', difficulty: p.difficulty, record: { initial: p.build(), actions: [] }, campaignIndex: null, puzzle: { index: 0, daily: false, endless: { puzzle: p, number: rec.n + 1, rating: puzzleRating(g) } } })
        }} />
    )
  }

  if (screen.name === 'daily') {
    const match = dailyMatch()
    return (
      <Daily match={match} progress={progress} report={report} onBack={() => setScreen({ name: 'menu' })}
        onPlay={() => {
          setReport([])
          setScreen({ name: 'game', human: match.court, difficulty: match.difficulty, record: { initial: dailyGame(match), actions: [] }, campaignIndex: null })
        }} />
    )
  }

  if (screen.name === 'weekly') {
    const match = weeklyMatch()
    return (
      <Weekly match={match} report={report} onBack={() => setScreen({ name: 'menu' })}
        onPlay={() => {
          setReport([])
          setScreen({ name: 'game', human: WEEKLY_COURT, difficulty: match.difficulty, record: { initial: weeklyGame(match), actions: [] }, campaignIndex: null })
        }} />
    )
  }

  if (screen.name === 'ladder')
    return (
      <Ladder report={report} onBack={() => setScreen({ name: 'battle' })}
        onPlay={(id) => {
          const foe = foeById(id)
          if (!foe) return
          setReport([])
          setScreen({ name: 'game', human: LADDER_COURT, difficulty: foe.difficulty, record: { initial: ladderGame(Date.now() % 1000000007, foe), actions: [] }, campaignIndex: null, ladder: id })
        }} />
    )

  if (screen.name === 'battle')
    return <Battle onLadder={() => { setReport([]); setScreen({ name: 'ladder' }) }} onBack={() => setScreen({ name: 'menu' })} onSkirmish={() => setScreen({ name: 'skirmish' })} onPractice={() => setScreen({ name: 'practice' })} onPaste={() => setScreen({ name: 'paste' })} onEditor={() => setScreen({ name: 'editor' })} onOnline={() => setScreen({ name: 'online' })} onMail={() => setScreen({ name: 'mail' })} />

  if (screen.name === 'online')
    return <Online onBack={() => setScreen({ name: 'battle' })} onHost={() => setScreen({ name: 'skirmish', online: true })} onJoin={() => setScreen({ name: 'lobby' })} />

  if (screen.name === 'lobby')
    return <Lobby key={screen.offer ?? 'host'} challenge={screen.challenge} offer={screen.offer} resume={screen.resume?.session}
      onResumed={(session) => setScreen({ name: 'game', human: session.view().me!, difficulty: 'normal', online: session, record: { initial: screen.resume!.record.initial, actions: [...session.view().actions] }, campaignIndex: null })}
      onStart={(session) => {
        const view = session.view()
        setScreen({ name: 'game', human: view.me!, difficulty: 'normal', online: session, record: { initial: view.state!, actions: [] }, campaignIndex: null })
      }}
      onBack={() => setScreen({ name: 'online' })} />

  if (screen.name === 'practice') return <Practice onPlaytime={addTime} onDuel={(o) => { const next = recordPractice(progressRef.current, o); progressRef.current = next; setProgress(next); saveProgress(next) }} onBack={() => setScreen({ name: 'battle' })} />

  if (screen.name === 'collection') return <Collection onBack={() => setScreen({ name: 'menu' })} />

  if (screen.name === 'settings') return <Settings progress={progress} onShowGuidance={() => { clearTutorialSeen(); setSeen(false) }} onBack={() => setScreen({ name: 'menu' })} />

  if (screen.name === 'replay') {
    /** A review of the player's own last game can earn achievements. */
    const reviewed = (sides: Record<Court, SideSummary>, winner: Court | 'draw' | null) => {
      const court = masterySnapshot().lastCourt
      if (!court) return []
      const side = sides[court]
      const result = recordReview(progress, { moves: side.moves, accuracy: side.accuracy, mistakes: side.counts.mistake + side.counts.blunder, won: winner === court })
      if (result.earned.length === 0) return []
      const shards = result.earned.length * 10
      earnShards(shards)
      setProgress(result.progress)
      saveProgress(result.progress)
      return [`Shards: +${shards}.`, ...result.earned.map((a) => `Achievement: ${a.name}`)]
    }
    return <Replay record={screen.record} watch={screen.watch} onPlayOn={screen.watch ? undefined : (state, court) => setScreen({ name: 'game', human: court, difficulty: 'normal', record: { initial: state, actions: [] }, campaignIndex: null, tryout: true })} autoplay={screen.from === 'menu'} onReviewed={screen.own ? reviewed : undefined} onBack={() => setScreen(screen.from === 'mail' ? { name: 'mail' } : screen.from ? { name: 'menu' } : { name: 'stats' })} />
  }

  if (screen.name === 'paste')
    return <PasteCode onBack={() => setScreen({ name: 'battle' })} onOpen={(shared) => setScreen(sharedScreen(shared))} />

  if (screen.name === 'editor')
    return (
      <Editor design={design} onChange={changeDesign} onBack={() => setScreen({ name: 'battle' })}
        onTest={(challenge) => setScreen({ name: 'game', human: challenge.side, difficulty: 'normal', record: { initial: newGame(challenge.config), actions: [] }, campaignIndex: null, editor: true })} />
    )

  if (screen.name === 'challenge')
    return (
      <Challenge challenge={screen.challenge} onBack={() => setScreen({ name: 'menu' })}
        onEdit={isCustom(screen.challenge.config) ? () => { changeDesign(designFromConfig(screen.challenge.config, screen.challenge.side)); setScreen({ name: 'editor' }) } : undefined}
        onPlay={(human, difficulty, hotSeat) =>
          setScreen({ name: 'game', human, difficulty, hotSeat, record: { initial: newGame(screen.challenge.config), actions: [] }, campaignIndex: null })} />
    )

  if (screen.name === 'mail')
    return (
      <Mail incoming={screen.incoming} onBack={() => setScreen({ name: 'battle' })} onNew={() => setScreen({ name: 'skirmish', mail: true })}
        onPlay={(game) => { const record = recordOfGame(game); if (record) setScreen({ name: 'game', human: game.me, difficulty: 'normal', record, campaignIndex: null, mail: game.id }) }}
        onSend={(game) => setScreen({ name: 'mailsend', id: game.id })}
        onReplay={(record) => setScreen({ name: 'replay', record, from: 'mail' })} />
    )

  if (screen.name === 'mailsend') {
    const game = mailGame(screen.id)
    const record = game && recordOfGame(game)
    if (!game || !record) return <Mail onBack={() => setScreen({ name: 'battle' })} onNew={() => setScreen({ name: 'skirmish', mail: true })} onPlay={() => {}} onSend={() => {}} onReplay={() => {}} />
    return <MailSend game={game} record={record} onReplay={(r) => setScreen({ name: 'replay', record: r, from: 'mail' })} onBack={() => setScreen({ name: 'mail' })} />
  }

  if (screen.name === 'skirmish')
    return (
      <SkirmishSetup
        progress={progress}
        initialTier={classicNext() ? 'classic' : 'standard'}
        onBack={() => setScreen(screen.online ? { name: 'online' } : screen.mail ? { name: 'mail' } : { name: 'battle' })}
        byLink={screen.mail}
        onHost={screen.mail ? (human, setup) => {
          setClassicNext(false)
          const record = skirmishRecord(setup, human, 'normal', true, Date.now())
          const game = putMail(record, human)
          setScreen(record.initial.turn === human
            ? { name: 'game', human, difficulty: 'normal', record, campaignIndex: null, mail: game.id }
            : { name: 'mailsend', id: game.id })
        } : screen.online ? (human, setup) => setScreen({
          name: 'lobby', challenge: { config: skirmishRecord(setup, human, 'normal', true, Date.now()).initial.config, side: otherCourt(human) },
        }) : undefined}
        challengeLink={(human, difficulty, setup, hotSeat) =>
          challengeLink({ config: skirmishRecord(setup, human, difficulty, hotSeat, Date.now()).initial.config, side: otherCourt(human) })}
        onStart={(human, difficulty, setup, hotSeat) => {
          setClassicNext(false)
          setScreen({ name: 'game', human, difficulty, hotSeat, record: skirmishRecord(setup, human, difficulty, hotSeat, Date.now()), campaignIndex: null })
        }}
      />
    )

  if (screen.name === 'gauntlet') {
    const left = loadFight(run)
    const update = (next: Run | null) => {
      setRun(next)
      // Every change to the run (a new one, a reward, the end) comes between fights, so none left over still applies.
      clearFight()
      if (next) saveRun(next)
      else clearRun()
    }
    const endRun = (ended: Run, stage: number, won: boolean, lines: string[]) => {
      const result = recordRun(progress, stage, won)
      setProgress(result.progress)
      saveProgress(result.progress)
      setReport([...lines, ...result.earned.map((a) => `Achievement: ${a.name}`), ...closeRun(ended, stage, won)])
      update(null)
    }
    return (
      <Gauntlet
        progress={progress} run={run} resuming={!!left} report={report} onBack={() => { setReport([]); setScreen({ name: 'menu' }) }}
        summary={runText}
        onStart={(court, roles, opts) => { setReport([]); setRunText(null); update(startRun(court, roles, opts.seed ?? Date.now(), { ascension: opts.ascension, relic: opts.relic })) }}
        onDaily={() => { setReport([]); setRunText(null); update(startRun(DAILY_COURT, CLASSIC_ROLES, dailySeed(), { daily: dailySeed() })) }}
        onReward={(reward: Reward) => { if (run) update(applyReward(run, reward)) }}
        onAbandon={() => { if (run) endRun(run, run.stage, false, [`Run abandoned at stage ${run.stage}.`]) }}
        onFight={() => {
          if (!run) return
          const foe = stageFoe(run.seed, run.stage, run.ascension)
          setReport([])
          setScreen({ name: 'game', human: run.court, difficulty: foe.difficulty, record: left?.record ?? { initial: stageGame(run), actions: [] }, campaignIndex: null, gauntlet: true })
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
        onTab={(t) => { setCampaignTab(t); saveChoices('campaign', { tab: t }) }}
        onReset={(tab) => { const next = tab === 'coop' ? resetCoop(progress) : tab === 'scenarios' ? resetScenarios(progress) : resetCampaign(progress); setProgress(next); saveProgress(next) }}
        onBack={() => setScreen({ name: 'menu' })}
        onPlayCoop={(i) => {
          setReport([])
          setScreen({
            name: 'game', human: 'solari', difficulty: COOP_SCENARIOS[i].difficulty,
            record: { initial: coopGame(COOP_SCENARIOS[i], Date.now()), actions: [] }, campaignIndex: null, coop: i,
          })
        }}
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
    const { human, difficulty, record, campaignIndex, puzzle, series, hotSeat, online, gauntlet, scenario, coop, story, ladder, editor, tryout, mail } = screen
    /** Puzzles and tournament games are not resumable, so they never touch the saved game. */
    /** Today's match as set for everyone, against the AI it names; only this one is scored for the day. */
    const today = dailyMatch()
    const daily = !hotSeat && !online && !puzzle && !series && !gauntlet && !story && scenario === undefined && coop === undefined && campaignIndex === null && human === today.court
      && difficulty === today.difficulty && isDailyMatch(record.initial.config)
    const weeklyToday = weeklyMatch()
    const weekly = !daily && !hotSeat && !online && !puzzle && !series && !gauntlet && !story && scenario === undefined && coop === undefined && campaignIndex === null && human === WEEKLY_COURT
      && difficulty === weeklyToday.difficulty && isWeeklyMatch(record.initial.config)
    /** Boards from the editor can be rigged, so they count for nothing and cannot be resumed. */
    const custom = !!editor || !!tryout || isCustom(record.initial.config)
    const transient = custom || !!ladder || !!online || !!mail || !!puzzle || !!series || !!gauntlet || scenario !== undefined || coop !== undefined || !!story

    const current = puzzle && (puzzle.endless?.puzzle ?? PUZZLES[puzzle.index])
    const finishPuzzle = (winner: GameState['winner']) => {
      const solved = winner === human
      if (puzzle!.endless) {
        const before = loadEndless()
        const after = { ...applyResult(before, puzzle!.endless.rating, solved), n: puzzle!.endless.number }
        saveEndless(after)
        if (solved) earnShards(SHARDS_ENDLESS)
        const change = after.rating - before.rating
        setReport([
          `${solved ? 'Solved' : 'Missed'}: rating ${after.rating} (${change >= 0 ? '+' : ''}${change}).`,
          ...(solved ? [`Shards: +${SHARDS_ENDLESS}.`] : []),
        ])
        return setScreen({ name: 'endless' })
      }
      if (puzzle!.rush) {
        const { order, score } = puzzle!.rush
        const next = solved ? score + 1 : score
        if (solved && next < order.length) {
          const index = order[next]
          return setScreen({ name: 'game', human: 'solari', difficulty: PUZZLES[index].difficulty, record: { initial: PUZZLES[index].build(), actions: [] }, campaignIndex: null, puzzle: { index, daily: false, rush: { order, score: next } } })
        }
        const best = recordRush(next)
        const shards = Math.min(next, RUSH_SHARD_CAP)
        earnShards(shards)
        setReport([`Puzzle Rush: ${next} solved${best ? ' — a new best!' : ''}.`, ...(shards > 0 ? [`Shards: +${shards}.`] : [])])
        return setScreen({ name: 'puzzles' })
      }
      if (solved) {
        const { progress: next, earned } = recordPuzzle(progress, PUZZLES[puzzle!.index].id, puzzle!.daily && puzzle!.index === dailyPuzzleIndex())
        setProgress(next)
        saveProgress(next)
        const shards = (puzzle!.daily && puzzle!.index === dailyPuzzleIndex() ? SHARDS_DAILY_PUZZLE : SHARDS_PUZZLE) + earned.length * 10
        earnShards(shards)
        setReport([`Shards: +${shards}.`, ...earned.map((a) => `Achievement: ${a.name}`)])
      } else setReport([])
      setScreen({ name: 'puzzles' })
    }

    /** Records a finished game and returns the lines to show about it. */
    const finishGame = (winner: GameState['winner'], finished: GameRecord, stats: boolean) => {
      const settled = settleGame(progress, { winner, finished, human, difficulty, campaignIndex, scenario, coop, daily, today, stats })
      if (settled.summary) rememberCourt(human)
      if (settled.summary && stats) {
        recordGameResult(settled.summary)
        recordRoleDuels(finished, human)
      }
      let extra: ReturnType<typeof recordWeekly> | null = null
      if (weekly && stats && settled.summary) extra = recordWeekly(weeklyToday.week, weeklyScore(settled.summary), settled.summary.won)
      const foe = ladder ? foeById(ladder) : undefined
      if (foe && stats && settled.summary) {
        const rated = recordLadder(foe, settled.summary.won ? 'win' : settled.summary.draw ? 'draw' : 'loss')
        earnShards(settled.shards + rated.shards)
        return { ...settled, lines: [...rated.lines, ...settled.lines] }
      }
      // Side goals pay only in plain skirmishes against an AI that is not the easiest.
      const bounties = stats && settled.summary && scenario === undefined && coop === undefined && campaignIndex === null && !daily && !weekly && !custom && difficulty !== 'easy'
        ? claimBounties(settled.summary) : []
      const bountyShards = bounties.reduce((n, b) => n + b.shards, 0)
      earnShards(settled.shards + (extra?.shards ?? 0) + bountyShards)
      if (bounties.length > 0) return { ...settled, lines: [...bounties.map((b) => `Bounty: ${b.text}. +${b.shards} Shards.`), ...settled.lines] }
      return extra ? { ...settled, lines: [...extra.lines, ...settled.lines] } : settled
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

    /** A gauntlet fight ends: a win carries the survivors on to a reward, anything else ends the run. */
    const finishFight = (winner: GameState['winner'], finished: GameRecord) => {
      setScreen({ name: 'gauntlet' })
      if (!run || winner === null) return
      const final = winner === human ? replay(finished) : null
      if (!final) {
        const result = recordRun(progress, run.stage, false)
        setProgress(result.progress)
        saveProgress(result.progress)
        setReport([`${winner === 'draw' ? 'A draw' : 'A defeat'} at stage ${run.stage}: the run is over.`, ...result.earned.map((a) => `Achievement: ${a.name}`), ...closeRun(run, run.stage, false)])
        setRun(null)
        clearRun()
        return
      }
      const next = applyVictory(run, final)
      if (runWon(next)) {
        const result = recordRun(progress, next.stage, true)
        setProgress(result.progress)
        saveProgress(result.progress)
        const extra = closeRun(run, next.stage, true)
        const shards = SHARDS_GAUNTLET_STAGE + SHARDS_GAUNTLET_WIN + result.earned.length * 10
        earnShards(shards)
        setReport(['The Eclipse Tyrant falls. The run is won!', `Shards: +${shards}.`, ...result.earned.map((a) => `Achievement: ${a.name}`), ...extra])
        setRun(null)
        clearRun()
        return
      }
      earnShards(SHARDS_GAUNTLET_STAGE)
      setReport([`Stage ${run.stage} cleared.`, `Shards: +${SHARDS_GAUNTLET_STAGE}.`])
      setRun(next)
      saveRun(next)
    }

    /** A story battle ends: a win settles who is wounded or fallen, a loss changes nothing so the chapter can be tried again. */
    const finishStory = (chapterId: string, winner: GameState['winner'], finished: GameRecord) => {
      const battle = chapterById(chapterId)?.battle
      const final = winner === human && battle ? replay(finished) : null
      if (!battle || winner === null) return setScreen({ name: 'story' })
      if (final) recordStoryWin(chapterId, afterVictory(battle, final, storySnapshot().characters))
      else recordStoryLoss(chapterId)
      setScreen({ name: 'aftermath', id: chapterId, won: !!final })
    }

    const context: ComponentProps<typeof Game>['context'] =
      mail ? { label: 'By link', kind: 'skirmish' }
      : story ? { label: `Story: ${chapterById(story)?.title ?? 'battle'}`, kind: 'story' }
      : gauntlet ? { label: `Gauntlet stage ${run?.stage ?? ''}`.trim(), kind: 'gauntlet' }
      : coop !== undefined ? { label: `Co-op: ${COOP_SCENARIOS[coop].name}`, kind: 'scenario', coop: true }
      : scenario !== undefined ? { label: `Scenario: ${SCENARIOS[scenario].name}`, kind: 'scenario' }
      : campaignIndex !== null ? { label: `${series ? 'Tournament' : 'Battle'} vs ${CAMPAIGN[campaignIndex].name}`, kind: series ? 'series' : 'campaign' }
      : daily ? { label: 'Daily match', kind: 'daily' }
      : weekly ? { label: 'Weekly challenge', kind: 'daily', flavour: 'weekly' }
      : ladder ? { label: `Ladder vs ${foeById(ladder)?.name ?? 'opponent'}`, kind: 'skirmish', scored: true, flavour: 'ladder' }
      : { label: 'Skirmish', kind: 'skirmish' }
    const foe = gauntlet && run ? stageFoe(run.seed, run.stage, run.ascension) : null
    return (
      <>
      <PlayTimer onFlush={addTime} />
      <Game
        key={`${record.initial.rng}${human}`}
        controllers={hotSeat ? HOT_SEAT
          : online || mail ? versusOnline(human)
          : foe ? versusAi(human, foe.difficulty, foe.personality)
          : versusAi(human, ladder ? foeById(ladder)?.level ?? difficulty : difficulty, ladder ? foeById(ladder)?.personality : daily ? today.personality : weekly ? weeklyToday.personality : campaignIndex === null ? undefined : (CAMPAIGN[campaignIndex].personality satisfies PersonalityId))}
        record={record}
        session={online}
        mail={mail ? (moved) => { const game = mailGame(mail); if (game) putMail(moved, game.me); setScreen({ name: 'mailsend', id: mail }) } : undefined}
        context={context}
        coach={!series && isFirstBattle(progress, campaignIndex)}
        puzzle={puzzle && { name: current!.name, text: current!.text, rush: !!puzzle.rush || !!puzzle.endless }}
        onRematch={online && ((view) => setScreen({ name: 'game', human: view.me!, difficulty: 'normal', online, record: { initial: view.state!, actions: [] }, campaignIndex: null }))}
        onReconnect={online && ((record) => setScreen({ name: 'lobby', resume: { session: online, record } }))}
        puzzleLimit={current?.limit}
        puzzleHelp={current && { hints: current.hints, solution: current.solution }}
        onSave={(progress) => {
          if (gauntlet && run) return progress ? saveFight({ seed: run.seed, stage: run.stage, record: progress }) : clearFight()
          if (puzzle?.endless) return clearPuzzle()
          if (puzzle) return progress ? savePuzzle({ index: puzzle.index, daily: puzzle.daily, rush: puzzle.rush, record: progress }) : clearPuzzle()
          if (transient) return
          if (progress) saveGame({ human, difficulty, campaignIndex, hotSeat, record: progress })
          else clearSaved()
        }}
        onExit={(winner, finished, review) => {
          if (mail) {
            // Quitting before a move changes nothing; a game decided by the last move is kept and its link shown.
            const game = mailGame(mail)
            if (game && finished.actions.length > (recordOfGame(game)?.actions.length ?? 0)) {
              putMail(finished, game.me)
              return setScreen({ name: 'mailsend', id: mail })
            }
            return setScreen({ name: 'mail' })
          }
          if (online) {
            // Games between people touch neither the record nor the saved game; they are only counted as played.
            if (winner) { const next = recordVersus(progress, 'online', winner === 'draw' ? null : winner === human); setProgress(next); saveProgress(next) }
            online.close()
            return setScreen({ name: 'online' })
          }
          if (custom && !hotSeat) return setScreen(editor ? { name: 'editor' } : { name: 'menu' })
          if (gauntlet) return finishFight(winner, finished)
          if (story) return finishStory(story, winner, finished)
          if (puzzle) return finishPuzzle(winner)
          if (series) return finishSeries(winner, finished)
          clearSaved()
          setSaved(null)
          // Games between two people say nothing about the player's own record.
          if (hotSeat) {
            if (winner) { const next = recordVersus(progress, 'hotseat', winner === 'draw' ? null : winner === 'solari'); setProgress(next); saveProgress(next) }
            return setScreen({ name: 'menu' })
          }
          const done = finishGame(winner, finished, true)
          setProgress(done.progress)
          if (done.summary) saveProgress(done.progress)
          const lines = [...done.lines]
          // Only games where the player picked the difficulty say whether it is too hard.
          if (done.summary && !ladder && !daily && !weekly) {
            recordAiGame(difficulty, done.summary.won ? 'win' : done.summary.draw ? 'draw' : 'loss')
            const advice = adviceFor(onboardingSnapshot())
            if (advice) lines.push(advice.text)
          }
          setReport(lines)
          if (scenario !== undefined) { setCampaignTab('scenarios'); saveChoices('campaign', { tab: 'scenarios' }) }
          if (coop !== undefined) { setCampaignTab('coop'); saveChoices('campaign', { tab: 'coop' }) }
          if (review) return setScreen({ name: 'replay', record: finished, own: true })
          setScreen(ladder ? { name: 'ladder' } : daily ? { name: 'daily' } : weekly ? { name: 'weekly' } : scenario !== undefined || coop !== undefined ? { name: 'campaign' } : campaignIndex === null ? { name: 'menu' } : { name: 'campaign' })
        }}
      />
      </>
    )
  }

  return (
    <MainMenu firstRun={!seen} progress={progress} onBattle={() => setScreen({ name: 'battle' })}
      onResume={saved ? () => setScreen({ name: 'game', ...saved }) : undefined} onSkirmish={() => setScreen({ name: 'skirmish' })}
      onCampaign={() => { setReport([]); setScreen({ name: 'campaign' }) }} onStory={() => setScreen({ name: 'story' })} onGauntlet={() => { setReport([]); setScreen({ name: 'gauntlet' }) }} onStats={() => setScreen({ name: 'stats' })} onTutorial={() => setScreen({ name: 'tutorial' })}
      onDaily={() => { setReport([]); setScreen({ name: 'daily' }) }} onWeekly={() => { setReport([]); setScreen({ name: 'weekly' }) }}
      dailyDone={{ weekly: forWeek(weeklySnapshot(), weeklyMatch().week).paid, match: !!dailyResult(progress, dailySeed()), puzzle: progress.puzzles.includes(PUZZLES[dailyPuzzleIndex()].id) }}
      onDailyPuzzle={() => {
        const index = dailyPuzzleIndex()
        setReport([])
        setScreen({ name: 'game', human: 'solari', difficulty: PUZZLES[index].difficulty, record: { initial: PUZZLES[index].build(), actions: [] }, campaignIndex: null, puzzle: { index, daily: true } })
      }}
      onPuzzles={() => { setReport([]); setScreen({ name: 'puzzles' }) }} onSettings={() => setScreen({ name: 'settings' })} onCollection={() => setScreen({ name: 'collection' })} />
  )
}
