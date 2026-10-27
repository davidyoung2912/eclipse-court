import { useSyncExternalStore } from 'react'
import { CHAPTERS, CHARACTERS, actLabel } from '../../engine/data/story'
import { achievements, availableBonds, bondRead, characterState, chapterUnlocked, endingChapter, metCharacters, replayableChapters, storySnapshot, subscribeStory } from '../../story'
import { PieceArt } from '../../art/PieceArt'
import { Icon } from './icons'
import { PageArt } from './MenuArt'
import { TipCard } from '../tips/TipCard'

interface Props {
  onOpen: (id: string) => void
  /** Opens the choice that ends the story, once its chapter is read. */
  onEnding?: (chapterId: string) => void
  /** Opens a bond scene between two characters. */
  onBond?: (id: string) => void
  /** Plays a read chapter again as a scene, with no battle. */
  onReplay?: (id: string) => void
  onBack: () => void
}

/** The chapters of the tale of the two courts, opened in order. */
export function Story({ onOpen, onEnding, onBond, onReplay, onBack }: Props) {
  const story = useSyncExternalStore(subscribeStory, storySnapshot)
  const read = story.read
  const ending = endingChapter()
  const bonds = availableBonds(story)
  const replays = replayableChapters(story)
  const medals = achievements(story)
  const company = metCharacters(story).filter((id) => CHARACTERS[id].portrait)
  return (
    <main className="app menu">
      <PageArt icon="book" />
      <h2>Story</h2>
      <p className="tagline">How the Hour stopped, and the courts that came of it.</p>
      <div className="choices">
        {CHAPTERS.map((c, i) => {
          const open = chapterUnlocked(i, read)
          const done = read.has(c.id)
          return (
            <button key={c.id} className={`choice${done ? ' won' : ''}`} disabled={!open} onClick={() => onOpen(c.id)}>
              <strong><Icon name={done ? 'check' : open ? 'book' : 'lock'} />{actLabel(c.act)} · {c.title}</strong>
              <span>{open ? c.blurb : 'Read the chapter before this one to open it.'}</span>
            </button>
          )
        })}
      </div>
      {ending && read.has(ending.id) && (
        <div className="menu-buttons stacked">
          <button className="primary" onClick={() => onEnding?.(ending.id)}>
            <Icon name="book" />{story.ending ? `Ending: ${ending.ending!.options.find((o) => o.id === story.ending)?.label}` : 'Choose who keeps the Hour'}
          </button>
        </div>
      )}
      {!ending && <p className="tagline">More chapters are still to be told.</p>}
      {company.length > 0 && (
        <section className="story-cast" aria-label="Company">
          <h3>Company</h3>
          {company.map((id) => {
            const c = CHARACTERS[id]
            const state = characterState(story, id)
            return (
              <div key={id} className={`story-member ${state}`}>
                <svg viewBox="0 0 100 100" aria-hidden="true"><g transform="translate(50 50) scale(92)"><PieceArt role={c.portrait!.role} court={c.portrait!.court} /></g></svg>
                <span><strong>{c.name}</strong> · {c.title}<small>{c.trait}</small></span>
                <em>{state}</em>
              </div>
            )
          })}
        </section>
      )}
      {bonds.length > 0 && (
        <section className="story-cast" aria-label="Bonds">
          <h3>Bonds</h3>
          {bonds.map((b) => (
            <button key={b.id} className={`choice${bondRead(story, b.id) ? ' won' : ''}`} onClick={() => onBond?.(b.id)}>
              <strong><Icon name={bondRead(story, b.id) ? 'check' : 'book'} />{b.title}</strong>
              <span>{CHARACTERS[b.between[0]].name} and {CHARACTERS[b.between[1]].name}</span>
            </button>
          ))}
        </section>
      )}
      {replays.length > 0 && (
        <section className="story-cast" aria-label="Gallery">
          <h3>Gallery</h3>
          {replays.map((c) => (
            <button key={c.id} onClick={() => onReplay?.(c.id)}><Icon name="book" />Replay: {c.title}</button>
          ))}
        </section>
      )}
      <section className="story-cast" aria-label="Achievements">
        <h3>Achievements · {medals.filter((m) => m.earned).length} of {medals.length}</h3>
        {medals.map((m) => (
          <div key={m.id} className={`story-member${m.earned ? '' : ' fallen'}`}>
            <span><strong>{m.title}</strong><small>{m.text}</small></span>
            <em>{m.earned ? 'earned' : 'locked'}</em>
          </div>
        ))}
      </section>
      <div className="menu-buttons stacked">
        <button onClick={onBack}><Icon name="back" />Back</button>
      </div>
      <TipCard page="story" />
    </main>
  )
}
