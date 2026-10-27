import { useState } from 'react'
import { isMuted, setMuted } from '../../audio/synth'
import { Icon } from './icons'
import { PieceArt } from '../../art/PieceArt'

interface Props {
  onSkirmish: () => void
  onCampaign: () => void
  onTutorial: () => void
  onStats: () => void
  onPuzzles: () => void
  onPractice: () => void
  onSettings: () => void
  onPaste: () => void
  /** Present when an unfinished game was left behind. */
  onResume?: () => void
  /** True until the player has finished or skipped the tutorial once. */
  firstRun: boolean
}

/** Deterministic scatter so the sky is the same on every visit. */
const STARS = Array.from({ length: 36 }, (_, i) => ({
  x: (i * 53.7) % 320,
  y: (i * 37.3 + (i % 5) * 11) % 250,
  r: 0.6 + (i % 4) * 0.35,
  delay: (i % 7) * 0.6,
}))
const RAYS = Array.from({ length: 24 }, (_, i) => i * 15)

/** An eclipse over the two courts' Leaders: the sun with a moon sliding across it. */
function Hero() {
  return (
    <svg className="hero" viewBox="0 0 320 250" role="img" aria-label="An eclipse between the Solarch and the Duskmother">
      <defs>
        <radialGradient id="hero-corona">
          <stop offset="0.35" stopColor="#ffd77a" stopOpacity="0.9" />
          <stop offset="0.6" stopColor="#e8943a" stopOpacity="0.35" />
          <stop offset="1" stopColor="#7a5cc8" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="hero-sun" cx="0.4" cy="0.35">
          <stop offset="0" stopColor="#fff4cf" />
          <stop offset="1" stopColor="#f2b84a" />
        </radialGradient>
        <radialGradient id="hero-moon" cx="0.65" cy="0.4">
          <stop offset="0" stopColor="#2b2468" />
          <stop offset="1" stopColor="#0d0a22" />
        </radialGradient>
      </defs>
      {STARS.map((s, i) => (
        <circle key={i} className="star" cx={s.x} cy={s.y} r={s.r} style={{ animationDelay: `${s.delay}s` }} />
      ))}
      <g transform="translate(160 110) scale(0.9)">
        <circle r="112" fill="url(#hero-corona)" className="corona" />
        <g className="rays">
          {RAYS.map((a) => (
            <path key={a} d="M-3,-62L0,-104L3,-62Z" transform={`rotate(${a})`} className={a % 30 ? 'ray short' : 'ray'} />
          ))}
        </g>
        <circle r="56" fill="url(#hero-sun)" />
        <g className="moon">
          <circle r="54" fill="url(#hero-moon)" />
          <circle r="54" fill="none" stroke="#9a7cf0" strokeWidth="1.2" opacity="0.7" />
        </g>
      </g>
      <g transform="translate(52 196) scale(92)"><PieceArt role="leader" court="solari" /></g>
      <g transform="translate(268 196) scale(92)"><PieceArt role="leader" court="umbral" /></g>
    </svg>
  )
}

export function MainMenu({ onSkirmish, onCampaign, onTutorial, onStats, onPuzzles, onPractice, onSettings, onPaste, onResume, firstRun }: Props) {
  const [sound, setSound] = useState(() => !isMuted())
  return (
    <main className="app menu main-menu">
      <Hero />
      <h1><span>Eclipse</span> Court</h1>
      <div className="divider" aria-hidden="true"><i /></div>
      <p className="tagline">Light and dark trade places. Every capture is a duel.</p>
      <div className="menu-buttons">
        {onResume && <button className="primary" onClick={onResume}><Icon name="play" />Resume game</button>}
        <button className={firstRun || onResume ? undefined : 'primary'} onClick={onSkirmish}><Icon name="swords" />Skirmish</button>
        <button onClick={onCampaign}><Icon name="banner" />Campaign</button>
        <button onClick={onPuzzles}><Icon name="puzzle" />Puzzles</button>
      </div>
      <div className="menu-buttons small">
        <button onClick={onPractice}><Icon name="target" />Practice</button>
        <button onClick={onStats}><Icon name="trophy" />Stats</button>
        <button onClick={onSettings}><Icon name="gear" />Settings</button>
      </div>
      <div className="menu-buttons small">
        <button className={firstRun ? 'primary' : undefined} onClick={onTutorial}><Icon name="book" />How to play</button>
        <button onClick={onPaste}><Icon name="chain" />Paste code</button>
        <button onClick={() => { setMuted(sound); setSound(!sound) }}><Icon name={sound ? 'speakerOn' : 'speakerOff'} />Sound: {sound ? 'on' : 'off'}</button>
      </div>
    </main>
  )
}
