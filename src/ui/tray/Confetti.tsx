import { confettiPieces } from '../../rewardFx'

/** A shower of coloured scraps from the result dialog; sized by `count`, which is zero when flashes are reduced. */
export function Confetti({ count }: { count: number }) {
  if (count <= 0) return null
  return (
    <div className="confetti" aria-hidden="true">
      {confettiPieces(count).map((c, i) => (
        <span key={i} style={{ ['--angle' as string]: `${c.angle}deg`, ['--dist' as string]: `${c.dist}px`, ['--spin' as string]: `${c.spin}deg`, background: `hsl(${c.hue} 85% 62%)`, animationDelay: `${c.delay}ms` }} />
      ))}
    </div>
  )
}
