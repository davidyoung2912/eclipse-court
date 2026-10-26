// Bundles a headless script from src/sim with Vite (so it shares the app's TS imports) and runs it.
import { spawnSync } from 'node:child_process'
import { build } from 'vite'

const [name, ...rest] = process.argv.slice(2)
const outDir = `node_modules/.tmp/${name}`
await build({
  configFile: false,
  logLevel: 'warn',
  build: {
    ssr: `src/sim/${name === 'sim' ? 'cli' : name}.ts`,
    outDir,
    emptyOutDir: true,
    minify: false,
    rollupOptions: { output: { entryFileNames: 'main.mjs' } },
  },
})
const r = spawnSync(process.execPath, [`${outDir}/main.mjs`, ...rest], { stdio: 'inherit' })
process.exit(r.status ?? 1)
