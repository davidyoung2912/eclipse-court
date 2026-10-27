import { StrictMode, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/nunito/600.css'
import '@fontsource/nunito/700.css'
import './index.css'
import App from './App.tsx'
import { applySettings } from './settings'

applySettings()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Suspense fallback={<main className="app"><p className="status">Loading…</p></main>}>
      <App />
    </Suspense>
  </StrictMode>,
)
