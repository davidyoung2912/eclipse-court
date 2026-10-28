import { COURT_RANKS, type CourtRank } from '../../progression'

/** A shield crest whose rim, points and eclipse disc fill in as the Court rank climbs. */
export function RankCrest({ rank }: { rank: CourtRank }) {
  const top = COURT_RANKS.length - 1
  return (
    <div className={`rank-crest tier-${rank.tier}`} role="img"
      aria-label={`Court rank ${rank.name}, ${rank.toNext === null ? 'the highest' : `${rank.toNext} levels to the next`}`}>
      <svg viewBox="0 0 100 120" aria-hidden="true">
        <path className="crest-shield" d="M50 6l38 14v34c0 28-17 46-38 58C29 100 12 82 12 54V20z" />
        {rank.tier >= 2 && <path className="crest-inner" d="M50 14l30 11v29c0 22-13 37-30 46C33 91 20 76 20 54V25z" />}
        <circle className="crest-sun" cx="50" cy="52" r="18" />
        <circle className="crest-moon" cx={50 + 14 - (rank.tier / top) * 14} cy="52" r="16" />
        {Array.from({ length: rank.tier }, (_, i) => (
          <path key={i} className="crest-pip" transform={`translate(${50 + (i - (rank.tier - 1) / 2) * 13} 90)`} d="M0-5l1.6 3.4L5 0 1.6 1.6 0 5-1.6 1.6-5 0l3.4-1.6z" />
        ))}
      </svg>
      <strong>{rank.name}</strong>
      <small>{rank.toNext === null ? 'Highest rank' : `${rank.toNext} mastery ${rank.toNext === 1 ? 'level' : 'levels'} to the next rank`}</small>
    </div>
  )
}
