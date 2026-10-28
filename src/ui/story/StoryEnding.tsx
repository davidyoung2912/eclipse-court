import type { EndingChoice, EndingId } from '../../engine/data/story'
import { cleanVictory, type StoryState } from '../../story'
import { Icon } from '../menus/icons'
import { BackButton } from '../menus/BackButton'
import { TipCard } from '../tips/TipCard'

interface Props {
  choice: EndingChoice
  story: StoryState
  /** The chapter whose battle this choice follows. */
  chapterId: string
  onChoose: (id: EndingId) => void
  onBack: () => void
}

/** Who keeps the Hour: one button per ending, the ending already chosen marked and any that need a clean victory locked until earned. */
export function StoryEnding({ choice, story, chapterId, onChoose, onBack }: Props) {
  return (
    <main className="app menu story-menu">
      <h2>Who keeps the Hour?</h2>
      <p className="tagline">{choice.prompt}</p>
      <div className="choices">
        {choice.options.map((o) => {
          const open = o.requires !== 'clean' || cleanVictory(story, chapterId)
          const chosen = story.ending === o.id
          return (
            <button key={o.id} className={`choice${chosen ? ' won' : ''}`} disabled={!open} onClick={() => onChoose(o.id)}>
              <strong><Icon name={chosen ? 'check' : open ? 'book' : 'lock'} />{o.label}</strong>
              <span>{open ? o.blurb : 'Win the Eclipse Queen without losing to her first.'}</span>
            </button>
          )
        })}
      </div>
      <div className="menu-buttons stacked">
        <BackButton onClick={onBack} label="Decide later" />
      </div>
      <TipCard page="story-ending" />
    </main>
  )
}
