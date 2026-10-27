import { useState, useSyncExternalStore } from 'react'
import { isMuted, setMuted } from '../../audio/synth'
import { Icon, type IconName } from './icons'
import { PieceArt } from '../../art/PieceArt'
import type { Progress } from '../../progress'
import { dailySeed } from '../../engine/data/setups'
import { Bar } from './Bar'
import { TipCard } from '../tips/TipCard'
import { cardSummaries, primaryAction, type CardInfo } from './menuModel'
import { storySnapshot, subscribeStory } from '../../story'

interface Props {
  progress: Progress
  onSkirmish: () => void
  onBattle: () => void
  onCampaign: () => void
  onStory: () => void
  onGauntlet: () => void
  onTutorial: () => void
  onStats: () => void
  onPuzzles: () => void
  onSettings: () => void
  onDaily: () => void
  onDailyPuzzle: () => void
  /** Whether today's match and puzzle have been played and solved. */
  dailyDone: { match: boolean; puzzle: boolean }
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

interface Card {
  icon: IconName
  title: string
  info: CardInfo
  onClick: () => void
  /** Spans both columns. */
  wide?: boolean
}

export function MainMenu({ progress, onSkirmish, onBattle, onCampaign, onStory, onGauntlet, onTutorial, onStats, onPuzzles, onSettings, onDaily, onDailyPuzzle, dailyDone, onResume, firstRun }: Props) {
  const [sound, setSound] = useState(() => !isMuted())
  const primary = primaryAction(progress, !!onResume, firstRun)
  const start = { resume: onResume, learn: onTutorial, campaign: onCampaign, skirmish: onSkirmish }[primary.kind]
  const storyRead = useSyncExternalStore(subscribeStory, storySnapshot)
  const summary = cardSummaries(progress, dailySeed(), storyRead)
  const cards: Card[] = [
    { icon: 'swords', title: 'Battle', info: summary.battle, onClick: onBattle },
    { icon: 'banner', title: 'Campaign', info: summary.campaign, onClick: onCampaign },
    { icon: 'flame', title: 'Gauntlet', info: summary.gauntlet, onClick: onGauntlet },
    { icon: 'puzzle', title: 'Puzzles', info: summary.puzzles, onClick: onPuzzles },
    { icon: 'book', title: 'Story', info: summary.story, onClick: onStory, wide: true },
  ]
  return (
    <main className="app menu main-menu">
      <Hero />
      <h1><span>Eclipse</span> Court</h1>
      <div className="divider" aria-hidden="true"><i /></div>
      <div className="menu-buttons">
        <button className="primary" onClick={start}><Icon name="play" />{primary.label}</button>
      </div>
      <section className="today" aria-label="Today">
        <h3>Today{summary.streak > 0 && <span className="streak"><Icon name="flame" />{summary.streak} day streak</span>}</h3>
        <div className="today-row">
          <button onClick={onDaily}><Icon name={dailyDone.match ? 'check' : 'sun'} />Daily Match</button>
          <button onClick={onDailyPuzzle}><Icon name={dailyDone.puzzle ? 'check' : 'puzzle'} />Daily Puzzle</button>
        </div>
      </section>
      <div className="mode-cards">
        {cards.map((c) => (
          <button key={c.title} className={`mode-card${c.wide ? ' wide' : ''}`} onClick={c.onClick}>
            <strong><Icon name={c.icon} />{c.title}</strong>
            {c.info.lines.map((line) => <span key={line}>{line}</span>)}
            {c.info.fraction !== null && <Bar fraction={c.info.fraction} thin />}
          </button>
        ))}
      </div>
      <nav className="utility" aria-label="More">
        <button onClick={onStats}><Icon name="trophy" /><span>Stats</span></button>
        <button onClick={onSettings}><Icon name="gear" /><span>Settings</span></button>
        <button onClick={onTutorial}><Icon name="book" /><span>How to Play</span></button>
        <button onClick={() => { setMuted(sound); setSound(!sound) }} aria-pressed={sound}>
          <Icon name={sound ? 'speakerOn' : 'speakerOff'} /><span>Sound {sound ? 'On' : 'Off'}</span>
        </button>
      </nav>
      <TipCard page="menu" />
    </main>
  )
}
