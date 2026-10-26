import { useState } from 'react'
import { isMuted, setMuted } from '../../audio/synth'

interface Props {
  onSkirmish: () => void
  onCampaign: () => void
  onTutorial: () => void
  /** True until the player has finished or skipped the tutorial once. */
  firstRun: boolean
}

export function MainMenu({ onSkirmish, onCampaign, onTutorial, firstRun }: Props) {
  const [sound, setSound] = useState(() => !isMuted())
  return (
    <main className="app menu">
      <h1>Eclipse Court</h1>
      <p className="tagline">Light and dark trade places. Every capture is a duel.</p>
      <div className="menu-buttons">
        <button className={firstRun ? undefined : 'primary'} onClick={onSkirmish}>Skirmish</button>
        <button onClick={onCampaign}>Campaign</button>
      </div>
      <div className="menu-buttons">
        <button className={firstRun ? 'primary' : undefined} onClick={onTutorial}>How to play</button>
        <button onClick={() => { setMuted(sound); setSound(!sound) }}>Sound: {sound ? 'on' : 'off'}</button>
      </div>
    </main>
  )
}
