import { useState } from 'react'
import { parseShared, type Shared } from '../../share'
import { Icon } from './icons'

interface Props {
  onOpen: (shared: Shared) => void
  onBack: () => void
}

/** For people who cannot open links: paste a challenge or replay link, or just its code. */
export function PasteCode({ onOpen, onBack }: Props) {
  const [text, setText] = useState('')
  const [error, setError] = useState(false)
  return (
    <main className="app menu">
      <h2>Paste a code</h2>
      <p className="tagline">Paste a challenge or replay link, or the code after the # sign.</p>
      <textarea className="code-box" rows={5} value={text} spellCheck={false} aria-label="Link or code"
        onChange={(e) => { setText(e.target.value); setError(false) }} />
      {error && <p role="alert">That is not a valid code for this version of the game.</p>}
      <div className="menu-buttons stacked">
        <button className="primary" disabled={!text.trim()} onClick={() => {
          const shared = parseShared(text)
          if (shared) onOpen(shared)
          else setError(true)
        }}><Icon name="play" />Open</button>
        <button onClick={onBack}><Icon name="back" />Back</button>
      </div>
    </main>
  )
}
