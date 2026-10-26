interface Props {
  onSkirmish: () => void
  onCampaign: () => void
}

export function MainMenu({ onSkirmish, onCampaign }: Props) {
  return (
    <main className="app menu">
      <h1>Eclipse Court</h1>
      <p className="tagline">Light and dark trade places. Every capture is a duel.</p>
      <div className="menu-buttons">
        <button className="primary" onClick={onSkirmish}>Skirmish</button>
        <button onClick={onCampaign}>Campaign</button>
      </div>
    </main>
  )
}
