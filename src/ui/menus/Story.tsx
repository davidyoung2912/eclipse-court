import { useSyncExternalStore } from 'react'
import { CHAPTERS, CHARACTERS, actLabel, type EndingId } from '../../engine/data/story'
import { ACHIEVEMENT_GROUPS, achievements, availableBonds, availableEpilogues, bondRead, epilogueRead, characterState, chapterUnlocked, endingChapter, metCharacters, resetStory, storySnapshot, subscribeStory } from '../../story'
import { Portrait } from '../../art/Portrait'
import { characterPortrait } from '../../art/portraits'
import { Icon } from './icons'
import { PageArt } from './MenuArt'
import { TipCard } from '../tips/TipCard'
import { BackButton } from './BackButton'
import { ResetButton } from './ResetButton'
import { t } from '../../i18n'

interface Props {
  onOpen: (id: string) => void
  /** Opens the choice that ends the story, once its chapter is read. */
  onEnding?: (chapterId: string) => void
  /** Opens a bond scene between two characters. */
  onBond?: (id: string) => void
  /** Opens the epilogue of a chosen ending. */
  onAfterword?: (chapterId: string, ending: EndingId) => void
  onBack: () => void
}

/** The chapters of the tale of the two courts, opened in order. */
export function Story({ onOpen, onEnding, onBond, onAfterword, onBack }: Props) {
  const story = useSyncExternalStore(subscribeStory, storySnapshot)
  const read = story.read
  const ending = endingChapter()
  const bonds = availableBonds(story)
  const afterwords = availableEpilogues(story)
  const medals = achievements(story)
  const company = metCharacters(story).filter((id) => CHARACTERS[id].portrait)
  const chapterButton = ({ c, i }: { c: (typeof CHAPTERS)[number]; i: number }) => {
    const open = chapterUnlocked(i, read)
    const done = read.has(c.id)
    return (
      <button key={c.id} className={`choice${done ? ' won' : ''}`} disabled={!open} onClick={() => onOpen(c.id)}>
        <strong><Icon name={done ? 'check' : open ? 'book' : 'lock'} />{c.act === 'prologue' ? `${actLabel(c.act)} · ` : ''}{c.title}</strong>
        <span>{open ? c.blurb : t('story.locked')}</span>
      </button>
    )
  }
  /** Once the prologue is read, the act of the next chapter still to read opens by itself. */
  const next = CHAPTERS.find((c, i) => c.act !== 'prologue' && !read.has(c.id) && chapterUnlocked(i, read))
  const underway = read.size > 0
  const current = underway ? next?.act : undefined
  const untouched = read.size === 0 && Object.keys(story.characters).length === 0 && Object.keys(story.losses).length === 0 && !story.ending
  const prologue = CHAPTERS.map((c, i) => ({ c, i })).filter(({ c }) => c.act === 'prologue')
  return (
    <main className="app menu story-menu">
      <PageArt icon="book" />
      <h2>{t('story.title')}</h2>
      <p className="tagline">{t('story.tagline')}</p>
      {prologue.length > 0 && <div className="choices">{prologue.map(chapterButton)}</div>}
      {([1, 2, 3] as const).map((act) => {
        const list = CHAPTERS.map((c, i) => ({ c, i })).filter(({ c }) => c.act === act)
        if (list.length === 0) return null
        const finished = list.filter(({ c }) => read.has(c.id)).length
        return (
          <details key={act} className="tier-fold" open={act === current}>
            <summary><h3>{actLabel(act)} ({finished}/{list.length})</h3></summary>
            <div className="choices">{list.map(chapterButton)}</div>
          </details>
        )
      })}
      {ending && read.has(ending.id) && (
        <div className="menu-buttons stacked">
          <button className="primary" onClick={() => onEnding?.(ending.id)}>
            <Icon name="book" />{story.ending ? t('story.ending', { label: ending.ending!.options.find((o) => o.id === story.ending)?.label ?? '' }) : t('story.chooseEnding')}
          </button>
        </div>
      )}
      {afterwords.length > 0 && (
        <section className="story-cast" aria-label={t('story.epilogues')}>
          <h3>{t('story.epilogues')}</h3>
          {afterwords.map(({ chapterId, option }) => (
            <button key={option.id} className={`choice${epilogueRead(story, option.id) ? ' won' : ''}`} onClick={() => onAfterword?.(chapterId, option.id)}>
              <strong><Icon name={epilogueRead(story, option.id) ? 'check' : 'book'} />{option.epilogue.title}</strong>
              <span>{option.epilogue.blurb}</span>
            </button>
          ))}
        </section>
      )}
      {!ending && <p className="tagline">{t('story.more')}</p>}
      {company.length > 0 && (
        <section className="story-cast" aria-label={t('story.company')}>
          <h3>{t('story.company')}</h3>
          {company.map((id) => {
            const c = CHARACTERS[id]
            const state = characterState(story, id)
            return (
              <div key={id} className={`story-member ${state}`}>
                <Portrait id={characterPortrait(id)} />
                <span><strong>{c.name}</strong> · {c.title}<small>{c.trait}</small></span>
                <em>{state}</em>
              </div>
            )
          })}
        </section>
      )}
      {bonds.length > 0 && (
        <section className="story-cast" aria-label={t('story.bonds')}>
          <h3>{t('story.bonds')}</h3>
          {bonds.map((b) => (
            <button key={b.id} className={`choice${bondRead(story, b.id) ? ' won' : ''}`} onClick={() => onBond?.(b.id)}>
              <strong><Icon name={bondRead(story, b.id) ? 'check' : 'book'} />{b.title}</strong>
              <span>{t('story.bondPair', { a: CHARACTERS[b.between[0]].name, b: CHARACTERS[b.between[1]].name })}</span>
            </button>
          ))}
        </section>
      )}
      <section className="story-cast" aria-label={t('story.achievements')}>
        <h3>{t('story.achievementsCount', { earned: medals.filter((m) => m.earned).length, total: medals.length })}</h3>
        {ACHIEVEMENT_GROUPS.map((group) => {
          const list = medals.filter((m) => m.group === group)
          return (
            <details key={group} className="tier-fold">
              <summary><h3>{group} ({list.filter((m) => m.earned).length}/{list.length})</h3></summary>
              {list.map((m) => (
                <div key={m.id} className={`story-member${m.earned ? '' : ' fallen'}`}>
                  <span><strong>{m.title}</strong><small>{m.text}</small></span>
                  <em>{t(m.earned ? 'story.earned' : 'story.lockedBadge')}</em>
                </div>
              ))}
            </details>
          )
        })}
      </section>
      <div className="menu-buttons stacked">
        <ResetButton label={t('story.reset')} disabled={untouched} warning={t('story.resetWarning')} onReset={resetStory} />
        <BackButton onClick={onBack} />
      </div>
      <TipCard page={['story', 'story-acts']} />
    </main>
  )
}
