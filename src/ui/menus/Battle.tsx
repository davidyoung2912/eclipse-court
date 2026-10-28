import { Icon } from './icons'
import { PageArt } from './MenuArt'
import { TipCard } from '../tips/TipCard'
import { BackButton } from './BackButton'

interface Props {
  onSkirmish: () => void
  onPractice: () => void
  onPaste: () => void
  onOnline: () => void
  onLadder: () => void
  onBack: () => void
}

/** The ways to fight a one-off match: against the AI or a friend, in a sandbox, or from a shared code. */
export function Battle({ onSkirmish, onPractice, onPaste, onOnline, onLadder, onBack }: Props) {
  return (
    <main className="app menu">
      <PageArt icon="swords" />
      <h2>Battle</h2>
      <p className="tagline">One-off matches, no campaign attached.</p>
      <div className="choices">
        <button className="choice" onClick={onSkirmish}>
          <strong><Icon name="clash" />Skirmish</strong>
          <span>Set up a match against the AI or a friend: board, rules, presets and Blitz.</span>
        </button>
        <button className="choice" onClick={onLadder}>
          <strong><Icon name="trophy" />Ranked Ladder</strong>
          <span>Earn a rating against the AI personas and climb the ranks.</span>
        </button>
        <button className="choice" onClick={onOnline}>
          <strong><Icon name="chain" />Play Online</strong>
          <span>Host or join a live match with a friend on another device.</span>
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
        <BackButton onClick={onBack} />
      </div>
      <TipCard page="battle" />
    </main>
  )
}
