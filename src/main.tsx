import { StrictMode, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/nunito/600.css'
import '@fontsource/nunito/700.css'
import '@fontsource/cinzel/600.css'
import '@fontsource/cinzel/700.css'
import './index.css'
import App from './App.tsx'
import { ErrorBoundary } from './ErrorBoundary'
import { applySettings } from './settings'
import { ShardToast } from './ui/ShardToast'
import { applyCosmetics } from './cosmetics'

applySettings()
applyCosmetics()

/** The title is set in Cinzel; showing it in a fallback face first makes it visibly resize when the font arrives, so wait briefly for it. */
const fontReady = Promise.race([
  Promise.all([document.fonts.load("700 1em Nunito"), document.fonts.load("600 1em Nunito"), document.fonts.load("700 1em Cinzel")]),
  new Promise((done) => setTimeout(done, 1500)),
]).catch(() => {})

void fontReady.then(() => createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <Suspense fallback={<main className="app"><p className="status">Loading…</p></main>}>
        <App />
        <ShardToast />
      </Suspense>
    </ErrorBoundary>
  </StrictMode>,
))
