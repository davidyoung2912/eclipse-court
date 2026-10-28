import { StrictMode, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/nunito/600.css'
import '@fontsource/nunito/700.css'
import './index.css'
import App from './App.tsx'
import { applySettings } from './settings'
import { applyCosmetics } from './cosmetics'

applySettings()
applyCosmetics()

/** The title is set in Nunito; showing it in a fallback face first makes it visibly resize when the font arrives, so wait briefly for it. */
const fontReady = Promise.race([
  Promise.all([document.fonts.load("700 1em Nunito"), document.fonts.load("600 1em Nunito")]),
  new Promise((done) => setTimeout(done, 1500)),
]).catch(() => {})

void fontReady.then(() => createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Suspense fallback={<main className="app"><p className="status">Loading…</p></main>}>
      <App />
    </Suspense>
  </StrictMode>,
))
