// Prints every theme's contrast pairs. Run with: npx vite-node scripts/contrast.ts
import { contrastRatio, pairsOf } from '../src/contrast'
import { THEMES } from '../src/settings'

for (const theme of THEMES) {
  console.log(theme.name)
  for (const p of pairsOf(theme)) {
    const r = contrastRatio(p.fg, p.bg)
    console.log(`  ${r < p.min ? 'FAIL' : 'ok  '} ${r.toFixed(2).padStart(5)}:1 (needs ${p.min})  ${p.name}`)
  }
}
