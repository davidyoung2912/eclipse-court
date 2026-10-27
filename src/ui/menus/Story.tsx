import { useSyncExternalStore } from 'react'
import { CHAPTERS, actLabel } from '../../engine/data/story'
import { chapterUnlocked, storySnapshot, subscribeStory } from '../../story'
import { Icon } from './icons'
import { PageArt } from './MenuArt'
import { TipCard } from '../tips/TipCard'

interface Props {
  onOpen: (id: string) => void
  onBack: () => void
}

/** The chapters of the tale of the two courts, opened in order. */
export function Story({ onOpen, onBack }: Props) {
  const read = useSyncExternalStore(subscribeStory, storySnapshot)
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
      <div className="menu-buttons stacked">
        <button onClick={onBack}><Icon name="back" />Back</button>
      </div>
      <TipCard page="story" />
    </main>
  )
}
