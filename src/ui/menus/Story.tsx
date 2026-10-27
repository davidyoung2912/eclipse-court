import { useSyncExternalStore } from 'react'
import { CHAPTERS, CHARACTERS, actLabel } from '../../engine/data/story'
import { characterState, chapterUnlocked, metCharacters, storySnapshot, subscribeStory } from '../../story'
import { PieceArt } from '../../art/PieceArt'
import { Icon } from './icons'
import { PageArt } from './MenuArt'
import { TipCard } from '../tips/TipCard'

interface Props {
  onOpen: (id: string) => void
  onBack: () => void
}

/** The chapters of the tale of the two courts, opened in order. */
export function Story({ onOpen, onBack }: Props) {
  const story = useSyncExternalStore(subscribeStory, storySnapshot)
  const read = story.read
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
      <p className="tagline">More chapters are still to be told.</p>
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
      <div className="menu-buttons stacked">
        <button onClick={onBack}><Icon name="back" />Back</button>
      </div>
      <TipCard page="story" />
    </main>
  )
}
