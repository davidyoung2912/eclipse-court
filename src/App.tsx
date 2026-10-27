import { useEffect, useState } from 'react'
import { unlockAudio } from './audio/synth'
import { Game } from './Game'
import type { Difficulty } from './ai/profile'
import { CAMPAIGN } from './engine/data/campaign'
import type { GameRecord } from './engine/log'
import { newGame } from './engine/reducer'
import { clearSaved, loadSaved, saveGame } from './saved'
import type { Court } from './engine/rules/types'
import { Campaign } from './ui/menus/Campaign'
import { MainMenu } from './ui/menus/MainMenu'
import { Tutorial } from './ui/tutorial/Tutorial'
import { SkirmishSetup } from './ui/menus/SkirmishSetup'

type Screen =
  | { name: 'menu' }
  | { name: 'skirmish' }
  | { name: 'campaign' }
  | { name: 'tutorial' }
  | { name: 'game'; human: Court; difficulty: Difficulty; record: GameRecord; campaignIndex: number | null }

const PROGRESS_KEY = 'eclipse-court:campaign'
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

function loadCleared(): number {
  try {
    const n = Number(localStorage.getItem(PROGRESS_KEY))
    return Number.isInteger(n) ? Math.min(Math.max(n, 0), CAMPAIGN.length) : 0
  } catch {
    return 0
  }
}

function saveCleared(n: number) {
  try {
    localStorage.setItem(PROGRESS_KEY, String(n))
  } catch {
    // Progress is a convenience; playing on without saving is fine.
  }
}

export default function App() {
  const [screen, setScreen] = useState<Screen>({ name: 'menu' })
  const [cleared, setCleared] = useState(loadCleared)
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

  if (screen.name === 'skirmish')
    return (
      <SkirmishSetup
        onBack={() => setScreen({ name: 'menu' })}
        onStart={(human, difficulty) =>
          setScreen({ name: 'game', human, difficulty, record: { initial: newGame(Date.now()), actions: [] }, campaignIndex: null })}
      />
    )

  if (screen.name === 'campaign')
    return (
      <Campaign
        cleared={cleared}
        onBack={() => setScreen({ name: 'menu' })}
        onPlay={(i) => {
          const opponent = CAMPAIGN[i]
          setScreen({
            name: 'game', human: 'solari', difficulty: opponent.difficulty,
            record: { initial: opponent.setup(newGame(Date.now()), 'umbral'), actions: [] }, campaignIndex: i,
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
        record={record}
        onSave={(progress) => {
          if (progress) saveGame({ human, difficulty, campaignIndex, record: progress })
          else clearSaved()
        }}
        onExit={(winner) => {
          clearSaved()
          setSaved(null)
          if (campaignIndex === null) return setScreen({ name: 'menu' })
          if (winner === human && campaignIndex >= cleared) {
            setCleared(campaignIndex + 1)
            saveCleared(campaignIndex + 1)
          }
          setScreen({ name: 'campaign' })
        }}
      />
    )
  }

  return (
    <MainMenu firstRun={!seen}
      onResume={saved ? () => setScreen({ name: 'game', ...saved }) : undefined} onSkirmish={() => setScreen({ name: 'skirmish' })}
      onCampaign={() => setScreen({ name: 'campaign' })} onTutorial={() => setScreen({ name: 'tutorial' })} />
  )
}
