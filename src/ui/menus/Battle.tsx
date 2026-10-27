import { Icon } from './icons'
import { PageArt } from './MenuArt'

interface Props {
  onSkirmish: () => void
  onPractice: () => void
  onPaste: () => void
  onBack: () => void
}

/** The ways to fight a one-off match: against the AI or a friend, in a sandbox, or from a shared code. */
export function Battle({ onSkirmish, onPractice, onPaste, onBack }: Props) {
  return (
    <main className="app menu">
      <PageArt icon="swords" />
      <h2>Battle</h2>
      <p className="tagline">One-off matches, no campaign attached.</p>
      <div className="choices">
        <button className="choice" onClick={onSkirmish}>
          <strong><Icon name="swords" />Skirmish</strong>
          <span>Set up a match against the AI or a friend: board, rules, presets and Blitz.</span>
        </button>
        <button className="choice" onClick={onPractice}>
          <strong><Icon name="target" />Practice</strong>
          <span>Try a duel on its own to learn how pieces and spells fight.</span>
        </button>
        <button className="choice" onClick={onPaste}>
          <strong><Icon name="chain" />Paste Code</strong>
          <span>Open a challenge or replay someone sent you.</span>
        </button>
      </div>
      <div className="menu-buttons stacked">
        <button onClick={onBack}><Icon name="back" />Back</button>
      </div>
    </main>
  )
}
