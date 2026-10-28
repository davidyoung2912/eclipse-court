/** Rays and sparks that fly out of the result dialog on a win; hidden when motion is reduced. */
const SPARKS = 18

export function WinBurst() {
  return (
    <div className="win-burst" aria-hidden="true">
      <span className="win-halo" />
      {Array.from({ length: SPARKS }, (_, i) => (
        <span key={i} className="win-spark" style={{ ['--angle' as string]: `${(360 / SPARKS) * i}deg`, ['--dist' as string]: `${90 + (i % 3) * 38}px`, animationDelay: `${(i % 4) * 60}ms` }} />
      ))}
    </div>
  )
}
