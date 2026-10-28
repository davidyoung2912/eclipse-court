import { useEffect, useState } from 'react'
import { Portrait } from '../../art/Portrait'
import { characterPortrait } from '../../art/portraits'
import { CHARACTERS, actLabel, type Beat, type Chapter } from '../../engine/data/story'
import { Icon } from '../menus/icons'
import { StoryScene } from './StoryScene'
import { TipCard } from '../tips/TipCard'

interface Props {
  chapter: Chapter
  /** The beats to read, when not the chapter's own (its victory or defeat scene). */
  beats?: readonly Beat[]
  /** The last beat's button reads this instead of Finish, when a fight follows. */
  finishLabel?: string
  /** Called once the last beat is passed, or the chapter is skipped. */
  onDone: () => void
  /** Leaves without marking the chapter read. */
  onBack: () => void
}

/** One chapter, a beat at a time: tap, Enter or the arrow keys move through it. */
export function StoryReader({ chapter, beats = chapter.beats, finishLabel, onDone, onBack }: Props) {
  const [index, setIndex] = useState(0)
  const last = index === beats.length - 1
  const beat = beats[index]
  const speaker = beat.kind === 'say' ? CHARACTERS[beat.who] : null

  const forward = () => (last ? onDone() : setIndex(index + 1))
  const backward = () => setIndex(Math.max(0, index - 1))

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        forward()
      } else if (e.key === 'ArrowLeft') backward()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  return (
    <main className={`app menu story-menu story-reader${speaker?.portrait ? ` court-${speaker.portrait.court}` : ''}`}>
      <p className="story-act">{actLabel(chapter.act)} · {chapter.title}</p>
      <div className="story-stage" onClick={forward} role="button" tabIndex={-1} aria-label="Next">
        <StoryScene court={speaker?.portrait?.court ?? null} act={chapter.act} />
        {speaker ? (
          <div className="story-beat" key={index}>
            <div className="story-portrait" aria-hidden="true">
              <Portrait id={characterPortrait(speaker.id)} />
            </div>
            <h3 className="story-name">{speaker.name}<small>{speaker.title}</small></h3>
            <p className="story-line story-say">&ldquo;{beat.text}&rdquo;</p>
          </div>
        ) : (
          <div className="story-beat" key={index}>
            <span className="story-rule" aria-hidden="true" />
            <p className="story-line story-narrate">{beat.text}</p>
            <span className="story-rule" aria-hidden="true" />
          </div>
        )}
      </div>
      <div className="story-progress" role="progressbar" aria-valuemin={1} aria-valuemax={beats.length} aria-valuenow={index + 1}>
        <i style={{ width: `${((index + 1) / beats.length) * 100}%` }} />
      </div>
      <div className="menu-buttons">
        <button onClick={backward} disabled={index === 0}><Icon name="pageBack" />Previous</button>
        <button className="primary" onClick={forward}>{last ? <><Icon name="check" />{finishLabel ?? 'Finish'}</> : <><Icon name="pageNext" />Next</>}</button>
      </div>
      <div className="menu-buttons">
        <button onClick={onDone}><Icon name="skip" />Skip</button>
        <button className="back" onClick={onBack}><Icon name="exit" />Back</button>
      </div>
      <TipCard page="story-reader" />
    </main>
  )
}
