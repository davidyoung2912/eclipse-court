import { useEffect, useState } from 'react'
import { PieceArt } from '../../art/PieceArt'
import { PALETTE, WEDGES } from '../../art/pieceGeometry'
import { CAPTURE_FX, rarityOf, RARITY_LABELS, type Cosmetic } from '../../engine/data/cosmetics'
import { themeById } from '../../settings'
import { sfx, unlockAudio } from '../../audio/synth'
import { lumColor } from '../board/lumColor'

const LUMS = [[-2, -1, 0, 1], [-1, 0, 1, 2], [0, 1, 2, 1], [1, 2, 1, 0]]

/** A small board to show a board effect on; the real stylesheet rules apply through `data-board`. */
function MiniBoard() {
  return (
    <svg className="board show-board" viewBox="0 0 4 4" aria-hidden="true">
      {LUMS.flatMap((row, y) => row.map((lum, x) => (
        <g key={`${x}-${y}`}>
          <rect x={x} y={y} width={1} height={1} className="sq cycling" style={{ fill: lumColor(lum) }} />
          {lum !== 0 && <circle cx={x + 0.5} cy={y + 0.5} r={0.5} fill={lum > 0 ? 'rgba(255, 220, 140, 0.7)' : 'rgba(120, 90, 220, 0.7)'} opacity={Math.abs(lum) / 2} className="glow" />}
        </g>
      )))}
    </svg>
  )
}

/** One piece falling in the equipped effect's style, replayed on a loop. */
function Fall({ id, round }: { id: string; round: number }) {
  const fx = CAPTURE_FX[id] ?? CAPTURE_FX.fade
  return (
    <svg className="show-fall" viewBox="-0.9 -0.7 1.8 1.4" aria-hidden="true">
      <g key={round} className="fall" style={{ color: fx.colour }}>
        <g className="art art-umbral">
          {WEDGES.map((d, i) => {
            const a = ((i + 0.5) / WEDGES.length) * Math.PI * 2
            const dist = 0.25 + fx.reach * 0.35
            return (
              <path key={i} d={d} className={`pane pane-${i % 3} shard`}
                style={{ ['--dx' as string]: `${(Math.cos(a) * dist).toFixed(3)}px`, ['--dy' as string]: `${(Math.sin(a) * dist).toFixed(3)}px`, ['--spin' as string]: `${(i % 2 ? 1 : -1) * (30 + i * 9)}deg`, fill: PALETTE.umbral.panes[i % 3] }} />
            )
          })}
        </g>
        {Array.from({ length: fx.parts }, (_, i) => (
          <line key={i} className="fall-part" x1={0.1} x2={0.26} style={{ transform: `rotate(${(360 / fx.parts) * i}deg)`, ['--reach' as string]: `${fx.reach}` }} />
        ))}
      </g>
    </svg>
  )
}

/** The stage above the Collection list: shows the picked cosmetic working before it is bought. */
export function Showcase({ cosmetic }: { cosmetic: Cosmetic }) {
  const [round, setRound] = useState(0)
  const rarity = rarityOf(cosmetic)
  const { kind, id } = cosmetic
  const replay = () => {
    setRound((r) => r + 1)
    if (kind === 'sound') {
      unlockAudio()
      sfx.hit(2)
    }
  }
  useEffect(() => {
    if (kind !== 'capture') return
    const timer = setInterval(() => setRound((r) => r + 1), 1800)
    return () => clearInterval(timer)
  }, [kind, id])
  const attrs = { 'data-pieces': kind === 'pieces' ? id : undefined, 'data-board': kind === 'board' ? id : undefined, 'data-codex': kind === 'codex' ? id : undefined }
  const style = kind === 'theme' ? (themeById(id).vars as React.CSSProperties) : undefined
  return (
    <section className={`cstage rarity-${rarity}`} data-rarity={rarity} style={style} aria-label={`Preview of ${cosmetic.name}`} {...attrs}>
      <div className="cstage-view" key={`${kind}-${id}`}>
        {kind === 'board' && <MiniBoard />}
        {kind === 'capture' && <Fall id={id} round={round} />}
        {(kind === 'pieces' || kind === 'theme') && (
          <svg className="show-pieces" viewBox="-0.45 -0.45 3.9 0.9" aria-hidden="true">
            {(['leader', 'bruiser', 'flier', 'charger'] as const).map((role, i) => (
              <g key={role} transform={`translate(${i}, 0)`}><PieceArt role={role} court={i % 2 ? 'umbral' : 'solari'} /></g>
            ))}
          </svg>
        )}
        {kind === 'codex' && <div className="story-stage show-codex"><svg viewBox="-0.45 -0.45 0.9 0.9" aria-hidden="true"><PieceArt role="leader" court="solari" /></svg></div>}
        {kind === 'sound' && <button className="show-play" onClick={replay}>Play sound</button>}
      </div>
      <p className="cstage-name"><span className="rarity-tag">{RARITY_LABELS[rarity]}</span> {cosmetic.name}</p>
      {kind === 'capture' && <button className="show-play" onClick={replay}>Replay</button>}
    </section>
  )
}
