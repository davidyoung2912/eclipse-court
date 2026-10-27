/// <reference types="node" />
import { PUZZLES } from '../engine/data/puzzles'
import { reduce } from '../engine/reducer'
import { squareLuminance } from '../engine/rules/luminance'
import { ROLE_NAMES } from '../engine/data/roster'
import type { Puzzle } from '../engine/data/puzzles'
import { rivalReply } from '../engine/data/puzzles/solver'
import { actionCode } from '../engine/data/puzzles/solver'

const LETTER = { footsoldier: 'F', flier: 'W', marksman: 'M', bruiser: 'B', charger: 'C', aura: 'A', leader: 'L' } as const
const ids = process.argv.slice(2)
const all: Puzzle[] = [...PUZZLES]
for (const p of all) {
  if (ids.length && !ids.includes(p.id)) continue
  const s = p.build()
  console.log(`\n=== ${p.id} (${p.tier}, limit ${p.limit}, spells ${s.spells.solari.join(',') || '-'}${s.spells.umbral.length ? `, umbral ${s.spells.umbral.join(',')}` : ''}${s.lastCast.umbral ? `, foe last cast ${s.lastCast.umbral}` : ''}${p.rivalMatters ? ', rival matters' : ''}${s.config.mode ? ', mode ' + s.config.mode : ''})`)
  if (s.captured.length) console.log('fallen:', s.captured.map((c) => c.role).join(','))
  for (let y = 0; y < 7; y++) {
    let row = ''
    for (let x = 0; x < 7; x++) {
      const pc = s.pieces.find((q) => q.pos.x === x && q.pos.y === y)
      const beacon = s.config.beacons.some((b) => b.x === x && b.y === y)
      const ch = pc ? (pc.court === 'solari' ? LETTER[pc.role] : LETTER[pc.role].toLowerCase()) : '.'
      row += beacon ? `[${ch}]` : ` ${ch} `
    }
    console.log(row + '   y=' + y)
  }
  console.log(s.pieces.filter((q) => q.hp < q.maxHp || q.role === 'leader' && q.hp < 7).map((q) => `${q.court[0]}${LETTER[q.role]}@${q.pos.x},${q.pos.y} hp${q.hp}`).join(' '))
  let t = s
  const steps: string[] = []
  for (const a of p.solution) {
    const mover = a.type === 'move' ? t.pieces.find((q) => q.id === a.pieceId) : undefined
    const lum = a.type === 'move' ? squareLuminance(t, a.to) : undefined
    steps.push(`${actionCode(a)}${mover ? ` [${ROLE_NAMES.solari[mover.role]}]` : ''}${lum !== undefined && t.pieces.some((q) => q.pos.x === (a as any).to.x && q.pos.y === (a as any).to.y) ? ` lum ${lum}` : ''}`)
    t = reduce(t, a)
    if (t.winner) break
    const r = rivalReply(t, p, 'ai') ?? { type: 'pass' as const }
    steps.push(`   rival: ${actionCode(r)}`)
    t = reduce(t, r)
  }
  console.log(steps.join('\n'))
}
