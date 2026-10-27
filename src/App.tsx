import { useEffect, useState } from 'react'
import { unlockAudio } from './audio/synth'
import { Game } from './Game'
import type { Difficulty } from './ai/profile'
import { aiDraft, aiLoadout } from './ai/draft'
import { otherCourt } from './engine/rules/board'
import { skirmishConfig } from './engine/data/setups'
import { CAMPAIGN, campaignGame } from './engine/data/campaign'
import type { GameRecord } from './engine/log'
import { newGame } from './engine/reducer'
import { decodeRecord, encodeRecord } from './engine/serialize'
import type { PersonalityId } from './ai/personality'
import { loadProgress, recordGame, saveProgress, STAR_TEXT, starsEarned, summarise } from './progress'
import { clearSaved, loadSaved, saveGame } from './saved'
import type { Court } from './engine/rules/types'
import { Campaign } from './ui/menus/Campaign'
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
  | { name: 'replay'; record: GameRecord }
  | { name: 'game'; human: Court; difficulty: Difficulty; record: GameRecord; campaignIndex: number | null }

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

  if (screen.name === 'replay') return <Replay record={screen.record} onBack={() => setScreen({ name: 'stats' })} />

  if (screen.name === 'skirmish')
    return (
      <SkirmishSetup
        progress={progress}
        onBack={() => setScreen({ name: 'menu' })}
        onStart={(human, difficulty, setup) => {
          const seed = Date.now()
          const config = skirmishConfig(setup, human, seed, {
            roles: aiDraft(seed, difficulty),
            loadout: setup.loadout && aiLoadout(seed, otherCourt(human)),
          })
          setScreen({ name: 'game', human, difficulty, record: { initial: newGame(config), actions: [] }, campaignIndex: null })
        }}
      />
    )

  if (screen.name === 'campaign')
    return (
      <Campaign
        progress={progress}
        report={report}
        onBack={() => setScreen({ name: 'menu' })}
        onPlay={(i) => {
          setReport([])
          const opponent = CAMPAIGN[i]
          setScreen({
            name: 'game', human: 'solari', difficulty: opponent.difficulty,
            record: { initial: campaignGame(opponent, Date.now()), actions: [] }, campaignIndex: i,
          })
        }}
      />
    )

  if (screen.name === 'game') {
    const { human, difficulty, record, campaignIndex } = screen
    return (
      <Game
        key={record.initial.rng}
        human={human}
        difficulty={difficulty}
        personality={campaignIndex === null ? undefined : (CAMPAIGN[campaignIndex].personality satisfies PersonalityId)}
        record={record}
        onSave={(progress) => {
          if (progress) saveGame({ human, difficulty, campaignIndex, record: progress })
          else clearSaved()
        }}
        onExit={(winner, finished) => {
          clearSaved()
          setSaved(null)
          const summary = winner ? summarise(finished, human, difficulty, campaignIndex) : null
          if (summary) {
            const { progress: next, earned } = recordGame(progress, summary, encodeRecord(finished))
            setProgress(next)
            saveProgress(next)
            const stars = starsEarned(summary)
            setReport([
              ...(campaignIndex !== null && summary.won ? [`Stars: ${STAR_TEXT.filter((t) => stars & t.bit).map((t) => t.text).join(', ')}.`] : []),
              ...earned.map((a) => `Achievement: ${a.name}`),
            ])
          } else setReport([])
          setScreen(campaignIndex === null ? { name: 'menu' } : { name: 'campaign' })
        }}
      />
    )
  }

  return (
    <MainMenu firstRun={!seen}
      onResume={saved ? () => setScreen({ name: 'game', ...saved }) : undefined} onSkirmish={() => setScreen({ name: 'skirmish' })}
      onCampaign={() => { setReport([]); setScreen({ name: 'campaign' }) }} onStats={() => setScreen({ name: 'stats' })} onTutorial={() => setScreen({ name: 'tutorial' })} />
  )
}
