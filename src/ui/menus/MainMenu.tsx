import { useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react'
import { isMuted, setMuted } from '../../audio/synth'
import { Icon, type IconName } from './icons'
import { PieceArt } from '../../art/PieceArt'
import type { Progress } from '../../progress'
import { dailySeed } from '../../engine/data/setups'
import { Bar } from './Bar'
import { TipCard } from '../tips/TipCard'
import { cardSummaries, primaryAction, suggestions, type CardInfo, type SuggestionTarget } from './menuModel'
import { adviceFor, checklist, hideAdvice, hideChecklist, onboardingSnapshot, showChecklist, subscribeOnboarding } from '../../onboarding'
import { storySnapshot, subscribeStory } from '../../story'
import { t } from '../../i18n'

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
  onCollection: () => void
  onDaily: () => void
  onWeekly: () => void
  onDailyPuzzle: () => void
  /** Whether today's match and puzzle have been played and solved. */
  dailyDone: { match: boolean; puzzle: boolean; weekly: boolean }
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

/** Opening sequence stages: the whole title centred, a pause, then it rises into place. */
type Intro = 'centred' | 'rise' | 'done'
const INTRO_STEPS: [Intro, number][] = [['rise', 1200], ['done', 1700]]
let introPlayed = false

const RAYS = Array.from({ length: 24 }, (_, i) => i * 15)

/** An eclipse over the two courts' Leaders: the sun with a moon sliding across it. */
function Hero() {
  return (
    <svg className="hero" viewBox="0 0 320 250" role="img" aria-label={t('menu.heroLabel')}>
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
      <g className="hero-late">
        {STARS.map((s, i) => (
          <circle key={i} className="star" cx={s.x} cy={s.y} r={s.r} style={{ animationDelay: `${s.delay}s` }} />
        ))}
      </g>
      <g transform="translate(160 110) scale(0.9)" className="hero-core">
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
      <g className="hero-late">
        <g transform="translate(52 196) scale(92)"><PieceArt role="leader" court="solari" /></g>
        <g transform="translate(268 196) scale(92)"><PieceArt role="leader" court="umbral" /></g>
      </g>
    </svg>
  )
}

interface Card {
  icon: IconName
  id: string
  title: string
  info: CardInfo
  onClick: () => void
  /** Spans both columns. */
  wide?: boolean
}

export function MainMenu({ progress, onSkirmish, onBattle, onCampaign, onStory, onGauntlet, onTutorial, onStats, onPuzzles, onSettings, onCollection, onDaily, onWeekly, onDailyPuzzle, dailyDone, onResume, firstRun }: Props) {
  const [intro, setIntro] = useState<Intro>(() => (introPlayed || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'done' : 'centred'))
  const menuRef = useRef<HTMLElement>(null)
  const brandRef = useRef<HTMLDivElement>(null)
  const [sound, setSound] = useState(() => !isMuted())
  const primary = primaryAction(progress, !!onResume, firstRun)
  const start = { resume: onResume, learn: onTutorial, campaign: onCampaign, skirmish: onSkirmish }[primary.kind]
  const storyRead = useSyncExternalStore(subscribeStory, storySnapshot)
  const onboarding = useSyncExternalStore(subscribeOnboarding, onboardingSnapshot)
  const steps = checklist(progress, !firstRun)
  const advice = adviceFor(onboarding)
  const summary = cardSummaries(progress, dailySeed(), storyRead)
  const next = firstRun ? [] : suggestions(progress, dailyDone)
  const go: Record<SuggestionTarget, () => void> = { daily: onDaily, dailyPuzzle: onDailyPuzzle, weekly: onWeekly, puzzles: onPuzzles, campaign: onCampaign }
  const cards: Card[] = [
    { icon: 'book', id: 'story', title: t('menu.story'), info: summary.story, onClick: onStory, wide: true },
    { icon: 'swords', id: 'battle', title: t('menu.battle'), info: summary.battle, onClick: onBattle },
    { icon: 'banner', id: 'campaign', title: t('menu.campaign'), info: summary.campaign, onClick: onCampaign },
    { icon: 'flame', id: 'gauntlet', title: t('menu.gauntlet'), info: summary.gauntlet, onClick: onGauntlet },
    { icon: 'puzzle', id: 'puzzles', title: t('menu.puzzles'), info: summary.puzzles, onClick: onPuzzles },
  ]
  useLayoutEffect(() => {
    if (intro === 'done') { introPlayed = true; return }
    introPlayed = true
    const menu = menuRef.current
    const brand = brandRef.current
    if (!menu || !brand) return
    // The offset is layout-based so it ignores the transform already applied.
    const middle = menu.clientHeight / 2
    menu.style.setProperty('--intro-all', `${middle - (brand.offsetTop + brand.offsetHeight / 2)}px`)
    const timers = INTRO_STEPS.map(([step, at]) => window.setTimeout(() => setIntro(step), at))
    return () => timers.forEach(window.clearTimeout)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return (
    <main ref={menuRef} className="app menu main-menu" data-intro={intro}>
      <div ref={brandRef} className="brand">
        <Hero />
        <h1><span>{t('menu.titleLead')}</span> {t('menu.titleTail')}</h1>
        <div className="divider" aria-hidden="true"><i /></div>
      </div>
      <div className="menu-buttons">
        <button className="primary" onClick={start}><Icon name="play" />{primary.label}</button>
      </div>
      {advice && (
        <aside className="coach-card" role="note" aria-label={t('menu.suggestion')}>
          <Icon name="bulb" />
          <p>{advice.text}</p>
          <button className="primary" onClick={hideAdvice}><Icon name="check" />{t('menu.thanks')}</button>
        </aside>
      )}
      {showChecklist(steps, onboarding) && (
        <section className="first-steps" aria-label={t('menu.firstSteps')}>
          <h3><em><Icon name="checklist" />{t('menu.firstSteps')}</em><span>{t('menu.stepsDone', { done: steps.filter((s) => s.done).length, total: steps.length })}</span></h3>
          <ul>
            {steps.map((s) => <li key={s.id} className={s.done ? 'done' : undefined}><Icon name={s.done ? 'check' : 'star'} />{s.text}</li>)}
          </ul>
          <button className="primary" onClick={hideChecklist}><Icon name="check" />{t('menu.hide')}</button>
        </section>
      )}
      {next.length > 0 && !showChecklist(steps, onboarding) && (
        <section className="suggested" aria-label={t('menu.suggested')}>
          <h3>{t('menu.suggested')}</h3>
          <ul>
            {next.map((x) => <li key={x.target}><button onClick={go[x.target]}><Icon name={x.icon} />{x.text}</button></li>)}
          </ul>
        </section>
      )}
      <section className="today" aria-label={t('menu.today')}>
        <h3>{t('menu.today')}{summary.streak > 0 && <span className="streak"><Icon name="flame" />{t('menu.dayStreak', { count: summary.streak })}</span>}</h3>
        <div className="today-row">
          <button onClick={onDaily}><Icon name={dailyDone.match ? 'check' : 'sun'} />{t('menu.dailyMatch')}</button>
          <button onClick={onDailyPuzzle}><Icon name={dailyDone.puzzle ? 'check' : 'puzzle'} />{t('menu.dailyPuzzle')}</button>
          <button onClick={onWeekly}><Icon name={dailyDone.weekly ? 'check' : 'cycle'} />{t('menu.weekly')}</button>
        </div>
      </section>
      <div className="mode-cards">
        {cards.map((c) => (
          <button key={c.id} className={`mode-card card-${c.id}${c.wide ? ' wide' : ''}`} onClick={c.onClick}>
            <strong><Icon name={c.icon} />{c.title}</strong>
            {c.info.lines.map((line) => <span key={line}>{line}</span>)}
            {c.info.fraction !== null && <Bar fraction={c.info.fraction} thin />}
          </button>
        ))}
      </div>
      <nav className="utility" aria-label={t('menu.more')}>
        <button onClick={onStats}><Icon name="trophy" /><span>{t('menu.stats')}</span></button>
        <button onClick={onCollection}><Icon name="star" /><span>{t('menu.collection')}</span></button>
        <button onClick={onSettings}><Icon name="gear" /><span>{t('menu.settings')}</span></button>
        <button onClick={onTutorial}><Icon name="book" /><span>{t('menu.howToPlay')}</span></button>
        <button onClick={() => { setMuted(sound); setSound(!sound) }} aria-pressed={sound}>
          <Icon name={sound ? 'speakerOn' : 'speakerOff'} /><span>{t(sound ? 'menu.soundOn' : 'menu.soundOff')}</span>
        </button>
      </nav>
      <TipCard page="menu" />
    </main>
  )
}
