import { Quests } from './Quests'
import { useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react'
import { isMuted, setMuted } from '../../audio/synth'
import { SoundPrompt } from './SoundPrompt'
import { Icon, type IconName } from './icons'
import { PieceArt } from '../../art/PieceArt'
import { Satellite, Shooter, Ufo } from './MenuArt'
import type { Progress } from '../../progress'
import { dailySeed } from '../../engine/data/setups'
import { Bar } from './Bar'
import { TipCard } from '../tips/TipCard'
import { cardSummaries, nextUpSlot, primaryAction, suggestions, type CardInfo, type SuggestionTarget } from './menuModel'
import { adviceFor, checklist, hideAdvice, hideChecklist, onboardingSnapshot, showChecklist, subscribeOnboarding } from '../../onboarding'
import { storySnapshot, subscribeStory } from '../../story'
import { t } from '../../i18n'
import { getSettings } from '../../settings'
import { PersonaFace } from '../../art/PersonaFace'
import { personaOfTheDay, recordLine } from '../../personaMenu'
import { heroReaction, nextRun, type HeroTarget } from './heroTouch'
import { sfx } from '../../audio/synth'

interface Props {
  progress: Progress
  onSkirmish: () => void
  onBattle: () => void
  onCampaign: () => void
  onStory: () => void
  onGauntlet: () => void
  onTutorial: () => void
  onStats: () => void
  onGoals: () => void
  onSeason: () => void
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

/** Corona rays: every other one long, each with its own reach and brightness so the corona looks uneven rather than stamped. */
const RAYS = Array.from({ length: 24 }, (_, i) => {
  const long = i % 2 === 0
  return { a: i * 15, tip: (long ? 98 : 78) + ((i * 7) % 5) * (long ? 4 : 3), o: (long ? 0.62 : 0.32) + (((i * 5) % 4) - 1.5) * 0.08 }
})

/** A second, finer layer of faint stars behind the twinkling ones, for depth. */
const DUST = Array.from({ length: 60 }, (_, i) => ({
  x: (i * 29.3 + (i % 3) * 17) % 320,
  y: (i * 41.7 + (i % 7) * 13) % 250,
  r: 0.3 + (i % 3) * 0.12,
  o: 0.18 + (i % 5) * 0.05,
}))

/** An eclipse over the two courts' Leaders: the sun with a moon sliding across it. */
function Hero() {
  const [poke, setPoke] = useState<{ target: HeroTarget; leader: 'solari' | 'umbral'; n: number; big: boolean } | null>(null)
  const last = useRef({ run: 0, at: 0 })
  const tap = (target: HeroTarget) => () => {
    if (document.documentElement.dataset.motion === 'reduced' || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    const now = performance.now()
    const run = nextRun(last.current.run, now - last.current.at)
    last.current = { run, at: now }
    const { leader, big } = heroReaction(target, run)
    setPoke((p) => ({ target, leader, n: (p?.n ?? 0) + 1, big }))
    sfx.select()
    if (big) sfx.cast()
  }
  const hit = (target: HeroTarget) => (poke?.target === target ? `poke${poke.big ? ' poke-big' : ''}` : undefined)
  const answer = (leader: 'solari' | 'umbral') => (poke?.leader === leader ? 'hero-leader answer' : 'hero-leader')
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
        <radialGradient id="hero-earthshine" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0.8" stopColor="#9a7cf0" stopOpacity="0" />
          <stop offset="1" stopColor="#9a7cf0" stopOpacity="0.3" />
        </radialGradient>
        <radialGradient id="hero-neb">
          <stop offset="0" stopColor="#7a5cc8" stopOpacity="0.32" />
          <stop offset="1" stopColor="#7a5cc8" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="hero-halo-solari">
          <stop offset="0" stopColor="#ffd77a" stopOpacity="0.5" />
          <stop offset="1" stopColor="#e8943a" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="hero-halo-umbral">
          <stop offset="0" stopColor="#9a7cf0" stopOpacity="0.55" />
          <stop offset="1" stopColor="#4a3a96" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="hero-floor">
          <stop offset="0" stopColor="#ffd77a" stopOpacity="0.2" />
          <stop offset="0.6" stopColor="#7a5cc8" stopOpacity="0.12" />
          <stop offset="1" stopColor="#7a5cc8" stopOpacity="0" />
        </radialGradient>
      </defs>
      <g className="hero-late">
        <ellipse cx="160" cy="105" rx="190" ry="120" fill="url(#hero-neb)" />
        <ellipse cx="160" cy="262" rx="190" ry="46" fill="url(#hero-floor)" />
        {DUST.map((d, i) => <circle key={`d${i}`} cx={d.x} cy={d.y} r={d.r} fill="#fbf1d4" opacity={d.o} />)}
        {STARS.map((s, i) => (
          <circle key={i} className="star" cx={s.x} cy={s.y} r={s.r} style={{ animationDelay: `${s.delay}s` }} />
        ))}
        <Shooter first={2} />
        <Shooter first={7} />
        <Satellite />
        <Ufo />
      </g>
      <g transform="translate(160 110) scale(0.9)" className="hero-core">
        <g className="art-dim hero-dim">
          <circle r="112" fill="url(#hero-corona)" className="corona" />
          <g className="rays">
            {RAYS.map((r) => (
              <path key={r.a} d={`M-3,-62L0,-${r.tip}L3,-62Z`} transform={`rotate(${r.a})`} className="ray" style={{ opacity: r.o }} />
            ))}
          </g>
        </g>
        <g key={`s${poke?.target === 'sun' ? poke.n : 0}`} className={`hero-sun-nudge ${hit('sun') ?? ''}`} onClick={tap('sun')}>
          <circle r="56" fill="url(#hero-sun)" />
        </g>
        <g className="moon art-moon-slide hero-moon" style={{ ['--reach' as string]: '94px' }} onClick={tap('moon')}>
        <g key={`m${poke?.target === 'moon' ? poke.n : 0}`} className={`hero-moon-nudge ${hit('moon') ?? ''}`}>
          <circle r="54" fill="url(#hero-moon)" />
          <circle r="54" fill="url(#hero-earthshine)" />
          <circle cx="-18" cy="-14" r="7" fill="#000" opacity="0.18" />
          <circle cx="14" cy="-24" r="4.5" fill="#000" opacity="0.16" />
          <circle cx="20" cy="12" r="9" fill="#000" opacity="0.14" />
          <circle cx="-8" cy="24" r="5" fill="#000" opacity="0.16" />
          <circle cx="-28" cy="12" r="3.5" fill="#000" opacity="0.14" />
          <circle r="54" fill="none" stroke="#9a7cf0" strokeWidth="1" opacity="0.35" />
        </g>
        </g>
      </g>
      <g className="hero-late">
        <circle cx="56" cy="200" r="84" fill="url(#hero-halo-solari)" className="hero-halo" />
        <circle cx="264" cy="200" r="84" fill="url(#hero-halo-umbral)" className="hero-halo hero-halo-late" />
        <g transform="translate(56 200)"><g key={`a${poke?.target === 'sun' ? poke.n : 0}`} className={answer('solari')}><g transform="scale(104)"><PieceArt role="leader" court="solari" /></g></g></g>
        <g transform="translate(264 200)"><g key={`b${poke?.target === 'moon' ? poke.n : 0}`} className={answer('umbral')}><g transform="scale(104)"><PieceArt role="leader" court="umbral" /></g></g></g>
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

export function MainMenu({ progress, onSkirmish, onBattle, onCampaign, onStory, onGauntlet, onTutorial, onStats, onGoals, onSeason, onPuzzles, onSettings, onCollection, onDaily, onWeekly, onDailyPuzzle, dailyDone, onResume, firstRun }: Props) {
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
  const seed = dailySeed()
  const greeter = personaOfTheDay(seed)
  const summary = cardSummaries(progress, dailySeed(), storyRead)
  const next = firstRun ? [] : suggestions(progress, dailyDone)
  const slot = nextUpSlot({ advice: !!advice, steps: showChecklist(steps, onboarding), suggestions: next.length > 0, greeting: getSettings().banter !== 'off' })
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
      <div className="menu-side">
      <div ref={brandRef} className="brand">
        <Hero />
        <h1><span>{t('menu.titleLead')}</span> {t('menu.titleTail')}</h1>
        <div className="divider" aria-hidden="true"><i /></div>
      </div>
      <div className="menu-buttons">
        <button className="primary" onClick={start}><Icon name="play" />{primary.label}</button>
      </div>
      </div>
      <div className="menu-main">
      {slot && (
        <aside className="next-up" data-slot={slot} aria-label={t('menu.nextUp')}>
          <PersonaFace id={greeter.id} className="persona-bubble-face" />
          <div className="next-up-body">
            {slot === 'advice' && advice && (
              <>
                <p>{advice.text}</p>
                <button className="primary" onClick={hideAdvice}><Icon name="check" />{t('menu.thanks')}</button>
              </>
            )}
            {slot === 'steps' && (
              <>
                <h3><em><Icon name="checklist" />{t('menu.firstSteps')}</em><span>{t('menu.stepsDone', { done: steps.filter((s) => s.done).length, total: steps.length })}</span></h3>
                <ul className="next-up-steps">
                  {steps.map((s) => <li key={s.id} className={s.done ? 'done' : undefined}><Icon name={s.done ? 'check' : 'star'} />{s.text}</li>)}
                </ul>
                <button className="primary" onClick={hideChecklist}><Icon name="check" />{t('menu.hide')}</button>
              </>
            )}
            {slot === 'suggestion' && (
              <>
                <h3>{t('menu.suggested')}</h3>
                <ul className="next-up-list">
                  {next.map((x) => <li key={x.target}><button onClick={go[x.target]}><Icon name={x.icon} />{x.text}</button></li>)}
                  <li><button onClick={onGoals}><Icon name="star" />{t('menu.goals')}</button></li>
                </ul>
              </>
            )}
            {slot === 'greeting' && <p><b>{greeter.name}</b>{recordLine(greeter.id, 'greet', String(seed))}</p>}
          </div>
        </aside>
      )}
      <section className="today" aria-label={t('menu.today')}>
        <h3>{t('menu.today')}{summary.streak > 0 && <span className="streak"><Icon name="flame" />{t('menu.dayStreak', { count: summary.streak })}</span>}</h3>
        <div className="today-row">
          <button onClick={onDaily}><Icon name={dailyDone.match ? 'check' : 'sun'} />{t('menu.dailyMatch')}</button>
          <button onClick={onDailyPuzzle}><Icon name={dailyDone.puzzle ? 'check' : 'puzzle'} />{t('menu.dailyPuzzle')}</button>
          <button onClick={onWeekly}><Icon name={dailyDone.weekly ? 'check' : 'cycle'} />{t('menu.weekly')}</button>
          <button onClick={onSeason}><Icon name="star" />{t('menu.season')}</button>
        </div>
        <Quests />
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
      </div>
      <SoundPrompt onAnswer={setSound} />
      <TipCard page="menu" float />
    </main>
  )
}
