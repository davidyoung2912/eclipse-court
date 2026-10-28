import { rtcSupported } from '../../net/rtc'
import { Icon } from './icons'
import { PageArt } from './MenuArt'
import { TipCard } from '../tips/TipCard'
import { BackButton } from './BackButton'

interface Props {
  onHost: () => void
  onJoin: () => void
  onBack: () => void
}

/** Two players, two devices: one hosts a match, the other joins it. */
export function Online({ onHost, onJoin, onBack }: Props) {
  const supported = rtcSupported()
  return (
    <main className="app menu battle-menu">
      <PageArt icon="chain" />
      <h2>Play Online</h2>
      <p className="tagline">Connect straight to a friend, with no account and no game server.</p>
      {!supported && <p role="alert">This browser cannot make direct connections, so online play is not available here.</p>}
      <div className="choices">
        <button className="choice" disabled={!supported} onClick={onHost}>
          <strong><Icon name="swords" />Host a Game</strong>
          <span>Set up the match, then send your friend a link or code.</span>
        </button>
        <button className="choice" disabled={!supported} onClick={onJoin}>
          <strong><Icon name="chain" />Join a Game</strong>
          <span>Paste the link or code your friend sent you.</span>
        </button>
      </div>
      <div className="menu-buttons stacked">
        <BackButton onClick={onBack} />
      </div>
      <TipCard page="online" />
    </main>
  )
}
